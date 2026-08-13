import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from './services';

type PredictionMetricRow = {
  market:string;
  probability:number;
  confidence:number;
  outcome:'WIN'|'LOSS';
  modelVersion:string;
  competition:string;
  capturedAt:Date;
};
type BetMetricRow = {
  market:string;
  competition:string;
  bookmaker:string;
  stake:number;
  odds:number|null;
  status:string;
  playedAt:Date|null;
};

@Injectable()
export class AnalyticsService {
  constructor(private db: PrismaService) {}

  async runBacktest(input: { competition: string; season?: string; modelVersion: string; from: Date; to: Date }) {
    const fixtures = await this.db.fixture.findMany({
      where: { competition: input.competition, utcDate: { gte: input.from, lte: input.to } },
      select: { id: true },
    });
    const fixtureIds = fixtures.map((x) => x.id);
    const runs = await this.db.predictionRun.findMany({
      where: {
        fixtureId: { in: fixtureIds },
        modelVersion: input.modelVersion,
        eventAt: { gte: input.from, lte: input.to },
      },
      include: { snapshots: { include: { settlement: true } } },
      orderBy: { asOf: 'asc' },
    });

    const eligible = runs.filter((run) => run.asOf.getTime() < run.eventAt.getTime() && run.inputSnapshot != null);
    const settled = eligible.flatMap((run) => run.snapshots
      .filter((s) => s.settlement?.outcome === 'WIN' || s.settlement?.outcome === 'LOSS')
      .map((s) => ({...s, runModelVersion:run.modelVersion, runAsOf:run.asOf})));
    const rows:PredictionMetricRow[] = settled.map((s) => ({
      market:s.market,probability:s.probability,confidence:s.confidence,
      outcome:s.settlement!.outcome as 'WIN'|'LOSS',modelVersion:s.runModelVersion,
      competition:input.competition,capturedAt:s.createdAt,
    }));
    const summary=summarizePredictions(rows);
    const calibration=calibrationBuckets(rows);
    const calibrationError=expectedCalibrationError(calibration,rows.length);
    const virtualRows=settled.filter((s)=>s.status==='ACTIVE'&&s.offeredOdds!=null).map((s)=>({
      market:s.market,competition:input.competition,bookmaker:'HISTORICAL_ODDS',stake:1,
      odds:s.offeredOdds,status:s.settlement!.outcome,playedAt:s.createdAt,
    } satisfies BetMetricRow));
    const virtualBetting=summarizeBets(virtualRows);
    const season=input.season?.trim()||deriveSeason(input.from,input.to);
    const snapshotIds=settled.map((s)=>s.id).sort();
    const inputFingerprint=createHash('sha256').update(JSON.stringify(settled.map((s)=>[
      s.id,s.market,s.selection,s.probability,s.confidence,s.dataQuality,s.offeredOdds,s.settlement?.outcome,s.runModelVersion,s.runAsOf.toISOString(),
    ]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))))).digest('hex');

    const prior=await this.db.backtestRun.findMany({
      where:{competition:input.competition,modelVersion:input.modelVersion,fromDate:input.from,toDate:input.to},
      orderBy:{createdAt:'desc'},take:20,
    });
    const reusable=prior.find((run)=>{
      const p=run.parameters as any;
      return p?.season===season&&p?.inputFingerprint===inputFingerprint;
    });
    if(reusable)return {...reusable,reused:true};

    return this.db.backtestRun.create({
      data: {
        competition: input.competition,
        modelVersion: input.modelVersion,
        fromDate: input.from,
        toDate: input.to,
        sample: rows.length,
        brierScore: summary.brierScore,
        hitRate: summary.hitRate,
        parameters: {
          season,
          methodology: 'walk-forward-immutable-prediction-replay',
          antiLeakage: 'asOf < eventAt AND inputSnapshot != null',
          eligiblePredictionRuns: eligible.length,
          snapshotIds,
          inputFingerprint,
          logLoss:summary.logLoss,
          calibration,
          calibrationError,
          byMarket:groupPredictionMetrics(rows,(x)=>x.market),
          byConfidence:groupPredictionMetrics(rows,(x)=>confidenceBand(x.confidence)),
          byPeriod:groupPredictionMetrics(rows,(x)=>monthKey(x.capturedAt)),
          virtualBetting:{...virtualBetting,coverage:rows.length?virtualRows.length/rows.length:null,rule:'flat stake = 1 only when historical offeredOdds exists'},
        },
      },
    });
  }

  async listBacktests() {
    return this.db.backtestRun.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async runPaperTrading(input: { bankrollInitial: number }) {
    const bets = await this.db.bet.findMany({
      where: { simulated: true, played: false, verificationStatus: 'VERIFIED', status: { in: ['WIN', 'LOSS', 'VOID'] } },
      orderBy: { createdAt: 'asc' },
    });
    const systemsCount = await this.db.bettingSystem.count({ where: { simulated: true, played: false } });
    const stakeTotal = bets.reduce((sum, bet) => sum + bet.stake, 0);
    const returnsTotal = bets.reduce((sum, bet) => sum + betReturn(bet), 0);
    const profit = returnsTotal - stakeTotal;
    const bankrollFinal = input.bankrollInitial + profit;
    const roi = stakeTotal ? profit / stakeTotal : null;
    const decided = bets.filter((bet) => bet.status === 'WIN' || bet.status === 'LOSS');
    const winRate = decided.length ? decided.filter((bet) => bet.status === 'WIN').length / decided.length : null;

    let bankroll = input.bankrollInitial;
    let peak = bankroll;
    let maxDrawdown = 0;
    for (const bet of bets) {
      bankroll -= bet.stake;
      bankroll += betReturn(bet);
      peak = Math.max(peak, bankroll);
      if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - bankroll) / peak);
    }
    const byMarket = groupBetMetrics(bets.map((bet) => ({
      market:bet.market, competition:bet.competition ?? 'UNKNOWN', bookmaker:bet.bookmaker ?? 'UNKNOWN', stake:bet.stake,
      odds:bet.odds, status:bet.status, playedAt:bet.playedAt,
    })), (x) => x.market);

    return this.db.paperTradingRun.create({
      data: {
        bankrollInitial: input.bankrollInitial,
        bankrollFinal,
        stakeTotal,
        returnsTotal,
        profit,
        roi,
        yieldValue: roi,
        winRate,
        maxDrawdown,
        betsCount: bets.length,
        systemsCount,
        parameters: { source: 'SIMULATED_ONLY', settlementEngine: 'shared', voidPolicy: 'stake-returned', byMarket },
      },
    });
  }

  async listPaperTrading() {
    return this.db.paperTradingRun.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async performance() {
    const snapshots = await this.db.predictionSnapshot.findMany({
      where: { settlement: { is: { outcome: { in: ['WIN', 'LOSS'] } } } },
      include: { settlement: true, run: true },
    });
    const fixtureIds = [...new Set(snapshots.map((s) => s.run.fixtureId))];
    const fixtures = fixtureIds.length ? await this.db.fixture.findMany({ where: { id: { in: fixtureIds } }, select: { id:true, competition:true } }) : [];
    const competitionByFixture = new Map(fixtures.map((x) => [x.id, x.competition]));
    const predictionRows:PredictionMetricRow[] = snapshots.map((s) => ({
      market:s.market,
      probability:s.probability,
      confidence:s.confidence,
      outcome:s.settlement!.outcome as 'WIN'|'LOSS',
      modelVersion:s.run.modelVersion,
      competition:competitionByFixture.get(s.run.fixtureId) ?? 'UNKNOWN',
      capturedAt:s.createdAt,
    }));
    const modelPerformance = summarizePredictions(predictionRows);
    const calibration = calibrationBuckets(predictionRows);

    const real = await this.db.bet.findMany({
      where: { played: true, simulated: false, verificationStatus: 'VERIFIED', status: { in: ['WIN', 'LOSS', 'VOID'] } },
      orderBy: { playedAt: 'asc' },
    });
    const betRows:BetMetricRow[] = real.map((bet) => ({
      market:bet.market,
      competition:bet.competition ?? 'UNKNOWN',
      bookmaker:bet.bookmaker ?? 'UNKNOWN',
      stake:bet.stake,
      odds:bet.odds,
      status:bet.status,
      playedAt:bet.playedAt,
    }));
    const singles = summarizeBets(betRows);

    const systems = await this.db.bettingSystem.findMany({
      where: { played:true, simulated:false, verificationStatus:'VERIFIED' },
      include: { selections:true, combinations:{ include:{ items:{ include:{ selection:true } } } } },
      orderBy: { playedAt:'asc' },
    });
    const systemSummary = summarizeSystems(systems);

    return {
      modelPerformance: {
        ...modelPerformance,
        calibration,
        calibrationError:expectedCalibrationError(calibration,predictionRows.length),
        byMarket: groupPredictionMetrics(predictionRows, (x) => x.market),
        byCompetition: groupPredictionMetrics(predictionRows, (x) => x.competition),
        byConfidence: groupPredictionMetrics(predictionRows, (x) => confidenceBand(x.confidence)),
        byModelVersion: groupPredictionMetrics(predictionRows, (x) => x.modelVersion),
        byPeriod: groupPredictionMetrics(predictionRows, (x) => monthKey(x.capturedAt)),
      },
      bettingPerformance: {
        ...singles,
        scope:'PLAYED_ONLY',
        byMarket: groupBetMetrics(betRows, (x) => x.market),
        byCompetition: groupBetMetrics(betRows, (x) => x.competition),
        byBookmaker: groupBetMetrics(betRows, (x) => x.bookmaker),
        byPeriod: groupBetMetrics(betRows, (x) => monthKey(x.playedAt)),
        systemsVsSingles: { singles, systems:systemSummary },
      },
    };
  }
}

export function binaryLogLoss(probability:number, won:boolean){
  const p=Math.max(1e-12,Math.min(1-1e-12,probability));
  return -(won?Math.log(p):Math.log(1-p));
}

export function summarizePredictions(rows:PredictionMetricRow[]){
  if(!rows.length)return {sample:0,brierScore:null,logLoss:null,hitRate:null};
  const brierScore=rows.reduce((sum,row)=>sum+Math.pow(row.probability-(row.outcome==='WIN'?1:0),2),0)/rows.length;
  const logLoss=rows.reduce((sum,row)=>sum+binaryLogLoss(row.probability,row.outcome==='WIN'),0)/rows.length;
  const hitRate=rows.filter((row)=>row.outcome==='WIN').length/rows.length;
  return {sample:rows.length,brierScore,logLoss,hitRate};
}

export function summarizeBets(rows:BetMetricRow[]){
  const stake=rows.reduce((sum,row)=>sum+row.stake,0);
  const returns=rows.reduce((sum,row)=>sum+betReturn(row),0);
  const profit=returns-stake;
  const decided=rows.filter((row)=>row.status==='WIN'||row.status==='LOSS');
  const oddsRows=rows.filter((row)=>row.odds!=null);
  let pnl=0,peak=0,maxDrawdown=0;
  for(const row of rows){pnl-=row.stake;pnl+=betReturn(row);peak=Math.max(peak,pnl);maxDrawdown=Math.max(maxDrawdown,peak-pnl)}
  return {
    sample:rows.length,stake,returns,profit,roi:stake?profit/stake:null,yield:stake?profit/stake:null,
    winRate:decided.length?decided.filter((row)=>row.status==='WIN').length/decided.length:null,
    averageOdds:oddsRows.length?oddsRows.reduce((sum,row)=>sum+(row.odds??0),0)/oddsRows.length:null,maxDrawdown,
  };
}

function calibrationBuckets(rows:PredictionMetricRow[]){
  return Array.from({length:10},(_,index)=>{
    const min=index/10,max=(index+1)/10;
    const bucket=rows.filter((s)=>s.probability>=min&&(index===9?s.probability<=max:s.probability<max));
    return {range:`${Math.round(min*100)}-${Math.round(max*100)}%`,sample:bucket.length,predicted:bucket.length?bucket.reduce((sum,s)=>sum+s.probability,0)/bucket.length:null,observed:bucket.length?bucket.filter((s)=>s.outcome==='WIN').length/bucket.length:null};
  });
}
function expectedCalibrationError(buckets:Array<{sample:number;predicted:number|null;observed:number|null}>,sample:number){
  if(!sample)return null;
  return buckets.reduce((sum,b)=>sum+(b.sample/sample)*Math.abs((b.predicted??0)-(b.observed??0)),0);
}
function groupPredictionMetrics(rows:PredictionMetricRow[],key:(row:PredictionMetricRow)=>string){
  const groups=new Map<string,PredictionMetricRow[]>();
  for(const row of rows){const k=key(row);groups.set(k,[...(groups.get(k)??[]),row])}
  return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([group,items])=>({group,...summarizePredictions(items)}));
}
function groupBetMetrics(rows:BetMetricRow[],key:(row:BetMetricRow)=>string){
  const groups=new Map<string,BetMetricRow[]>();
  for(const row of rows){const k=key(row);groups.set(k,[...(groups.get(k)??[]),row])}
  return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([group,items])=>({group,...summarizeBets(items)}));
}
function summarizeSystems(systems:any[]){
  let stake=0,returns=0,financiallySettled=0,wins=0,losses=0,voids=0;
  for(const system of systems)for(const combo of system.combinations??[]){
    stake+=Number(combo.stake||0);
    if(combo.status==='WIN'){
      const odds=(combo.items??[]).map((item:any)=>item.selection?.odds).filter((x:any)=>x!=null);
      if(odds.length===(combo.items??[]).length){returns+=Number(combo.stake||0)*odds.reduce((product:number,x:number)=>product*Number(x),1);financiallySettled++;}
      wins++;
    }else if(combo.status==='LOSS'){losses++;financiallySettled++;}
    else if(combo.status==='VOID'){returns+=Number(combo.stake||0);voids++;financiallySettled++;}
  }
  const profit=returns-stake;const decided=wins+losses;
  return {systems:systems.length,combinations:wins+losses+voids,financiallySettled,stake,returns,profit,roi:stake?profit/stake:null,yield:stake?profit/stake:null,winRate:decided?wins/decided:null};
}
function betReturn(row:{status:string;stake:number;odds:number|null}){return row.status==='WIN'?row.stake*(row.odds??1):row.status==='VOID'?row.stake:0}
function confidenceBand(value:number){const start=Math.min(90,Math.floor(Math.max(0,value)*10)*10);return `${start}-${start+10}%`}
function monthKey(value:Date|null){return value?value.toISOString().slice(0,7):'UNKNOWN'}
function deriveSeason(from:Date,to:Date){return from.getUTCFullYear()===to.getUTCFullYear()?String(from.getUTCFullYear()):`${from.getUTCFullYear()}-${to.getUTCFullYear()}`}
