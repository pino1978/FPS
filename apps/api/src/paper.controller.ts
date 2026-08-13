import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from './services';

@Controller('v2/paper')
export class PaperTradingController {
  constructor(private db: PrismaService) {}

  @Get('report')
  async report(@Query('bankroll') bankrollRaw = '1000', @Query('persist') persist = 'false') {
    const bankrollInitial = positive(bankrollRaw, 'bankroll');
    const [bets, systems] = await Promise.all([
      this.db.bet.findMany({ where: { simulated: true, played: false }, orderBy: { createdAt: 'asc' } }),
      this.db.bettingSystem.findMany({
        where: { simulated: true, played: false },
        include: { selections: true, combinations: { include: { items: { include: { selection: true } } } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const report = computePaperReport(bankrollInitial, bets, systems);
    if (persist === 'true') {
      await this.db.paperTradingRun.create({ data: {
        bankrollInitial: report.bankrollInitial,
        bankrollFinal: report.bankrollFinal,
        stakeTotal: report.stakeTotal,
        returnsTotal: report.returnsTotal,
        profit: report.profit,
        roi: report.roi,
        yieldValue: report.yield,
        winRate: report.winRate,
        maxDrawdown: report.maxDrawdown,
        betsCount: report.betsCount,
        systemsCount: report.systemsCount,
        parameters: { incompleteEconomicRecords: report.incompleteEconomicRecords, marketPerformance: report.marketPerformance },
      } });
    }
    return report;
  }
}

export function computePaperReport(bankrollInitial: number, bets: any[], systems: any[]) {
  const entries: Array<{at:Date;stake:number;returns:number;win:boolean;kind:'BET'|'SYSTEM'}> = [];
  let incompleteEconomicRecords = 0;
  const marketStates = new Map<string,{sample:number;wins:number;losses:number;voids:number}>();

  for (const bet of bets) {
    if (!['WIN','LOSS','VOID'].includes(bet.status)) continue;
    addMarketState(marketStates, bet.market, bet.status);
    const economic = betEconomics(bet);
    if (!economic) { incompleteEconomicRecords++; continue; }
    entries.push({ at: bet.verifiedAt || bet.createdAt || new Date(), stake: economic.stake, returns: economic.returns, win: bet.status === 'WIN', kind: 'BET' });
  }

  for (const system of systems) {
    for (const selection of system.selections || []) if (['WIN','LOSS','VOID'].includes(selection.status)) addMarketState(marketStates, selection.market, selection.status);
    if (system.verificationStatus !== 'VERIFIED' || !['WIN','LOSS','VOID','PARTIAL'].includes(system.status)) continue;
    const economic = systemEconomics(system);
    if (!economic) { incompleteEconomicRecords++; continue; }
    entries.push({ at: system.playedAt || system.createdAt || new Date(), stake: economic.stake, returns: economic.returns, win: economic.returns > economic.stake, kind: 'SYSTEM' });
  }

  entries.sort((a,b)=>a.at.getTime()-b.at.getTime());
  let bankroll = bankrollInitial, peak = bankrollInitial, maxDrawdown = 0, wins = 0;
  let stakeTotal = 0, returnsTotal = 0;
  for (const entry of entries) {
    stakeTotal += entry.stake; returnsTotal += entry.returns; if (entry.win) wins++;
    bankroll += entry.returns - entry.stake;
    peak = Math.max(peak, bankroll);
    maxDrawdown = Math.max(maxDrawdown, peak - bankroll);
  }
  const profit = returnsTotal - stakeTotal;
  const settled = entries.length;
  return {
    bankrollInitial: round(bankrollInitial),
    bankrollFinal: round(bankroll),
    profit: round(profit),
    stakeTotal: round(stakeTotal),
    returnsTotal: round(returnsTotal),
    roi: bankrollInitial > 0 ? profit / bankrollInitial : null,
    yield: stakeTotal > 0 ? profit / stakeTotal : null,
    maxDrawdown: round(maxDrawdown),
    winRate: settled ? wins / settled : null,
    betsCount: entries.filter(x=>x.kind==='BET').length,
    systemsCount: entries.filter(x=>x.kind==='SYSTEM').length,
    incompleteEconomicRecords,
    marketPerformance: [...marketStates.entries()].map(([market,x])=>({market,...x,winRate:x.sample?x.wins/x.sample:null})).sort((a,b)=>b.sample-a.sample),
  };
}

function betEconomics(bet:any){
  const stake=Number(bet.stake);if(!Number.isFinite(stake)||stake<=0)return null;
  if(bet.status==='LOSS')return {stake,returns:0};
  if(bet.status==='VOID')return {stake,returns:stake};
  const odds=Number(bet.odds);if(bet.status==='WIN'&&Number.isFinite(odds)&&odds>1)return {stake,returns:stake*odds};
  return null;
}
function systemEconomics(system:any){
  const combos=system.combinations||[];if(!combos.length)return null;
  let stake=0,returns=0;
  for(const combo of combos){
    const comboStake=Number(combo.stake);if(!Number.isFinite(comboStake)||comboStake<=0)return null;stake+=comboStake;
    if(combo.status==='LOSS')continue;
    if(combo.status==='VOID'){returns+=comboStake;continue;}
    if(combo.status!=='WIN')return null;
    const odds=(combo.items||[]).map((i:any)=>Number(i.selection?.odds));
    if(!odds.length||odds.some((odd:number)=>!Number.isFinite(odd)||odd<=1))return null;
    returns+=comboStake*odds.reduce((p:number,o:number)=>p*o,1);
  }
  return {stake,returns};
}
function addMarketState(map:Map<string,{sample:number;wins:number;losses:number;voids:number}>,market:string,status:string){const x=map.get(market)||{sample:0,wins:0,losses:0,voids:0};x.sample++;if(status==='WIN')x.wins++;else if(status==='LOSS')x.losses++;else x.voids++;map.set(market,x);}
function positive(value:unknown,field:string){const n=Number(value);if(!Number.isFinite(n)||n<=0)throw new Error(`${field} must be > 0`);return n;}
function round(n:number){return Number(n.toFixed(2));}
