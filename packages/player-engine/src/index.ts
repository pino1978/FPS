export const PLAYER_MODEL_VERSION='scorer-impact-v2';
export const PLAYER_IMPACT_VERSION='player-impact-v1';
export type StarterStatus='CONFIRMED'|'BENCH'|'OUT'|'UNKNOWN';
export type PlayerRole='GOALKEEPER'|'DEFENDER'|'MIDFIELDER'|'ATTACKER'|'UNKNOWN';
export type PlayerImpactInput={goals:number;assists?:number;teamGoals:number;role?:string;starterStatus:StarterStatus;expectedMinutes?:number;penalties?:number;availabilityVerified:boolean};
export type PlayerImpact={score:number;expectedMinutes:number;role:PlayerRole;version:string;components:{goalShare:number;assistShare:number;roleWeight:number;minutesWeight:number;setPieceWeight:number;availabilityWeight:number}};
export type PlayerScorerInput={playerId:string;playerName:string;goals:number;assists?:number;penalties?:number;teamGoals:number;teamPlayed:number;teamGoalsFor:number;opponentGoalsAgainst:number;opponentPlayed:number;starterStatus:StarterStatus;availabilityVerified:boolean;role?:string;expectedMinutes?:number;teamExpectedGoals?:number};
export type PlayerScorerPrediction={playerId:string;playerName:string;market:'ANYTIME_SCORER';selection:string;probability:number;confidence:number;dataQuality:number;status:'ACTIVE'|'NO_BET';reason?:string;modelVersion:string;fairOdds:number|null;playerImpact:PlayerImpact};
const clamp=(n:number,min=0,max=1)=>Math.max(min,Math.min(max,n));

export function normalizeRole(value?:string):PlayerRole{
 const role=(value||'').toUpperCase();
 if(role.includes('GOALKEEP')||role==='G')return 'GOALKEEPER';
 if(role.includes('DEF')||role==='D')return 'DEFENDER';
 if(role.includes('MID')||role==='M')return 'MIDFIELDER';
 if(role.includes('ATT')||role.includes('FORWARD')||role==='F')return 'ATTACKER';
 return 'UNKNOWN';
}

export function expectedMinutesFor(status:StarterStatus,provided?:number){
 if(provided!=null&&Number.isFinite(provided))return Math.max(0,Math.min(120,provided));
 return status==='CONFIRMED'?78:status==='BENCH'?25:status==='OUT'?0:55;
}

export function playerImpactScore(input:PlayerImpactInput):PlayerImpact{
 const role=normalizeRole(input.role),expectedMinutes=expectedMinutesFor(input.starterStatus,input.expectedMinutes);
 const goalShare=clamp(input.teamGoals>0?input.goals/input.teamGoals:0);
 const assistShare=clamp(input.teamGoals>0?(input.assists||0)/input.teamGoals:0);
 const roleWeight=role==='ATTACKER'?1:role==='MIDFIELDER'?.78:role==='DEFENDER'?.48:role==='GOALKEEPER'?.08:.65;
 const minutesWeight=clamp(expectedMinutes/90);
 const setPieceWeight=clamp((input.penalties||0)/Math.max(1,input.goals));
 const availabilityWeight=input.starterStatus==='OUT'?0:input.availabilityVerified?1:.75;
 const score=clamp((goalShare*.50+assistShare*.12+roleWeight*.18+setPieceWeight*.08+minutesWeight*.12)*minutesWeight*availabilityWeight);
 return {score,expectedMinutes,role,version:PLAYER_IMPACT_VERSION,components:{goalShare,assistShare,roleWeight,minutesWeight,setPieceWeight,availabilityWeight}};
}

export function predictAnytimeScorer(input:PlayerScorerInput):PlayerScorerPrediction{
 const sample=Math.min(input.teamPlayed,input.opponentPlayed);
 const impact=playerImpactScore({goals:input.goals,assists:input.assists,penalties:input.penalties,teamGoals:input.teamGoals,role:input.role,starterStatus:input.starterStatus,expectedMinutes:input.expectedMinutes,availabilityVerified:input.availabilityVerified});
 const lineupQuality=input.starterStatus==='CONFIRMED'?1:input.starterStatus==='BENCH'?.45:input.starterStatus==='OUT'?0:.35;
 const availabilityQuality=input.availabilityVerified?1:.7;
 const roleQuality=impact.role==='UNKNOWN'?.9:1;
 const dq=clamp((sample/10)*lineupQuality*availabilityQuality*roleQuality);
 const base={playerId:input.playerId,playerName:input.playerName,market:'ANYTIME_SCORER' as const,selection:`${input.playerName} segna`,confidence:clamp(.45+.45*dq),dataQuality:dq,modelVersion:PLAYER_MODEL_VERSION,playerImpact:impact};
 if(input.starterStatus==='OUT')return {...base,probability:0,status:'NO_BET' as const,reason:'Giocatore indisponibile',fairOdds:null};
 if(input.starterStatus!=='CONFIRMED')return {...base,probability:0,status:'NO_BET' as const,reason:'Titolarità non confermata',fairOdds:null};
 if(sample<5||input.teamGoals<=0||input.goals<=0)return {...base,probability:0,status:'NO_BET' as const,reason:'Campione individuale insufficiente',fairOdds:null};
 const fallbackTeamLambda=clamp(((input.teamGoalsFor/Math.max(1,input.teamPlayed))+(input.opponentGoalsAgainst/Math.max(1,input.opponentPlayed)))/2,.15,3.5);
 const teamLambda=input.teamExpectedGoals!=null&&Number.isFinite(input.teamExpectedGoals)?Math.max(.15,Math.min(3.8,input.teamExpectedGoals)):fallbackTeamLambda;
 const historicalShare=clamp(input.goals/input.teamGoals,.01,.65);
 const roleMultiplier=impact.role==='ATTACKER'?1.05:impact.role==='MIDFIELDER'?.90:impact.role==='DEFENDER'?.62:impact.role==='GOALKEEPER'?.08:.82;
 const minutesMultiplier=clamp(impact.expectedMinutes/90,.1,1);
 const impactMultiplier=.75+.5*impact.score;
 const playerLambda=clamp(teamLambda*historicalShare*roleMultiplier*minutesMultiplier*impactMultiplier,.005,1.8);
 const p=1-Math.exp(-playerLambda);
 const active=dq>=.72&&base.confidence>=.68&&impact.expectedMinutes>=60;
 return {...base,probability:p,status:active?'ACTIVE' as const:'NO_BET' as const,reason:active?undefined:'Data Quality/Confidence/Expected Minutes sotto soglia',fairOdds:p>0?1/p:null};
}
