'use client';
import {useEffect,useState} from 'react';

const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';

type TeamStats={played:number;points:number;goalsFor:number;goalsAgainst:number;formIndex?:number};
type Intel={statistics:{home:TeamStats|null;away:TeamStats|null};lineup:{home:{starters:string[];bench:string[]};away:{starters:string[];bench:string[]};source:string};injuries:Array<{playerName:string;teamName:string;type?:string;reason?:string}>;availabilityVerified:boolean;explanation:string[]};

export default function MatchIntelligence({fixtureId,competition='SA'}:{fixtureId:string;competition?:string}){
 const [data,setData]=useState<Intel|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;setLoading(true);setError('');fetch(`${API}/v2/matches/${encodeURIComponent(fixtureId)}/intelligence?competition=${encodeURIComponent(competition)}`).then(async r=>{const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body?.message||`HTTP ${r.status}`);return body}).then(body=>{if(active)setData(body)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[fixtureId,competition]);
 if(loading)return <section className="intelStrip skeleton"><span>Caricamento forma, lineup e indisponibili…</span></section>;
 if(error)return <section className="intelStrip"><span>Dati contestuali non disponibili: {error}. Le prediction non vengono integrate con valori inventati.</span></section>;
 if(!data)return null;
 const h=data.statistics.home,a=data.statistics.away;
 return <section className="intelPanel" aria-label="Approfondimento partita">
   <div className="intelOverview">
    <article><small>FORMA CASA</small><b>{h?.formIndex==null?'—':`${Math.round(h.formIndex*100)}%`}</b><span>{h?`${h.points} pt · ${h.goalsFor}:${h.goalsAgainst} gol`:'Dati insufficienti'}</span></article>
    <article><small>FORMA TRASFERTA</small><b>{a?.formIndex==null?'—':`${Math.round(a.formIndex*100)}%`}</b><span>{a?`${a.points} pt · ${a.goalsFor}:${a.goalsAgainst} gol`:'Dati insufficienti'}</span></article>
    <article><small>DISPONIBILITÀ</small><b>{data.availabilityVerified?'Verificata':'Parziale'}</b><span>{data.injuries.length?`${data.injuries.length} indisponibilità rilevate`:'Nessuna indisponibilità disponibile'}</span></article>
   </div>
   <details><summary>Forma & statistiche</summary><div className="intelGrid"><Team label="Casa" stats={h}/><Team label="Trasferta" stats={a}/></div></details>
   <details><summary>Lineup & indisponibili</summary><div className="intelGrid"><Lineup label="Casa" starters={data.lineup.home.starters} bench={data.lineup.home.bench}/><Lineup label="Trasferta" starters={data.lineup.away.starters} bench={data.lineup.away.bench}/></div>{data.injuries.length>0&&<div className="injuryList"><small>INDISPONIBILI / DUBBI</small>{data.injuries.map((x,i)=><span key={`${x.playerName}-${i}`}><b>{x.playerName}</b> · {x.teamName}{x.reason?` · ${x.reason}`:''}</span>)}</div>}</details>
   <details><summary>Motivazione quantitativa</summary><div className="explainList">{data.explanation.map((line,i)=><p key={i}>{line}</p>)}</div></details>
 </section>;
}

function Team({label,stats}:{label:string;stats:TeamStats|null}){return <article><small>{label.toUpperCase()}</small>{stats?<><b>{stats.points} punti</b><span>{stats.played} gare · GF {stats.goalsFor} · GS {stats.goalsAgainst}</span><span>Forma {stats.formIndex==null?'non disponibile':`${Math.round(stats.formIndex*100)}%`}</span></>:<span>Dati insufficienti</span>}</article>}
function Lineup({label,starters,bench}:{label:string;starters:string[];bench:string[]}){return <article><small>{label.toUpperCase()}</small><b>{starters.length?'Probabili/titolari':'Lineup non confermata'}</b><span>{starters.length?starters.join(' · '):'Nessun titolare affidabile disponibile'}</span>{bench.length>0&&<><b className="miniTitle">Panchina</b><span>{bench.join(' · ')}</span></>}</article>}
