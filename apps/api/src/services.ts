import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { parseForm, type VenueMetrics } from '@fps/domain';

export type Fixture={id:string;utcDate:string;status:string;home:{id:string;name:string};away:{id:string;name:string}};
export type Standing={teamId:string;played:number;points:number;goalsFor:number;goalsAgainst:number;formIndex?:number;home?:VenueMetrics;away?:VenueMetrics};
export type MatchResult={id:string;status:string;home:number|null;away:number|null;lastUpdated?:string;scorers:string[]};
export type Scorer={playerId:string;playerName:string;teamId:string;teamName:string;goals:number;assists:number;penalties:number;position?:string};
export type PlayerAvailability={playerName:string;teamName:string;type?:string;reason?:string};
export type Enrichment={source:'API_FOOTBALL'|'UNAVAILABLE';providerFixtureId?:string;homeStarters:string[];awayStarters:string[];homeBench:string[];awayBench:string[];injuries:PlayerAvailability[];availabilityVerified:boolean};
export type OfferedOdd={bookmaker:string;market:string;selection:string;odds:number;updatedAt?:string};

type CacheEntry={expiresAt:number;value:any};
type CircuitState={failures:number;openedUntil:number};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy(){await this.$disconnect();}
}

@Injectable()
export class FootballProvider {
  private fd=process.env.FOOTBALL_DATA_BASE_URL||'https://api.football-data.org/v4';
  private af=process.env.API_FOOTBALL_BASE_URL||'https://v3.football.api-sports.io';
  private cache=new Map<string,CacheEntry>();
  private circuits=new Map<string,CircuitState>();

  private async cached(key:string,ttlMs:number,loader:()=>Promise<any>){const now=Date.now(),hit=this.cache.get(key);if(hit&&hit.expiresAt>now)return hit.value;const value=await loader();this.cache.set(key,{expiresAt:now+ttlMs,value});return value;}

  private async requestJson(provider:string,url:string,headers:Record<string,string>){
    const now=Date.now();const state=this.circuits.get(provider)||{failures:0,openedUntil:0};
    if(state.openedUntil>now)throw new Error(`${provider} circuit open`);
    let lastError:unknown;
    for(let attempt=0;attempt<3;attempt++){
      let response:Response;
      try{response=await fetch(url,{headers});}
      catch(error){lastError=error;if(attempt<2){await sleep(250*Math.pow(2,attempt));continue;}break;}
      if(response.ok){this.circuits.set(provider,{failures:0,openedUntil:0});return response.json() as Promise<any>;}
      const error=new Error(`${provider} ${response.status}`);
      const retryable=response.status===429||response.status>=500;
      if(!retryable)throw error;
      lastError=error;
      if(attempt<2)await sleep(250*Math.pow(2,attempt));
    }
    const failures=state.failures+1;this.circuits.set(provider,{failures,openedUntil:failures>=5?Date.now()+60_000:0});
    throw lastError instanceof Error?lastError:new Error(`${provider} request failed`);
  }

  async footballData(path:string,headers:Record<string,string>={},ttlMs=5*60_000){
    const token=process.env.FOOTBALL_DATA_TOKEN;if(!token)throw new Error('FOOTBALL_DATA_TOKEN missing');
    return this.cached(`fd:${path}:${JSON.stringify(headers)}`,ttlMs,()=>this.requestJson('football-data',this.fd+path,{'X-Auth-Token':token,...headers}));
  }

  async apiFootball(path:string,ttlMs=5*60_000){
    const key=process.env.API_FOOTBALL_KEY;if(!key)throw new Error('API_FOOTBALL_KEY missing');
    return this.cached(`af:${path}`,ttlMs,()=>this.requestJson('api-football',this.af+path,{'x-apisports-key':key}));
  }

  async fixtures(competition='SA',date?:string):Promise<Fixture[]>{const q=new URLSearchParams();if(date){q.set('dateFrom',date);q.set('dateTo',date)}const d=await this.footballData(`/competitions/${competition}/matches?${q}`,{},5*60_000);return (d.matches||[]).map((m:any)=>({id:String(m.id),utcDate:m.utcDate,status:m.status,home:{id:String(m.homeTeam.id),name:m.homeTeam.name},away:{id:String(m.awayTeam.id),name:m.awayTeam.name}}));}

  async standings(competition='SA'):Promise<Standing[]>{
    const d=await this.footballData(`/competitions/${competition}/standings`,{},15*60_000);
    const standings=d.standings||[];
    const total=tableByType(standings,'TOTAL'),home=tableByType(standings,'HOME'),away=tableByType(standings,'AWAY');
    return [...total.values()].map((r:any)=>({
      teamId:String(r.team.id),played:r.playedGames,points:r.points,goalsFor:r.goalsFor,goalsAgainst:r.goalsAgainst,formIndex:parseForm(r.form),
      home:venueMetrics(home.get(String(r.team.id))),away:venueMetrics(away.get(String(r.team.id))),
    }));
  }

  async scorers(competition='SA',limit=50):Promise<Scorer[]>{const d=await this.footballData(`/competitions/${competition}/scorers?limit=${limit}`,{},30*60_000);return (d.scorers||[]).map((s:any)=>({playerId:String(s.player.id),playerName:s.player.name,teamId:String(s.team.id),teamName:s.team.name,goals:Number(s.goals||0),assists:Number(s.assists||0),penalties:Number(s.penalties||0),position:s.player?.position||undefined}));}

  async matchDetails(matchId:string){return this.footballData(`/matches/${encodeURIComponent(matchId)}`,{'X-Unfold-Lineups':'true','X-Unfold-Goals':'true'},60_000);}

  async enrichment(utcDate:string,homeName:string,awayName:string):Promise<Enrichment>{
    if(!process.env.API_FOOTBALL_KEY)return unavailableEnrichment();
    try{
      const date=utcDate.slice(0,10);const fixtures=await this.apiFootball(`/fixtures?date=${date}&timezone=UTC`,5*60_000);const target=(fixtures.response||[]).find((x:any)=>sameTeam(x.teams?.home?.name,homeName)&&sameTeam(x.teams?.away?.name,awayName));
      if(!target)return unavailableEnrichment();
      const providerFixtureId=String(target.fixture.id);const [lineupResult,injuryResult]=await Promise.allSettled([this.apiFootball(`/fixtures/lineups?fixture=${providerFixtureId}`,2*60_000),this.apiFootball(`/injuries?fixture=${providerFixtureId}`,5*60_000)]);
      const lineups=lineupResult.status==='fulfilled'?(lineupResult.value.response||[]):[];const injuries=injuryResult.status==='fulfilled'?(injuryResult.value.response||[]):[];
      const homeLine=lineups.find((l:any)=>sameTeam(l.team?.name,homeName));const awayLine=lineups.find((l:any)=>sameTeam(l.team?.name,awayName));
      return {source:'API_FOOTBALL',providerFixtureId,homeStarters:names(homeLine?.startXI),awayStarters:names(awayLine?.startXI),homeBench:names(homeLine?.substitutes),awayBench:names(awayLine?.substitutes),injuries:injuries.map((i:any)=>({playerName:i.player?.name||'',teamName:i.team?.name||'',type:i.player?.type,reason:i.player?.reason})).filter((i:PlayerAvailability)=>!!i.playerName),availabilityVerified:injuryResult.status==='fulfilled'};
    }catch{return unavailableEnrichment();}
  }

  async odds(providerFixtureId:string):Promise<OfferedOdd[]>{
    if(!process.env.API_FOOTBALL_KEY)return [];
    try{
      const data=await this.apiFootball(`/odds?fixture=${encodeURIComponent(providerFixtureId)}`,3*60*60_000);
      const rows:OfferedOdd[]=[];
      for(const fixture of data.response||[])for(const bookmaker of fixture.bookmakers||[])for(const bet of bookmaker.bets||[])for(const value of bet.values||[]){
        const mapped=mapOdd(bet.name,value.value);const odds=Number(value.odd);
        if(mapped&&Number.isFinite(odds)&&odds>1)rows.push({bookmaker:bookmaker.name||String(bookmaker.id),market:mapped.market,selection:mapped.selection,odds,updatedAt:fixture.update});
      }
      return rows;
    }catch{return [];}
  }

  async result(matchId:string):Promise<MatchResult>{
    const m=await this.footballData(`/matches/${encodeURIComponent(matchId)}`,{'X-Unfold-Goals':'true'},60_000);
    const scorers=(m.goals||[]).map((g:any)=>g.scorer?.name||g.player?.name).filter(Boolean);
    return {id:String(m.id),status:m.status,home:m.score?.fullTime?.home??null,away:m.score?.fullTime?.away??null,lastUpdated:m.lastUpdated,scorers};
  }
}

function unavailableEnrichment():Enrichment{return {source:'UNAVAILABLE',homeStarters:[],awayStarters:[],homeBench:[],awayBench:[],injuries:[],availabilityVerified:false};}
function tableByType(standings:any[],type:string){return new Map<string,any>(((standings.find((x:any)=>x.type===type)?.table)||[]).map((r:any)=>[String(r.team.id),r]));}
function venueMetrics(r:any):VenueMetrics|undefined{return r?{played:Number(r.playedGames||0),points:Number(r.points||0),goalsFor:Number(r.goalsFor||0),goalsAgainst:Number(r.goalsAgainst||0)}:undefined;}
function sleep(ms:number){return new Promise(resolve=>setTimeout(resolve,ms));}
function mapOdd(name:string|undefined,value:string|undefined){const n=(name||'').toLowerCase(),v=(value||'').trim();if(n.includes('match winner')){if(/^home$/i.test(v))return {market:'1X2',selection:'1'};if(/^draw$/i.test(v))return {market:'1X2',selection:'X'};if(/^away$/i.test(v))return {market:'1X2',selection:'2'};}if(n.includes('goals over/under')&&!n.includes('half')){const m=v.match(/(Over|Under)\s*(\d+(?:\.\d+)?)/i);if(m)return {market:`OVER_UNDER_${m[2].replace('.','_')}`,selection:`${m[1].toUpperCase()} ${m[2]}`};}if(n.includes('both teams')||n.includes('both team')){if(/^yes$/i.test(v))return {market:'BTTS',selection:'GOAL'};if(/^no$/i.test(v))return {market:'BTTS',selection:'NO GOAL'};}return null;}
function names(list:any[]|undefined){return (list||[]).map((x:any)=>x.player?.name).filter(Boolean);}
function normalize(value:string|undefined){return (value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(fc|ac|ssc|ss|calcio|club)\b/g,'').replace(/[^a-z0-9]/g,'');}
function sameTeam(a:string|undefined,b:string|undefined){const x=normalize(a),y=normalize(b);return !!x&&!!y&&(x===y||x.includes(y)||y.includes(x));}
