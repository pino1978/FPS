import React,{useEffect,useMemo,useState}from'react';
import HistoryDashboard from'../../web/app/HistoryDashboard';
import StatsDashboard from'../../web/app/StatsDashboard';
import SystemBuilderPanel,{type SystemPick}from'../../web/app/SystemBuilderPanel';
import MatchIntelligence from'../../web/app/MatchIntelligence';
import{FilterBar,type FilterState}from'./FilterBar';
import{MatchCard}from'./MatchCard';
import{DetailPanels}from'./DetailPanels';
import type{Market,Row}from'./mobile-types';
import{day,featured,forQuick}from'./mobile-types';

const API='http://localhost:4000';
type Tab='Pronostici'|'Partite'|'Sistema'|'Storico'|'Altro';
type MoreTab='Statistiche'|'I miei sistemi'|'Impostazioni';
const initial:FilterState={quick:'Tutti',team:'',scope:'ALL',minP:0,minC:0,minD:0,sort:'TIME'};

async function request(url:string){const r=await fetch(url);const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b?.message||`${r.status}`);return b}

export default function MobileHome(){
 const[rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[bag,setBag]=useState<SystemPick[]>([]),[tab,setTab]=useState<Tab>('Pronostici'),[filters,setFilters]=useState(initial),[detail,setDetail]=useState<Row|null>(null);
 const load=()=>{setLoading(true);setError('');void request(`${API}/v2/predictions?competition=SA&persist=true`).then(b=>setRows(b.data||[])).catch(e=>setError(e.message)).finally(()=>setLoading(false))};
 useEffect(load,[]);
 const addPick=(p:SystemPick)=>setBag(x=>x.some(i=>i.id===p.id)?x:[...x,p]);
 const add=(row:Row,m:Market)=>addPick(pick(row,m));
 const available=useMemo(()=>rows.flatMap(r=>featured(r).filter(m=>m.status==='ACTIVE').map(m=>pick(r,m))),[rows]);
 if(detail)return <MobileDetail row={detail} bag={bag} addPick={addPick} back={()=>setDetail(null)}/>;
 return <div className="mShell"><header className="mHead"><div><small>FORESIGHT · DATI REALI</small><h1>{tab}</h1></div><span className="mLive">● LIVE</span></header><main className="mMain">
  {tab==='Pronostici'&&<Pred rows={rows} loading={loading} error={error} retry={load} bag={bag} filters={filters} setFilters={setFilters} add={add} open={setDetail}/>} 
  {tab==='Partite'&&<Fixtures rows={rows} open={setDetail}/>} 
  {tab==='Sistema'&&<SystemBuilderPanel bag={bag} setBag={setBag} available={available}/>} 
  {tab==='Storico'&&<HistoryDashboard/>} 
  {tab==='Altro'&&<More/>}
 </main>{bag.length>0&&tab!=='Sistema'&&<button className="mSlip" aria-label={`Apri sistema con ${bag.length} selezioni`} onClick={()=>setTab('Sistema')}><span><b>{bag.length}</b> selezioni</span><strong>Apri sistema →</strong></button>}
 <nav className="mNav" aria-label="Navigazione principale">{([['Pronostici','◉'],['Partite','⚽'],['Sistema','＋'],['Storico','◷'],['Altro','•••']]as[Tab,string][]).map(([t,i])=><button key={t} aria-current={tab===t?'page':undefined} className={tab===t?'on':''} onClick={()=>setTab(t)}><span aria-hidden="true">{i}</span><small>{t}</small></button>)}</nav></div>
}

function MobileDetail({row,bag,addPick,back}:{row:Row;bag:SystemPick[];addPick:(p:SystemPick)=>void;back:()=>void}){
 return <div className="mShell"><header className="mHead"><button className="mBack" aria-label="Torna ai pronostici" onClick={back}>←</button><div><small>DETTAGLIO PARTITA</small><h1>{row.fixture.home.name} — {row.fixture.away.name}</h1></div></header><main className="mMain"><section className="mIntro"><small>{day(row.fixture.utcDate)}</small><h2>{row.fixture.home.name} — {row.fixture.away.name}</h2><p>xG modello: {row.expectedGoalsHome==null?'—':Number(row.expectedGoalsHome).toFixed(2)} — {row.expectedGoalsAway==null?'—':Number(row.expectedGoalsAway).toFixed(2)}</p></section><MatchIntelligence fixtureId={row.fixture.id}/><DetailPanels row={row} selected={id=>bag.some(p=>p.id===id)} add={addPick}/></main><nav className="mNav" aria-label="Navigazione dettaglio"><button onClick={back}><span>←</span><small>Indietro</small></button><button className="on" aria-current="page"><span>⚽</span><small>Partita</small></button></nav></div>
}

function Pred({rows,loading,error,retry,bag,filters,setFilters,add,open}:{rows:Row[];loading:boolean;error:string;retry:()=>void;bag:SystemPick[];filters:FilterState;setFilters:(f:FilterState)=>void;add:(r:Row,m:Market)=>void;open:(r:Row)=>void}){
 const filtered=useMemo(()=>apply(rows,filters),[rows,filters]);const groups=useMemo(()=>group(filtered),[filtered]);if(loading)return <div className="mLoading" role="status">Analisi delle partite…</div>;
 return <>{error&&<div className="mNotice" role="alert"><b>Dati live non disponibili</b><span>{error}. Nessun valore viene sostituito con dati inventati.</span><button onClick={retry}>Riprova</button></div>}<FilterBar value={filters} onChange={setFilters}/><section className="mIntro"><div><small>SERIE A · MODELLO VERSIONATO</small><h2>Probabilità, non certezze.</h2><p>Apri una partita solo quando vuoi vedere i mercati. Probability, Confidence e Data Quality restano indicatori distinti.</p></div></section>{!filtered.length?<div className="mEmpty">Nessun evento corrisponde ai filtri.</div>:groups.map(([d,rs])=><section className="mDay" key={d}><div className="mDayHead"><h2>{d}</h2><span>{rs.length} eventi</span></div>{rs.map(r=><MatchCard key={r.fixture.id} row={r} quick={filters.quick} selected={m=>bag.some(p=>p.id===pid(r,m))} onAdd={m=>add(r,m)} onOpen={()=>open(r)}/>)}</section>)}</>
}

function Fixtures({rows,open}:{rows:Row[];open:(r:Row)=>void}){const[q,setQ]=useState('');const f=rows.filter(r=>`${r.fixture.home.name} ${r.fixture.away.name}`.toLowerCase().includes(q.toLowerCase()));return <section className="mPanel"><label className="mSearch">Squadra<input aria-label="Filtra partite per squadra" value={q} onChange={e=>setQ(e.target.value)} placeholder="es. Napoli"/></label>{f.length?f.map(r=><button className="mFixture" key={r.fixture.id} onClick={()=>open(r)}><span><small>{day(r.fixture.utcDate)}</small><b>{r.fixture.home.name} — {r.fixture.away.name}</b></span><strong>→</strong></button>):<div className="mEmpty">Nessuna partita corrisponde al filtro.</div>}</section>}

function More(){const[section,setSection]=useState<MoreTab>('Statistiche');return <><div className="mMoreTabs" role="tablist" aria-label="Altre sezioni">{(['Statistiche','I miei sistemi','Impostazioni']as MoreTab[]).map(x=><button role="tab" aria-selected={section===x} className={section===x?'on':''} key={x} onClick={()=>setSection(x)}>{x}</button>)}</div>{section==='Statistiche'&&<StatsDashboard/>}{section==='I miei sistemi'&&<SavedSystems/>}{section==='Impostazioni'&&<Settings/>}</>}

function SavedSystems(){const[items,setItems]=useState<any[]>([]),[mode,setMode]=useState(''),[error,setError]=useState('');useEffect(()=>{setError('');void request(`${API}/v2/history/systems${mode?`?mode=${mode}`:''}`).then(x=>setItems(Array.isArray(x)?x:[])).catch(e=>{setItems([]);setError(e.message)})},[mode]);return <section className="mPanel"><div className="mSectionHead"><div><small>PORTAFOGLIO</small><h2>I miei sistemi</h2></div><select aria-label="Filtra sistemi" value={mode} onChange={e=>setMode(e.target.value)}><option value="">Tutti</option><option value="PLAYED">Reali</option><option value="SIMULATED">Paper</option><option value="NOT_PLAYED">Non giocati</option></select></div>{error&&<div className="mNotice">{error}</div>}{items.length?items.map(s=><article className="mSaved" key={s.id}><span><b>{s.mode} · {s.selections?.length||0} selezioni</b><small>{s.combinations?.length||0} combinazioni · €{Number(s.totalCost||0).toFixed(2)} · {s.played?'REALE':s.simulated?'PAPER':'NON GIOCATO'}</small></span><strong>{s.status}</strong></article>):!error&&<div className="mEmpty">Nessun sistema salvato.</div>}</section>}

function Settings(){return <section className="mPanel"><small>APP</small><h2>Impostazioni</h2><p>Le credenziali provider sono conservate nel secure storage del dispositivo e non sono incluse nell’APK. Il runtime locale utilizza football-data.org come sorgente configurata e API-Football quando disponibile.</p><div className="mInfoRow"><span>Modalità</span><b>Standalone Android</b></div><div className="mInfoRow"><span>Dati mancanti</span><b>NO_BET / UNAVAILABLE</b></div><div className="mInfoRow"><span>Settlement</span><b>Automatico e idempotente</b></div></section>}

function pid(r:Row,m:Market){return`${r.fixture.id}|${m.market}|${m.selection}`}
function pick(r:Row,m:Market):SystemPick{return{id:pid(r,m),fixtureId:r.fixture.id,market:m.market,selection:m.selection,eventAt:r.fixture.utcDate,probability:m.probability,confidence:m.confidence,dataQuality:m.dataQuality,fairOdds:m.fairOdds,period:m.period,metric:m.metric,operator:m.operator,threshold:m.threshold,outcome:m.outcome}}
function apply(rows:Row[],f:FilterState){const now=new Date();const until=f.scope==='TODAY'?edge(now,0):f.scope==='3D'?edge(now,3):f.scope==='7D'?edge(now,7):null;const out=rows.filter(r=>{if(f.team&&!`${r.fixture.home.name} ${r.fixture.away.name}`.toLowerCase().includes(f.team.toLowerCase()))return false;const t=new Date(r.fixture.utcDate);if(until&&(t<start(now)||t>until))return false;if(f.quick==='NO BET')return r.markets.some(m=>m.status==='NO_BET');return forQuick(r,f.quick).filter(m=>m.status==='ACTIVE').some(m=>m.probability*100>=f.minP&&m.confidence*100>=f.minC&&m.dataQuality*100>=f.minD)});return out.sort((a,b)=>f.sort==='TIME'?+new Date(a.fixture.utcDate)-+new Date(b.fixture.utcDate):metric(b,f)-metric(a,f))}
function metric(r:Row,f:FilterState){const m=forQuick(r,f.quick).filter(x=>x.status==='ACTIVE').sort((a,b)=>b.probability-a.probability)[0];return f.sort==='PROBABILITY'?m?.probability||0:f.sort==='CONFIDENCE'?m?.confidence||0:m?.dataQuality||0}
function group(rows:Row[]){const m=new Map<string,Row[]>();rows.forEach(r=>{const k=day(r.fixture.utcDate);m.set(k,[...(m.get(k)||[]),r])});return[...m.entries()]}
function start(d:Date){const x=new Date(d);x.setHours(0,0,0,0);return x}function edge(d:Date,n:number){const x=new Date(d);x.setDate(x.getDate()+n);x.setHours(23,59,59,999);return x}
