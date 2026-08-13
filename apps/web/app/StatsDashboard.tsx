'use client';
import {useEffect,useState} from 'react';

const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
const getJson=async(url:string)=>{const r=await fetch(url);const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b?.message||`HTTP ${r.status}`);return b};

export default function StatsDashboard(){
 const [m,setM]=useState<any>(),[paper,setPaper]=useState<any>(),[error,setError]=useState(''),[paperError,setPaperError]=useState(''),[loading,setLoading]=useState(true),[paperLoading,setPaperLoading]=useState(false),[bankroll,setBankroll]=useState(1000);
 const load=()=>{setLoading(true);setError('');getJson(`${API}/ops/performance`).then(setM).catch(e=>setError(e.message)).finally(()=>setLoading(false))};
 const loadPaper=()=>{setPaperLoading(true);setPaperError('');getJson(`${API}/v2/paper/report?bankroll=${encodeURIComponent(String(bankroll))}`).then(setPaper).catch(e=>setPaperError(e.message)).finally(()=>setPaperLoading(false))};
 useEffect(()=>{load();loadPaper()},[]);
 if(loading)return <div className="panel skeleton"><small>ANALYTICS</small><h2>Calcolo performance…</h2></div>;
 if(error)return <div className="notice"><b>Analytics non disponibili</b><span>{error}</span><button onClick={load}>Riprova</button></div>;
 const model=m?.modelPerformance||{},bet=m?.bettingPerformance||{};
 return <>
  <div className="stats">
   <article><small>MODEL PERFORMANCE · TUTTE LE PREDICTION</small><b>{model.sample??0} sample</b><span>Brier {num(model.brierScore,3)} · Log loss {num(model.logLoss,3)} · Hit {pct(model.hitRate)}</span></article>
   <article><small>CALIBRAZIONE</small><b>{pct(model.calibrationError)}</b><span>Errore medio ponderato tra probabilità dichiarata e frequenza osservata.</span></article>
   <article><small>BETTING PERFORMANCE · SOLO REALI</small><b>{bet.profit==null?'—':`€${Number(bet.profit).toFixed(2)}`}</b><span>ROI {pct(bet.roi)} · Yield {pct(bet.yield)} · Win {pct(bet.winRate)}</span></article>
   <article><small>CAPITALE IMPIEGATO</small><b>{bet.stake==null?'—':`€${Number(bet.stake).toFixed(2)}`}</b><span>Ritorni {bet.returns==null?'—':`€${Number(bet.returns).toFixed(2)}`} · quota media {num(bet.averageOdds,2)}</span></article>
   <article><small>MAX DRAWDOWN</small><b>{bet.maxDrawdown==null?'—':`€${Number(bet.maxDrawdown).toFixed(2)}`}</b><span>Paper trading escluso da queste metriche economiche.</span></article>
   <article><small>SISTEMI VS SINGOLE</small><b>{bet.systemsVsSingles?.systems?.systems??0} sistemi</b><span>{bet.systemsVsSingles?.singles?.sample??0} singole reali · {bet.systemsVsSingles?.systems?.combinations??0} combinazioni settled</span></article>
  </div>
  <section className="panel"><div className="sectionhead"><div><small>PAPER TRADING · CAPITALE VIRTUALE</small><h2>Portafoglio simulato</h2><p>Usa lo stesso settlement delle giocate reali, ma resta completamente separato dalle performance economiche reali.</p></div><div className="form"><label>Bankroll iniziale €<input aria-label="Bankroll paper trading" type="number" min="1" value={bankroll} onChange={e=>setBankroll(Number(e.target.value))}/></label><button onClick={loadPaper} disabled={paperLoading}>{paperLoading?'Calcolo…':'Ricalcola'}</button></div></div>{paperError?<div className="notice"><b>Paper report non disponibile</b><span>{paperError}</span></div>:paper&&<><div className="stats"><article><small>BANKROLL</small><b>€{num(paper.bankrollFinal,2)}</b><span>iniziale €{num(paper.bankrollInitial,2)}</span></article><article><small>P/L VIRTUALE</small><b>€{num(paper.profit,2)}</b><span>ROI {pct(paper.roi)} · Yield {pct(paper.yield)}</span></article><article><small>DRAWDOWN</small><b>€{num(paper.maxDrawdown,2)}</b><span>Win rate {pct(paper.winRate)}</span></article><article><small>ATTIVITÀ</small><b>{paper.betsCount??0} singole</b><span>{paper.systemsCount??0} sistemi · stake €{num(paper.stakeTotal,2)}</span></article></div>{paper.incompleteEconomicRecords>0&&<div className="notice"><b>Dati economici incompleti</b><span>{paper.incompleteEconomicRecords} record simulati non hanno una quota valida e sono esclusi da ROI/P&amp;L.</span></div>}<section><details><summary><b>Risultati paper per mercato</b></summary>{(paper.marketPerformance||[]).length?(paper.marketPerformance||[]).map((r:any)=><div className="history" key={r.market}><span><b>{r.market}</b><small>{r.sample} esiti · Win {pct(r.winRate)} · {r.wins} W / {r.losses} L / {r.voids} V</small></span></div>):<div className="empty"><span>Nessun esito paper disponibile.</span></div>}</details></section></>}</section>
  <section className="panel"><small>CALIBRAZIONE PROBABILISTICA</small><h2>Probabilità dichiarata vs osservata</h2><div className="calibration">{(model.calibration||[]).map((b:any)=><div key={b.range}><span>{b.range}</span><progress max="1" value={b.observed??0}/><small>{b.sample} · pred {pct(b.predicted)} · obs {pct(b.observed)}</small></div>)}</div></section>
  <Breakdown title="Model Performance per mercato" rows={model.byMarket} model/>
  <Breakdown title="Model Performance per campionato" rows={model.byCompetition} model/>
  <Breakdown title="Model Performance per confidence" rows={model.byConfidence} model/>
  <Breakdown title="Model Performance per versione modello" rows={model.byModelVersion} model/>
  <Breakdown title="Model Performance per periodo" rows={model.byPeriod} model/>
  <Breakdown title="Betting Performance per mercato" rows={bet.byMarket}/>
  <Breakdown title="Betting Performance per campionato" rows={bet.byCompetition}/>
  <Breakdown title="Betting Performance per bookmaker" rows={bet.byBookmaker}/>
 </>;
}

function Breakdown({title,rows=[],model=false}:{title:string;rows:any[];model?:boolean}){return <section className="panel"><details><summary><b>{title}</b></summary>{rows.length?rows.map(r=><div className="history" key={r.group}><span><b>{r.group}</b><small>{model?`${r.sample} sample · Hit ${pct(r.hitRate)} · Brier ${num(r.brierScore,3)} · Log loss ${num(r.logLoss,3)}`:`${r.sample} giocate · P/L €${Number(r.profit??0).toFixed(2)} · ROI ${pct(r.roi)} · Win ${pct(r.winRate)}`}</small></span></div>):<div className="empty"><span>Dati non ancora sufficienti.</span></div>}</details></section>}
function pct(v:any){return v==null?'—':`${Math.round(Number(v)*1000)/10}%`}
function num(v:any,d=2){return v==null?'—':Number(v).toFixed(d)}
