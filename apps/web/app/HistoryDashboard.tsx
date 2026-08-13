'use client';
import {useEffect,useMemo,useState} from 'react';

const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
type Scope='SINGLES'|'SYSTEMS'|'PREDICTIONS';
const json=async(url:string,init?:RequestInit)=>{const r=await fetch(url,init);const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body?.message||`${r.status} ${r.statusText}`);return body};
const post=(url:string)=>json(url,{method:'POST'});

export default function HistoryDashboard(){
 const [scope,setScope]=useState<Scope>('SINGLES'),[items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [mode,setMode]=useState(''),[status,setStatus]=useState(''),[competition,setCompetition]=useState(''),[team,setTeam]=useState(''),[market,setMarket]=useState(''),[bookmaker,setBookmaker]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState('');
 const query=useMemo(()=>{const q=new URLSearchParams();if(scope!=='PREDICTIONS'&&mode)q.set('mode',mode);if(status)q.set(scope==='PREDICTIONS'?'outcome':'status',status);if(competition)q.set('competition',competition);if(team)q.set('team',team);if(market)q.set('market',market);if(scope!=='PREDICTIONS'&&bookmaker)q.set('bookmaker',bookmaker);if(from)q.set('from',new Date(`${from}T00:00:00`).toISOString());if(to)q.set('to',new Date(`${to}T23:59:59`).toISOString());return q.toString()},[scope,mode,status,competition,team,market,bookmaker,from,to]);
 const load=()=>{setLoading(true);setError('');const path=scope==='SINGLES'?'bets':scope==='SYSTEMS'?'systems':'predictions';void json(`${API}/v2/history/${path}?${query}`).then(data=>setItems(Array.isArray(data)?data:[])).catch(e=>setError(e.message)).finally(()=>setLoading(false))};
 useEffect(()=>{load()},[scope,query]);
 async function settle(){setMessage('');try{const r=await post(`${API}/settlement/run`);setMessage(`${r.processed??0} elementi elaborati · ${r.fixturesFetched??0} fixture interrogate.`);load()}catch(e:any){setError(e.message)}}
 return <div className="panel">
  <div className="sectionhead"><div><small>AUDIT & SETTLEMENT</small><h2>Storico</h2><p>Prediction, paper trading e denaro reale restano separati. Lo snapshot originario non viene ricalcolato dopo il risultato.</p></div><button onClick={settle}>Verifica ora</button></div>
  <div className="tabs" aria-label="Tipo storico"><button className={scope==='SINGLES'?'on':''} onClick={()=>setScope('SINGLES')}>Singole</button><button className={scope==='SYSTEMS'?'on':''} onClick={()=>setScope('SYSTEMS')}>Sistemi</button><button className={scope==='PREDICTIONS'?'on':''} onClick={()=>setScope('PREDICTIONS')}>Prediction</button></div>
  <div className="filters">
   {scope!=='PREDICTIONS'&&<select aria-label="Esecuzione" value={mode} onChange={e=>setMode(e.target.value)}><option value="">Tutte</option><option value="PLAYED">Giocate reali</option><option value="SIMULATED">Paper trading</option><option value="NOT_PLAYED">Non giocate</option></select>}
   <select aria-label="Esito" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Ogni esito</option><option>WIN</option><option>LOSS</option><option>VOID</option>{scope!=='PREDICTIONS'&&<option>PENDING</option>}</select>
   <input aria-label="Competizione" placeholder="Competizione (es. SA)" value={competition} onChange={e=>setCompetition(e.target.value)}/>
   <input aria-label="Squadra" placeholder="Squadra" value={team} onChange={e=>setTeam(e.target.value)}/>
   <input aria-label="Mercato" placeholder="Mercato (es. 1X2)" value={market} onChange={e=>setMarket(e.target.value)}/>
   {scope!=='PREDICTIONS'&&<input aria-label="Bookmaker" placeholder="Bookmaker" value={bookmaker} onChange={e=>setBookmaker(e.target.value)}/>} 
   <label><small>DAL</small><input aria-label="Data da" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
   <label><small>AL</small><input aria-label="Data a" type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
  </div>
  {message&&<p className="success">{message}</p>}{error&&<div className="notice"><b>Storico non disponibile</b><span>{error}</span><button onClick={load}>Riprova</button></div>}
  {loading?<div className="empty skeleton"><b>Caricamento storico…</b></div>:items.length?items.map(item=>scope==='SINGLES'?<BetCard key={item.id} item={item}/>:scope==='SYSTEMS'?<SystemCard key={item.id} item={item}/>:<PredictionCard key={item.id} item={item}/>):!error&&<div className="empty"><b>Nessun record</b><span>Nessun elemento rispetta i filtri selezionati.</span></div>}
 </div>
}

function BetCard({item}:{item:any}){const origin=item.originalPrediction;return <div className="history"><span><b>{item.selection} · {item.market}</b><small>{execution(item)}{item.competition?` · ${item.competition}`:''}{item.bookmaker?` · ${item.bookmaker}`:''}{item.odds?` · @${Number(item.odds).toFixed(2)}`:''} · stake €{Number(item.stake).toFixed(2)} · ritorno {item.payout==null?'—':`€${Number(item.payout).toFixed(2)}`}</small>{origin&&<small>Prediction originaria · P {pct(origin.probability)} · Conf {pct(origin.confidence)} · DQ {pct(origin.dataQuality)} · Fair {num(origin.fairOdds)} · {origin.modelVersion} · {date(origin.capturedAt)}</small>}</span><strong className={`status status-${String(item.status).toLowerCase()}`}>{item.status}</strong></div>}
function SystemCard({item}:{item:any}){return <div className="history"><span><b>{item.mode} · {item.selections?.length??0} selezioni · {item.combinations?.length??0} combinazioni</b><small>{execution(item)}{item.bookmaker?` · ${item.bookmaker}`:''} · costo €{Number(item.totalCost??0).toFixed(2)} · ritorno {item.payout==null?'—':`€${Number(item.payout).toFixed(2)}`} · {date(item.createdAt)}</small>{(item.selections||[]).slice(0,3).map((s:any)=><small key={s.id}>{s.selection} · {s.market}{s.odds?` · @${Number(s.odds).toFixed(2)}`:''}{s.originalPrediction?` · P ${pct(s.originalPrediction.probability)} · Conf ${pct(s.originalPrediction.confidence)} · ${s.originalPrediction.modelVersion}`:' · prediction originaria non disponibile'}</small>)}</span><strong className={`status status-${String(item.status).toLowerCase()}`}>{item.status}</strong></div>}
function PredictionCard({item}:{item:any}){const fixture=item.fixture;return <div className="history"><span><b>{item.selection} · {item.market}</b><small>{fixture?`${fixture.homeTeam} — ${fixture.awayTeam} · ${fixture.competition} · `:''}{date(item.capturedAt)} · {item.modelVersion}</small><small>Probability {pct(item.probability)} · Confidence {pct(item.confidence)} · Data Quality {pct(item.dataQuality)} · Fair {num(item.fairOdds)}</small></span><strong className={`status status-${String(item.outcome||item.status).toLowerCase()}`}>{item.outcome||item.status}</strong></div>}
function execution(x:any){return x.played?'REALE':x.simulated?'PAPER':'NON GIOCATO'}
function pct(v:any){return v==null?'—':`${Math.round(Number(v)*100)}%`}
function num(v:any){return v==null?'—':Number(v).toFixed(2)}
function date(v:any){return v?new Date(v).toLocaleString('it-IT'):'—'}
