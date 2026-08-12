import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { parseForm } from '@fps/domain';

export type Fixture={id:string;utcDate:string;status:string;home:{id:string;name:string};away:{id:string;name:string}};
export type Standing={teamId:string;played:number;points:number;goalsFor:number;goalsAgainst:number;formIndex?:number};
export type MatchResult={id:string;status:string;home:number|null;away:number|null;lastUpdated?:string};
export type Scorer={playerId:string;playerName:string;teamId:string;teamName:string;goals:number;assists:number;penalties:number};

type CacheEntry={expiresAt:number;value:any};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy(){await this.$disconnect();}
}

@Injectable()
export class FootballProvider {
  private fd=process.env.FOOTBALL_DATA_BASE_URL||'https://api.football-data.org/v4';
  private af=process.env.API_FOOTBALL_BASE_URL||'https://v3.football.api-sports.io';
  private cache=new Map<string,CacheEntry>();

  private async cached(key:string,ttlMs:number,loader:()=>Promise<any>){const now=Date.now(),hit=this.cache.get(key);if(hit&&hit.expiresAt>now)return hit.value;const value=await loader();this.cache.set(key,{expiresAt:now+ttlMs,value});return value;}

  async footballData(path:string,headers:Record<string,string>={},ttlMs=5*60_000){
    const token=process.env.FOOTBALL_DATA_TOKEN;if(!token)throw new Error('FOOTBALL_DATA_TOKEN missing');
    return this.cached(`fd:${path}:${JSON.stringify(headers)}`,ttlMs,async()=>{const r=await fetch(this.fd+path,{headers:{'X-Auth-Token':token,...headers}});if(!r.ok)throw new Error('football-data '+r.status);return r.json() as Promise<any>;});
  }

  async apiFootball(path:string,ttlMs=5*60_000){
    const key=process.env.API_FOOTBALL_KEY;if(!key)throw new Error('API_FOOTBALL_KEY missing');
    return this.cached(`af:${path}`,ttlMs,async()=>{const r=await fetch(this.af+path,{headers:{'x-apisports-key':key}});if(!r.ok)throw new Error('api-football '+r.status);return r.json() as Promise<any>;});
  }

  async fixtures(competition='SA',date?:string):Promise<Fixture[]>{const q=new URLSearchParams();if(date){q.set('dateFrom',date);q.set('dateTo',date)}const d=await this.footballData(`/competitions/${competition}/matches?${q}`,{},5*60_000);return (d.matches||[]).map((m:any)=>({id:String(m.id),utcDate:m.utcDate,status:m.status,home:{id:String(m.homeTeam.id),name:m.homeTeam.name},away:{id:String(m.awayTeam.id),name:m.awayTeam.name}}));}

  async standings(competition='SA'):Promise<Standing[]>{const d=await this.footballData(`/competitions/${competition}/standings`,{},15*60_000);const total=(d.standings||[]).find((x:any)=>x.type==='TOTAL')?.table||[];return total.map((r:any)=>({teamId:String(r.team.id),played:r.playedGames,points:r.points,goalsFor:r.goalsFor,goalsAgainst:r.goalsAgainst,formIndex:parseForm(r.form)}));}

  async scorers(competition='SA',limit=50):Promise<Scorer[]>{const d=await this.footballData(`/competitions/${competition}/scorers?limit=${limit}`,{},30*60_000);return (d.scorers||[]).map((s:any)=>({playerId:String(s.player.id),playerName:s.player.name,teamId:String(s.team.id),teamName:s.team.name,goals:Number(s.goals||0),assists:Number(s.assists||0),penalties:Number(s.penalties||0)}));}

  async matchDetails(matchId:string){return this.footballData(`/matches/${encodeURIComponent(matchId)}`,{'X-Unfold-Lineups':'true','X-Unfold-Goals':'true'},60_000);}

  async result(matchId:string):Promise<MatchResult>{const m=await this.footballData(`/matches/${encodeURIComponent(matchId)}`,{},mStatusTtl(matchId));return {id:String(m.id),status:m.status,home:m.score?.fullTime?.home??null,away:m.score?.fullTime?.away??null,lastUpdated:m.lastUpdated};}
}

function mStatusTtl(_matchId:string){return 60_000;}
