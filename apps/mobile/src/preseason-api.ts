import{DEFAULT_MODEL_CONFIG,MODEL_CONFIG_VERSION,MODEL_VERSION,predictFixture,type MatchContext,type VenueMetrics}from'@fps/domain';
import type{FootballProvider,LocalStore,Standing}from'@fps/mobile-runtime';

const BASE='http://localhost:4000';
export const PRESEASON_CONFIG={version:'preseason-v1',currentFullWeightMatches:8,minDataQuality:.50,minConfidence:.55,baseHistoricalFreshness:.72}as const;

type Row={fixture:any;expectedGoalsHome:number|null;expectedGoalsAway:number|null;markets:any[];inputs:any;availability:any};

export function installPreseasonApi(provider:FootballProvider,store:LocalStore){
 const delegated=window.fetch.bind(window);
 window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const raw=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
  if(!raw.startsWith(`${BASE}/v2/preseason`))return delegated(input as any,init);
  try{const u=new URL(raw),competition=u.searchParams.get('competition')||'SA',persist=u.searchParams.get('persist')!=='false';return json(await preseasonPredictions(provider,store,competition,persist))}catch(e:any){return json({message:e?.message||'Preseason runtime error'},400)}
 })as typeof window.fetch;
}

export async function preseasonPredictions(provider:FootballProvider,store:LocalStore,competition='SA',persist=true){
 const fixtures=await provider.fixtures(competition),startYear=seasonStartYear(fixtures[0]?.utcDate),previousSeason=startYear-1;
 const[currentRaw,previousRaw]=await Promise.all([provider.footballData(`/competitions/${encodeURIComponent(competition)}/standings`),provider.footballData(`/competitions/${encodeURIComponent(competition)}/standings?season=${previousSeason}`)]);
 const current=standingsFromPayload(currentRaw),previous=standingsFromPayload(previousRaw),currentBy=new Map(current.map(x=>[x.teamId,x])),previousBy=new Map(previous.map(x=>[x.teamId,x]));
 const data:Row[]=fixtures.map(f=>{
  const hc=currentBy.get(f.home.id),ac=currentBy.get(f.away.id),hp=previousBy.get(f.home.id),ap=previousBy.get(f.away.id);
  if((!hp&&(!hc||hc.played<3))||(!ap&&(!ac||ac.played<3)))return noBet(f,'Storico Serie A precedente non disponibile per entrambe le squadre',hc,ac,hp,ap);
  const h=blendStanding(hc,hp),a=blendStanding(ac,ap);if(!h||!a)return noBet(f,'Dati storici insufficienti per la modalità Preseason',hc,ac,hp,ap);
  const context:MatchContext={availabilityCoverage:.72,lineupConfirmed:false};
  const bundle=predictFixture(h,a,DEFAULT_MODEL_CONFIG,context),oneXtwo=bundle.markets.filter((m:any)=>m.market==='1X2').map((m:any)=>m.probability),env=preseasonEnvelope(h,a,oneXtwo);
  if(!env.active)return noBet(f,env.reason||'Quality gate Preseason non superato',hc,ac,hp,ap);
  return{fixture:f,expectedGoalsHome:bundle.expectedGoalsHome,expectedGoalsAway:bundle.expectedGoalsAway,inputs:{mode:'PRESEASON',current:{home:hc||null,away:ac||null},previous:{season:previousSeason,home:hp||null,away:ap||null},blended:{home:h,away:a},config:PRESEASON_CONFIG},availability:{source:'UNAVAILABLE',checked:false,lineupConfirmed:false},markets:bundle.markets.map((m:any)=>({...m,confidence:env.confidence,dataQuality:env.dataQuality,status:'ACTIVE',predictionMode:'PRESEASON'}))};
 });
 const version=`${MODEL_VERSION}+${PRESEASON_CONFIG.version}`;
 if(persist){const now=new Date().toISOString();for(const row of data)await store.savePredictionRun({id:`${row.fixture.id}:${version}:${Math.floor(Date.now()/300000)}`,fixtureId:row.fixture.id,fixture:row.fixture,competition,eventAt:row.fixture.utcDate,capturedAt:now,modelVersion:version,modelConfigVersion:MODEL_CONFIG_VERSION,inputSnapshot:row.inputs,markets:row.markets})}
 return{source:`football-data.org historical season ${previousSeason}`,mode:'PRESEASON',historicalSeason:previousSeason,modelVersion:version,modelConfigVersion:MODEL_CONFIG_VERSION,config:PRESEASON_CONFIG,data};
}

export function seasonStartYear(v?:string){const d=v?new Date(v):new Date(),y=d.getUTCFullYear(),m=d.getUTCMonth()+1;return m>=7?y:y-1}

export function blendStanding(current?:Standing,previous?:Standing):Standing|undefined{
 if(!previous)return current&&current.played>=3?current:undefined;if(!current||current.played<=0)return{...previous};
 const w=Math.max(0,Math.min(1,current.played/PRESEASON_CONFIG.currentFullWeightMatches)),p=1-w,played=Math.max(previous.played,current.played,10),rate=(a:number,b:number,ap:number,bp:number)=>(a/Math.max(1,ap))*w+(b/Math.max(1,bp))*p;
 const venueBlend=(c:VenueMetrics|undefined,old:VenueMetrics|undefined):VenueMetrics|undefined=>{if(!old)return c;if(!c||!c.played)return old;const vp=Math.max(old.played,c.played,5);return{played:vp,points:rate(c.points,old.points,c.played,old.played)*vp,goalsFor:rate(c.goalsFor,old.goalsFor,c.played,old.played)*vp,goalsAgainst:rate(c.goalsAgainst,old.goalsAgainst,c.played,old.played)*vp}};
 return{teamId:current.teamId,played,points:rate(current.points,previous.points,current.played,previous.played)*played,goalsFor:rate(current.goalsFor,previous.goalsFor,current.played,previous.played)*played,goalsAgainst:rate(current.goalsAgainst,previous.goalsAgainst,current.played,previous.played)*played,formIndex:current.formIndex==null?previous.formIndex:previous.formIndex==null?current.formIndex:current.formIndex*w+previous.formIndex*p,home:venueBlend(current.home,previous.home),away:venueBlend(current.away,previous.away),("currentPlayed" as any):current.played,("historicalPriorWeight" as any):p}as Standing;
}

export function preseasonEnvelope(home:Standing,away:Standing,oneXtwo:number[]){
 const currentPlayed=Math.min(Number((home as any).currentPlayed||0),Number((away as any).currentPlayed||0)),currentWeight=Math.max(0,Math.min(1,currentPlayed/PRESEASON_CONFIG.currentFullWeightMatches)),priorSample=Math.min(home.played,away.played),coverage=Math.max(.6,Math.min(1,priorSample/30)),dq=Math.max(0,Math.min(1,PRESEASON_CONFIG.baseHistoricalFreshness*coverage*(.82+.18*currentWeight))),sorted=[...oneXtwo].sort((a,b)=>b-a),sep=sorted.length>1?sorted[0]-sorted[1]:0,confidence=Math.max(0,Math.min(1,.42+.28*dq+.18*Math.min(1,sep*3)+.06*currentWeight)),active=dq>=PRESEASON_CONFIG.minDataQuality&&confidence>=PRESEASON_CONFIG.minConfidence;
 return{dataQuality:dq,confidence,active,reason:active?undefined:dq<PRESEASON_CONFIG.minDataQuality?'Data Quality Preseason sotto soglia':'Confidence Preseason sotto soglia'};
}

function standingsFromPayload(d:any):Standing[]{const total=table(d.standings,'TOTAL'),home=table(d.standings,'HOME'),away=table(d.standings,'AWAY');return[...total.values()].map((r:any)=>({teamId:String(r.team.id),played:Number(r.playedGames||0),points:Number(r.points||0),goalsFor:Number(r.goalsFor||0),goalsAgainst:Number(r.goalsAgainst||0),formIndex:parseForm(r.form),home:venue(home.get(String(r.team.id))),away:venue(away.get(String(r.team.id)))}))}
function table(items:any[],type:string){return new Map<string,any>(((items||[]).find((x:any)=>x.type===type)?.table||[]).map((r:any)=>[String(r.team.id),r]))}
function venue(r:any):VenueMetrics|undefined{return r?{played:Number(r.playedGames||0),points:Number(r.points||0),goalsFor:Number(r.goalsFor||0),goalsAgainst:Number(r.goalsAgainst||0)}:undefined}
function parseForm(v:string|undefined){if(!v)return undefined;const xs=v.split(',').map(x=>x.trim()).filter(Boolean);return xs.length?xs.reduce((n,x)=>n+(x==='W'?1:x==='D'?.5:0),0)/xs.length:undefined}
function noBet(fixture:any,reason:string,currentHome?:Standing,currentAway?:Standing,previousHome?:Standing,previousAway?:Standing):Row{return{fixture,expectedGoalsHome:null,expectedGoalsAway:null,markets:[{market:'MODEL',selection:'NO_BET',probability:0,confidence:0,dataQuality:0,fairOdds:null,status:'NO_BET',reason,reasonCode:'PRESEASON_INPUT'}],inputs:{mode:'PRESEASON',current:{home:currentHome||null,away:currentAway||null},previous:{home:previousHome||null,away:previousAway||null},config:PRESEASON_CONFIG},availability:{source:'UNAVAILABLE',checked:false,lineupConfirmed:false}}}
function json(v:any,status=200){return new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}})}
