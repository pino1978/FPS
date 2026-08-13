'use client';
import {Dispatch,SetStateAction,useState} from 'react';

export type SystemPick={
  id:string;fixtureId:string;market:string;selection:string;eventAt:string;
  probability:number;confidence:number;dataQuality:number;fairOdds?:number|null;fixed?:boolean;
  period?:'FT'|'HT';metric?:string;operator?:string;threshold?:number;outcome?:string;teamSide?:'HOME'|'AWAY';playerId?:string;
};
const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
const json=async(url:string,init?:RequestInit)=>{const response=await fetch(url,init);const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body?.message||`${response.status} ${response.statusText}`);return body};
const post=(url:string,body?:unknown)=>json(url,{method:'POST',headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});

export default function SystemBuilderPanel({bag,setBag,available}:{bag:SystemPick[];setBag:Dispatch<SetStateAction<SystemPick[]>>;available:SystemPick[]}){
 const [mode,setMode]=useState<'AUTO'|'ASSISTED'|'MANUAL'>('ASSISTED');
 const [profile,setProfile]=useState<'PRUDENT'|'BALANCED'|'AGGRESSIVE'>('BALANCED');
 const [budget,setBudget]=useState(20),[minCorrect,setMinCorrect]=useState(3),[k,setK]=useState(3),[stake,setStake]=useState(1);
 const [result,setResult]=useState<any>(),[saved,setSaved]=useState(''),[busy,setBusy]=useState(false),[bookmaker,setBookmaker]=useState('');
 const [actualOdds,setActualOdds]=useState<Record<string,string>>({});
 const source=mode==='AUTO'?available:bag,fixedIds=bag.filter(p=>p.fixed).map(p=>p.id);
 const toggleFixed=(id:string)=>setBag(items=>items.map(p=>p.id===id?{...p,fixed:!p.fixed}:p));
 const resultSelections:SystemPick[]=result?.selections||source;

 async function build(){
  setBusy(true);setSaved('');
  try{const payload=mode==='AUTO'?{selections:source,budget,profile}:mode==='ASSISTED'?{selections:source,minCorrect,budget,profile,fixedIds}:{selections:source,k,stake,budget,fixedIds};const endpoint=mode==='AUTO'?'/v2/systems/optimize':mode==='ASSISTED'?'/v2/systems/assist':'/v2/systems/build';setResult(await post(API+endpoint,payload));}
  catch(e:any){setResult({status:'ERROR',reason:e.message})}finally{setBusy(false)}
 }

 async function save(execution:'NOT_PLAYED'|'PLAYED'|'SIMULATED'){
  if(!result||result.status!=='OK')return;
  const oddsById=new Map<string,number>();
  if(execution!=='NOT_PLAYED'){
   for(const pick of resultSelections){const odds=Number(actualOdds[pick.id]);if(!Number.isFinite(odds)||odds<=1){setSaved(`Inserisci la quota di esecuzione per ${pick.selection} prima di registrare una giocata reale o paper.`);return}oddsById.set(pick.id,odds)}
  }
  setBusy(true);setSaved('');
  try{
   const comboStake=Number(result.stake??stake);
   const savedSystem=await post(`${API}/systems/save`,{
    mode,profile,budget,totalCost:Number(result.cost||0),played:false,
    selections:resultSelections.map(p=>({clientKey:p.id,fixtureId:p.fixtureId,market:p.market,selection:p.selection,eventAt:p.eventAt,odds:execution!=='NOT_PLAYED'?oddsById.get(p.id):undefined})),
    combinations:(result.combinations||[]).map((combo:SystemPick[])=>({selectionKeys:combo.map(p=>p.id),stake:comboStake})),
   });
   if(execution!=='NOT_PLAYED')await post(`${API}/v2/history/systems/${savedSystem.id}/execution`,{mode:execution,bookmaker:bookmaker.trim()||undefined});
   setSaved(execution==='PLAYED'?'Sistema registrato come realmente giocato.':execution==='SIMULATED'?'Sistema registrato in paper trading.':'Sistema salvato come non giocato.');
  }catch(e:any){setSaved(e.message)}finally{setBusy(false)}
 }

 return <div className="panel"><small>CREAZIONE GUIDATA</small><h2>System Builder</h2><p>Automatico seleziona opportunità valide; Assistito sviluppa i pronostici scelti; Manuale espone la combinatoria. Le incompatibilità sono sempre bloccate.</p>
  <div className="tabs"><button className={mode==='AUTO'?'on':''} onClick={()=>setMode('AUTO')}>Automatico</button><button className={mode==='ASSISTED'?'on':''} onClick={()=>setMode('ASSISTED')}>Assistito</button><button className={mode==='MANUAL'?'on':''} onClick={()=>setMode('MANUAL')}>Manuale</button></div>
  <div className="form"><label>Pronostici <b>{source.length}</b></label><label>Budget €<input type="number" min="1" value={budget} onChange={e=>setBudget(Number(e.target.value))}/></label><label>Profilo<select value={profile} onChange={e=>setProfile(e.target.value as any)}><option value="PRUDENT">Prudente</option><option value="BALANCED">Bilanciato</option><option value="AGGRESSIVE">Aggressivo</option></select></label>{mode==='ASSISTED'&&<label>Minimo corretti desiderato<input type="number" min="1" max={source.length||1} value={minCorrect} onChange={e=>setMinCorrect(Number(e.target.value))}/></label>}{mode==='MANUAL'&&<><label>Dimensione combinazioni<input type="number" min="1" max={source.length||1} value={k} onChange={e=>setK(Number(e.target.value))}/></label><label>Stake/combo €<input type="number" min="0.1" step="0.1" value={stake} onChange={e=>setStake(Number(e.target.value))}/></label></>}</div>
  {mode!=='AUTO'&&bag.length>0&&<div className="fixedList"><small>SELEZIONI · “FISSA” = PRESENTE IN OGNI COMBINAZIONE</small>{bag.map(p=><div className="fixedRow" key={p.id}><span><b>{p.selection}</b><small>{p.market}</small></span><button className={p.fixed?'fixed on':'fixed'} onClick={()=>toggleFixed(p.id)}>{p.fixed?'Fissa ✓':'Fissa'}</button></div>)}</div>}
  <button className="primary" disabled={busy||!source.length} onClick={build}>{busy?'Elaborazione…':'Genera sistema'}</button>
  {result&&<SystemResult result={result} budget={budget}/>} 
  {result?.status==='OK'&&<details className="executionDetails"><summary>Quote di esecuzione · reale o paper</summary><p>Inserisci le quote effettivamente disponibili al momento dell’esecuzione. Servono per P/L, ROI e yield; le Fair Odds del modello restano separate.</p><div className="form"><label>Bookmaker (opzionale)<input value={bookmaker} onChange={e=>setBookmaker(e.target.value)} placeholder="Bookmaker"/></label>{resultSelections.map(p=><label key={p.id}>Quota esecuzione · {p.selection}<input aria-label={`Quota effettiva ${p.selection}`} type="number" min="1.01" step="0.01" value={actualOdds[p.id]||''} onChange={e=>setActualOdds(v=>({...v,[p.id]:e.target.value}))} placeholder="es. 1.85"/></label>)}</div></details>}
  {result?.status==='OK'&&<div className="executionActions"><button onClick={()=>save('NOT_PLAYED')}>Salva</button><button onClick={()=>save('SIMULATED')}>Paper trading</button><button className="primary" onClick={()=>save('PLAYED')}>L’ho giocato</button></div>}
  {saved&&<p className={saved.startsWith('Sistema registrato')||saved.startsWith('Sistema salvato')?'success':'notice'}>{saved}</p>}
 </div>;
}

function SystemResult({result,budget}:{result:any;budget:number}){if(result.status!=='OK')return <div className="notice"><b>{result.status==='NO_BET'?'NO_BET':result.status}</b><span>{result.reason||'Il sistema non può essere generato con i vincoli correnti.'}</span></div>;return <div className="systemSummary"><div><small>COMBINAZIONI</small><b>{result.combinations?.length??0}</b></div><div><small>COSTO</small><b>€{Number(result.cost||0).toFixed(2)}</b></div><div><small>BUDGET</small><b>€{Number(budget).toFixed(2)}</b></div><div><small>RISCHIO / CORR.</small><b>{result.profile||'Custom'} {result.maxCorrelation!=null?`· ${Math.round(result.maxCorrelation*100)}%`:''}</b></div>{result.coverage&&<p><strong>Copertura:</strong> {result.coverage.explanation}<br/><span>{result.coverage.guarantee}</span></p>}</div>}
