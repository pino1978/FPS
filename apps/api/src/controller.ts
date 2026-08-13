import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { buildSystem, MODEL_VERSION, optimizeSystem, predictFixture, predictMarkets, settlementEligible, Selection } from '@fps/domain';
import { expectedMinutesFor, predictAnytimeScorer } from '@fps/player-engine';
import { FootballProvider, PrismaService } from './services';
import { SettlementService } from './settlement.service';

type SavedSelectionInput = {clientKey:string;fixtureId:string;competition?:string;market:string;selection:string;eventAt:string;odds?:number};
type SavedCombinationInput = {selectionKeys:string[];stake:number};

@Controller()
export class AppController {
  constructor(private football:FootballProvider,private db:PrismaService,private settlement:SettlementService){}

  @Get('health') health(){return {status:'ok',service:'fps-api',time:new Date().toISOString(),modelVersion:MODEL_VERSION}}

  @Get('fixtures') async fixtures(@Query('competition') competition='SA',@Query('date') date?:string){return {source:'football-data.org',data:await this.football.fixtures(competition,date)}}

  @Get('predictions')
  async predictions(@Query('competition') competition='SA',@Query('date') date?:string,@Query('persist') persist='false'){
    const [fixtures,standings]=await Promise.all([this.football.fixtures(competition,date),this.football.standings(competition)]);const map=new Map(standings.map(x=>[x.teamId,x]));
    const data=fixtures.map(fixture=>{const home=map.get(fixture.home.id),away=map.get(fixture.away.id);const markets=home&&away?predictMarkets(home,away):[{market:'MODEL',selection:'NO_BET',probability:0,confidence:0,dataQuality:0,status:'NO_BET' as const,reason:'Statistiche mancanti',fairOdds:null}];return {fixture,markets}});
    if(persist==='true')for(const row of data)await this.db.predictionRun.create({data:{fixtureId:row.fixture.id,modelVersion:MODEL_VERSION,source:'football-data.org',eventAt:new Date(row.fixture.utcDate),snapshots:{create:row.markets.map(m=>({market:m.market,selection:m.selection,probability:m.probability,confidence:m.confidence,dataQuality:m.dataQuality,fairOdds:m.fairOdds,valueStatus:'UNAVAILABLE',status:m.status}))}}});
    return {source:'football-data.org',modelVersion:MODEL_VERSION,data};
  }

  @Get('player-markets')
  async playerMarkets(@Query('fixtureId') fixtureId:string,@Query('competition') competition='SA'){
    if(!fixtureId)throw new Error('fixtureId required');
    const [details,standings,scorers]=await Promise.all([this.football.matchDetails(fixtureId),this.football.standings(competition),this.football.scorers(competition,80)]);
    const homeId=String(details.homeTeam?.id),awayId=String(details.awayTeam?.id),homeName=details.homeTeam?.name||'',awayName=details.awayTeam?.name||'',utcDate=details.utcDate;
    const enrichment=await this.football.enrichment(utcDate,homeName,awayName);const standingsMap=new Map(standings.map(x=>[x.teamId,x]));const home=standingsMap.get(homeId),away=standingsMap.get(awayId);
    if(!home||!away)return {source:'UNAVAILABLE',reason:'Statistiche squadra mancanti',data:[]};
    const teamPrediction=predictFixture(home,away);
    const fdHomeStarters=personNames(details.homeTeam?.lineup),fdAwayStarters=personNames(details.awayTeam?.lineup),fdHomeBench=personNames(details.homeTeam?.bench),fdAwayBench=personNames(details.awayTeam?.bench);
    const homeStarters=enrichment.homeStarters.length?enrichment.homeStarters:fdHomeStarters,awayStarters=enrichment.awayStarters.length?enrichment.awayStarters:fdAwayStarters,homeBench=enrichment.homeBench.length?enrichment.homeBench:fdHomeBench,awayBench=enrichment.awayBench.length?enrichment.awayBench:fdAwayBench;
    const candidates=scorers.filter(s=>s.teamId===homeId||s.teamId===awayId).slice(0,16).map(s=>{
      const isHome=s.teamId===homeId,team=isHome?home:away,opp=isHome?away:home,starters=isHome?homeStarters:awayStarters,bench=isHome?homeBench:awayBench;
      const injured=enrichment.injuries.some(i=>samePerson(i.playerName,s.playerName));
      const starterStatus=injured?'OUT':starters.some(n=>samePerson(n,s.playerName))?'CONFIRMED':bench.some(n=>samePerson(n,s.playerName))?'BENCH':'UNKNOWN';
      const expectedMinutes=expectedMinutesFor(starterStatus);
      return predictAnytimeScorer({playerId:s.playerId,playerName:s.playerName,goals:s.goals,assists:s.assists,penalties:s.penalties,teamGoals:team.goalsFor,teamPlayed:team.played,teamGoalsFor:team.goalsFor,opponentGoalsAgainst:opp.goalsAgainst,opponentPlayed:opp.played,starterStatus,availabilityVerified:enrichment.availabilityVerified,role:s.position,expectedMinutes,teamExpectedGoals:isHome?teamPrediction.expectedGoalsHome:teamPrediction.expectedGoalsAway});
    }).sort((a,b)=>b.probability-a.probability);
    return {source:{scorers:'football-data.org',availability:enrichment.source},fixtureId,modelVersion:candidates[0]?.modelVersion??'scorer-impact-v2',availabilityVerified:enrichment.availabilityVerified,teamExpectedGoals:{home:teamPrediction.expectedGoalsHome,away:teamPrediction.expectedGoalsAway},data:candidates};
  }

  @Post('systems/build') systems(@Body() body:{selections:Selection[];k:number;stake:number;budget?:number}){const result=buildSystem(body.selections,body.k,body.stake);return {...result,budget:body.budget??null,withinBudget:body.budget==null||result.cost<=body.budget,stake:body.stake}}
  @Post('systems/optimize') optimize(@Body() body:{selections:Selection[];budget:number;profile?:'PRUDENT'|'BALANCED'|'AGGRESSIVE'}){return optimizeSystem(body.selections,body.budget,body.profile||'BALANCED')}

  @Post('systems/save')
  async saveSystem(@Body() body:{mode:string;profile?:string;budget:number;totalCost:number;played:boolean;selections:SavedSelectionInput[];combinations:SavedCombinationInput[]}){
    return this.db.$transaction(async tx=>{
      const system=await tx.bettingSystem.create({data:{mode:body.mode,profile:body.profile,budget:body.budget,totalCost:body.totalCost,played:body.played}});
      const selectionIdByKey=new Map<string,string>();
      const originSnapshotIds:string[]=[];
      for(const selection of body.selections){
        const eventAt=new Date(selection.eventAt);
        const origin=await tx.predictionSnapshot.findFirst({where:{market:selection.market,selection:selection.selection,run:{fixtureId:selection.fixtureId,asOf:{lt:eventAt}}},include:{run:true},orderBy:{createdAt:'desc'}});
        const fixture=selection.competition?null:await tx.fixture.findUnique({where:{id:selection.fixtureId},select:{competition:true}});
        const saved=await tx.systemSelection.create({data:{
          systemId:system.id,clientKey:selection.clientKey,fixtureId:selection.fixtureId,competition:selection.competition??fixture?.competition,
          market:selection.market,selection:selection.selection,eventAt,odds:selection.odds,
          ...(origin?{originProbability:origin.probability,originConfidence:origin.confidence,originDataQuality:origin.dataQuality,originFairOdds:origin.fairOdds,originModelVersion:origin.run.modelVersion,originCapturedAt:origin.createdAt}:{}),
        }});
        if(origin)originSnapshotIds.push(origin.id);
        selectionIdByKey.set(selection.clientKey,saved.id);
      }
      for(const combination of body.combinations){const ids=combination.selectionKeys.map(key=>selectionIdByKey.get(key));if(ids.some(id=>!id))throw new Error('Combination contains unknown selection');await tx.systemCombination.create({data:{systemId:system.id,stake:combination.stake,items:{create:ids.map(selectionId=>({selectionId:selectionId!}))}}})}
      await tx.auditEvent.create({data:{entityType:'BettingSystem',entityId:system.id,action:body.played?'REAL_SYSTEM_RECORDED':'SYSTEM_SAVED',payload:{combinationCount:body.combinations.length,totalCost:body.totalCost,originSnapshotIds}}});
      return tx.bettingSystem.findUniqueOrThrow({where:{id:system.id},include:{selections:true,combinations:{include:{items:true}}}})
    });
  }

  @Get('systems') async savedSystems(){return this.db.bettingSystem.findMany({include:{selections:true,combinations:{include:{items:true}}},orderBy:{createdAt:'desc'}})}
  @Post('bets') async createBet(@Body() body:{fixtureId:string;market:string;selection:string;stake:number;odds?:number;played:boolean;eventAt:string}){
    const eventAt=new Date(body.eventAt);const origin=await this.db.predictionSnapshot.findFirst({where:{market:body.market,selection:body.selection,run:{fixtureId:body.fixtureId,asOf:{lt:eventAt}}},include:{run:true},orderBy:{createdAt:'desc'}});
    const bet=await this.db.bet.create({data:{...body,eventAt,...(origin?{originProbability:origin.probability,originConfidence:origin.confidence,originDataQuality:origin.dataQuality,originFairOdds:origin.fairOdds,originModelVersion:origin.run.modelVersion,originCapturedAt:origin.createdAt}:{})}});await this.db.auditEvent.create({data:{entityType:'Bet',entityId:bet.id,action:body.played?'REAL_BET_RECORDED':'PREDICTION_SAVED',payload:{originSnapshotId:origin?.id??null}}});return bet
  }
  @Get('bets') async bets(@Query('played') played?:string){return this.db.bet.findMany({where:played===undefined?{}:{played:played==='true'},orderBy:{createdAt:'desc'}})}

  @Get('metrics')
  async metrics(){const snapshots=await this.db.predictionSnapshot.findMany({where:{outcome:{in:['WIN','LOSS']}}});const brier=snapshots.length?snapshots.reduce((sum,p)=>sum+Math.pow(p.probability-(p.outcome==='WIN'?1:0),2),0)/snapshots.length:null;const hit=snapshots.length?snapshots.filter(p=>p.outcome==='WIN').length/snapshots.length:null;const realBets=await this.db.bet.findMany({where:{played:true,status:{in:['WIN','LOSS']}}});const stake=realBets.reduce((sum,bet)=>sum+bet.stake,0),returns=realBets.reduce((sum,bet)=>sum+(bet.status==='WIN'?bet.stake*(bet.odds??1):0),0);const systems=await this.db.bettingSystem.groupBy({by:['status'],where:{played:true},_count:{_all:true}});return {modelPerformance:{sample:snapshots.length,brierScore:brier,hitRate:hit},bettingPerformance:{sample:realBets.length,stake,returns,profit:returns-stake,roi:stake?(returns-stake)/stake:null},systemPerformance:systems}}

  @Post('settlement/eligible') async eligible(){const pending=await this.db.bet.findMany({where:{played:true,status:'PENDING'}});return pending.filter(bet=>settlementEligible(bet.eventAt,!!bet.verifiedAt)).map(bet=>({id:bet.id,fixtureId:bet.fixtureId,eventAt:bet.eventAt}))}
  @Post('settlement/run') async settle(){return this.settlement.run()}
}

function personNames(list:any[]|undefined){return (list||[]).map((x:any)=>x.name||x.player?.name).filter(Boolean)}
function normalizePerson(value:string){return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}
function samePerson(a:string,b:string){const x=normalizePerson(a),y=normalizePerson(b);return !!x&&!!y&&(x===y||x.includes(y)||y.includes(x))}
