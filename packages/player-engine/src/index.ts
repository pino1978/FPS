export const PLAYER_MODEL_VERSION='scorer-share-v1';
export type StarterStatus='CONFIRMED'|'BENCH'|'OUT'|'UNKNOWN';
export type PlayerScorerInput={playerId:string;playerName:string;goals:number;teamGoals:number;teamPlayed:number;teamGoalsFor:number;opponentGoalsAgainst:number;opponentPlayed:number;starterStatus:StarterStatus;availabilityVerified:boolean};
export type PlayerScorerPrediction={playerId:string;playerName:string;market:'ANYTIME_SCORER';selection:string;probability:number;confidence:number;dataQuality:number;status:'ACTIVE'|'NO_BET';reason?:string;modelVersion:string;fairOdds:number|null};
const clamp=(n:number,min=0,max=1)=>Math.max(min,Math.min(max,n));
export function predictAnytimeScorer(input:PlayerScorerInput):PlayerScorerPrediction{
 const sample=Math.min(input.teamPlayed,input.opponentPlayed);const lineupQuality=input.starterStatus==='CONFIRMED'?1:input.starterStatus==='BENCH'?.45:input.starterStatus==='OUT'?0:.35;const availabilityQuality=input.availabilityVerified?1:.7;const dq=clamp((sample/10)*lineupQuality*availabilityQuality);
 const base={playerId:input.playerId,playerName:input.playerName,market:'ANYTIME_SCORER' as const,selection:`${input.playerName} segna`,confidence:clamp(.45+.45*dq),dataQuality:dq,modelVersion:PLAYER_MODEL_VERSION};
 if(input.starterStatus==='OUT')return {...base,probability:0,status:'NO_BET',reason:'Giocatore indisponibile',fairOdds:null};
 if(input.starterStatus!=='CONFIRMED')return {...base,probability:0,status:'NO_BET',reason:'Titolarità non confermata',fairOdds:null};
 if(sample<5||input.teamGoals<=0||input.goals<=0)return {...base,probability:0,status:'NO_BET',reason:'Campione individuale insufficiente',fairOdds:null};
 const teamRate=input.teamGoalsFor/Math.max(1,input.teamPlayed),oppConcede=input.opponentGoalsAgainst/Math.max(1,input.opponentPlayed),teamLambda=clamp((teamRate+oppConcede)/2,.15,3.5);const share=clamp(input.goals/input.teamGoals,.01,.65);const playerLambda=clamp(teamLambda*share*.95,.01,1.8);const p=1-Math.exp(-playerLambda);const active=dq>=.75&&base.confidence>=.70;
 return {...base,probability:p,status:active?'ACTIVE':'NO_BET',reason:active?undefined:'Data Quality/Confidence sotto soglia',fairOdds:p>0?1/p:null};
}
