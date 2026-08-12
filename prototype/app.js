const S={view:"Pronostici",bag:[],detail:false,mode:"Automatico",scope:"Modello"};
const P=[
 {id:"inter",match:"Inter — Torino",pick:"Inter vincente",p:67,c:74,dq:82,value:"+6,4%"},
 {id:"milan",match:"Milan — Como",pick:"Over 2,5",p:64,c:71,dq:79,value:"+4,8%"},
 {id:"lautaro",match:"Inter — Torino",pick:"Lautaro marcatore",p:48,c:68,dq:76,value:"+5,1%",corr:true}
];
const V=["Pronostici","Partite","Sistemi","Storico","Statistiche"];
const main=document.querySelector("#main"),tray=document.querySelector("#tray"),modal=document.querySelector("#modal");
const m=(l,v,s)=>'<div class="metric"><small>'+l+'</small><b>'+v+'</b>'+(s?'<span>'+s+'</span>':'')+'</div>';
const head=()=>'<div class="pagehead"><small class="eyebrow">FOOTBALL INTELLIGENCE</small><h1>'+S.view+'</h1></div>';
function nav(){
 const h='<nav>'+V.map(v=>'<button class="'+(S.view===v?'active':'')+'" data-view="'+v+'">'+v+'</button>').join("")+'</nav>';
 document.querySelector("#nav").innerHTML=h;
 document.querySelector("#bottom").innerHTML=h;
 document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{S.view=b.dataset.view;S.detail=false;render()});
}
function card(p){
 const used=S.bag.some(x=>x.id===p.id);
 return '<article class="card"><div class="cardtop"><span>● 20:45</span><span>Serie A</span></div><h2>'+p.match+'</h2><div class="pick"><span><small>TOP PICK</small><b>'+p.pick+'</b></span><em>Pick score 78</em></div><div class="prob"><small>PROBABILITÀ</small><b>'+p.p+'%</b></div><div class="metrics">'+m("Confidence",p.c+"%")+m("Qualità dati",p.dq+"%")+m("Value",p.value,"Quota 1,67")+'</div><div class="actions"><button data-detail>Dettaglio</button><button class="primary" data-add="'+p.id+'" '+(used?'disabled':'')+'>'+(used?'✓ Nel sistema':'+ Sistema')+'</button></div></article>';
}
function predictions(){
 return head()+'<div class="dates">'+["DOM 16","LUN 17","OGGI 18","MER 19","GIO 20"].map((x,i)=>'<button class="'+(i===2?'active':'')+'">'+x+'</button>').join("")+'</div><div class="league"><span>A</span><div><b>Serie A</b><small>3 opportunità analizzate</small></div></div><div class="cards">'+P.map(card).join("")+'<article class="card"><div class="cardtop"><span>● 20:45</span><span>Serie A</span></div><h2>Napoli — Roma</h2><div class="notice"><b>!</b><span><strong>Nessuna selezione consigliata</strong><p>Qualità dati insufficiente: formazione non confermata.</p></span></div><div class="metrics">'+m("Probabilità","—")+m("Confidence","55%")+m("Qualità dati","58%")+'</div><div class="actions"><button data-detail>Vedi analisi</button><button disabled>NO_BET</button></div></article><button class="demo" id="block">Mostra incompatibilità logica</button></div>';
}
function matches(){
 return head()+'<div class="chips"><button class="active">Tutte</button><button>In programma</button><button>Live</button><button>Concluse</button></div>'+[["18:30","Atalanta — Bologna"],["20:45","Inter — Torino"],["20:45","Napoli — Roma"]].map(x=>'<button class="fixture" data-detail><small>'+x[0]+' · Serie A</small><b>'+x[1]+'</b><span>Tra 3 h ›</span></button>').join("")+'<div class="panel muted">Nessun’altra partita oggi.</div>';
}
function detail(){
 return '<button class="secondary" id="back">← Tutti i pronostici</button><section class="hero"><small>Serie A · Oggi, 20:45</small><h1>Inter — Torino</h1><div class="panel"><small class="eyebrow">INSIGHT PRINCIPALE</small><h2>Inter vincente</h2><p>La probabilità del modello supera quella implicita nella quota disponibile.</p><div class="metrics">'+m("Probabilità","67%")+m("Confidence","74%")+m("Qualità dati","82%")+'</div><button class="primary" data-add="inter">+ Aggiungi al sistema</button></div></section><div class="tabs"><button class="active">Overview</button><button>Mercati</button><button>Statistiche</button><button>Giocatori</button><button>Analisi</button></div><section class="panel"><h2>Razionale del modello</h2><p>Il modello attribuisce maggiore peso alla forma casalinga e alla disponibilità offensiva. Dati osservati alle 12:35.</p><p class="warning">Snapshot versionato · nessun dato futuro incluso</p></section>';
}
function systems(){
 const modes=["Automatico","Assistito","Manuale","I miei sistemi"];
 const tabs='<div class="tabs">'+modes.map(x=>'<button class="'+(S.mode===x?'active':'')+'" data-mode="'+x+'">'+x+'</button>').join("")+'</div>';
 if(S.mode==="I miei sistemi")return head()+tabs+'<div class="cards"><article class="card"><small class="eyebrow">PAPER</small><h3>Sistema 3/5 · Serie A</h3><p class="muted">In attesa di verifica</p></article><article class="card"><small class="eyebrow">NON GIOCATO</small><h3>Multipla · 3 selezioni</h3><button class="primary" id="played">L’ho giocato</button></article></div>';
 const fields=S.mode==="Automatico"?["Budget €20,00","Rischio Prudente","Serie A","Prossimi 7 giorni"]:S.mode==="Assistito"?(S.bag.length?S.bag.map(x=>"✓ "+x.pick):["Seleziona almeno due pick"]):["Triple 3/6","Stake €1,00","Selezione fissa"];
 const rows=[["Selezioni",S.bag.length||5],["Struttura","Triple 3/5"],["Combinazioni",10],["Stake / combo","€2,00"],["Costo totale","€20,00"],["Budget","€25,00"],["Rischio / copertura","Prudente · Media"]];
 return head()+tabs+'<div class="builder"><section><small class="eyebrow">CREAZIONE GUIDATA</small><h2>Configura il sistema</h2><p>Le soglie di qualità non saranno mai ridotte per forzare un risultato.</p><div class="form">'+fields.map(x=>'<button>'+x+'</button>').join("")+'</div><button class="primary wide" id="generate">Genera sistema</button><div id="generated"></div></section><aside class="summary"><small class="eyebrow">RIEPILOGO OBBLIGATORIO</small><h3>Prima della conferma</h3>'+rows.map(x=>'<div><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join("")+'<p class="warning">⚠ Correlazione media rilevata</p><button class="primary wide">Salva sistema</button></aside></div>';
}
function history(){
 if(S.detail==="history")return '<button class="secondary" id="backHistory">← Torna allo storico</button><section class="panel"><small class="eyebrow">REALE · WIN</small><h1>Sistema 3/5 · Serie A</h1><p>Snapshot immutabile creato il 16 agosto alle 18:42.</p><div class="metrics">'+m("Stake","€20")+m("Quota","4,82")+m("Payout","€96,40")+'</div><h2>Timeline verificabile</h2><ol class="timeline"><li><b>Creato</b><span>16 ago · modello v1.3</span></li><li><b>Giocato reale</b><span>16 ago · 18:49</span></li><li><b>Fixture verificate</b><span>17 ago · risultato v1</span></li><li><b>Settled · WIN</b><span>Regole 90’ v1</span></li></ol></section>';
 return head()+'<div class="chips"><button class="active">Tutte</button><button>Reali</button><button>Paper</button><button>Non giocate</button></div><button class="history-card" id="history"><span><em>REALE</em><b>WIN</b></span><h3>Sistema 3/5 · Serie A</h3><p class="muted">Inter vincente · Over 2,5 · Bologna +1</p><div class="metrics">'+m("Stake","€20")+m("Quota","4,82")+m("Payout","€96,40")+'</div><small class="muted">Verificato automaticamente · risultato v1</small></button>';
}
function stats(){
 const d={Modello:[["Brier score","0,184"],["Hit rate","61%"],["Campione","428"],["ECE","0,041"]],Betting:[["Profitto","+€84"],["ROI","7,2%"],["Stake","€1.166"],["Drawdown","−€94"]],Paper:[["Profitto","+€126"],["ROI paper","8,1%"],["Operazioni","184"],["Yield","6,7%"]]};
 return head()+'<div class="tabs">'+Object.keys(d).map(x=>'<button data-scope="'+x+'" class="'+(S.scope===x?'active':'')+'">'+x+'</button>').join("")+'</div><div class="scope"><b>Ambito: '+S.scope+'</b><span class="muted">Ultimi 90 giorni · N 428</span></div><div class="stats">'+d[S.scope].map(x=>'<article class="stat"><small>'+x[0]+'</small><b>'+x[1]+'</b><span class="muted">N = 428</span></article>').join("")+'</div><div class="notice sample"><b>i</b><span><strong>Campione insufficiente: Marcatori</strong><p>74/300 partite. Nessun giudizio positivo o negativo.</p></span></div>';
}
function drawTray(){
 tray.innerHTML='<small class="eyebrow">SYSTEM TRAY</small><h2>Il tuo sistema <span>'+S.bag.length+'</span></h2>'+(S.bag.length?S.bag.map(x=>'<div class="tray-pick"><span><b>'+x.pick+'</b><small>'+x.match+'</small></span><button data-remove="'+x.id+'">×</button></div>').join("")+'<div class="total"><span>Costo indicativo</span><b>€'+Math.max(4,S.bag.length*4)+',00</b></div><button class="primary wide" id="review">Rivedi sistema</button>':'<div class="tray-empty"><b>＋</b><strong>Nessuna selezione</strong><p>Aggiungi un pronostico compatibile per iniziare.</p></div>');
 document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{S.bag=S.bag.filter(x=>x.id!==b.dataset.remove);render()});
 const r=document.querySelector("#review");if(r)r.onclick=()=>{S.view="Sistemi";render()};
 const t=document.querySelector("#mobileTray");t.innerHTML='Sistema · '+S.bag.length+' selezioni · €'+Math.max(4,S.bag.length*4)+',00 ›';t.classList.toggle("hidden",!S.bag.length);t.onclick=()=>{S.view="Sistemi";render()};
}
function show(type,p){
 modal.classList.remove("hidden");
 const body=type==="corr"?'<small class="eyebrow">CORRELAZIONE ALTA</small><h2>Stesso scenario, rischio concentrato</h2><p>Inter vincente e '+p.pick+' sono correlate. È consentito procedere, ma il rischio aumenta.</p><footer><button id="close" class="secondary">Annulla</button><button id="accept" class="primary">Aggiungi comunque</button></footer>':type==="block"?'<small class="eyebrow">INCOMPATIBILE</small><h2>La selezione è stata bloccata</h2><p>Under 2,5 e Over 3,5 nella stessa partita sono logicamente incompatibili.</p><footer><button id="close" class="secondary">Mantieni Under 2,5</button><button id="close2" class="primary">Sostituisci</button></footer>':'<small class="eyebrow">GIOCATA REALE</small><h2>L’ho giocato</h2><p>Bookmaker: Demo Bet<br>Quota effettiva: 4,82<br>Stake: €20</p><p>La giocata reale resta separata dal paper trading.</p><footer><button id="close" class="secondary">Annulla</button><button id="close2" class="primary">Registra</button></footer>';
 modal.innerHTML='<div class="modal"><button id="x">×</button>'+body+'</div>';
 ["x","close","close2"].forEach(id=>{const b=document.querySelector("#"+id);if(b)b.onclick=hide});
 const a=document.querySelector("#accept");if(a)a.onclick=()=>{S.bag.push(p);hide();render()};
}
function hide(){modal.classList.add("hidden")}
function wire(){
 document.querySelectorAll("[data-detail]").forEach(b=>b.onclick=()=>{S.detail=true;render()});
 document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const p=P.find(x=>x.id===b.dataset.add);if(p.corr&&S.bag.some(x=>x.id==="inter"))show("corr",p);else if(!S.bag.some(x=>x.id===p.id)){S.bag.push(p);render()}});
 const q=id=>document.querySelector(id);
 if(q("#block"))q("#block").onclick=()=>show("block");
 if(q("#back"))q("#back").onclick=()=>{S.detail=false;render()};
 document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{S.mode=b.dataset.mode;render()});
 document.querySelectorAll("[data-scope]").forEach(b=>b.onclick=()=>{S.scope=b.dataset.scope;render()});
 if(q("#generate"))q("#generate").onclick=()=>q("#generated").innerHTML='<div class="success">3/5 · 10 combinazioni · nessuna incompatibilità</div>';
 if(q("#played"))q("#played").onclick=()=>show("played");
 if(q("#history"))q("#history").onclick=()=>{S.detail="history";render()};
 if(q("#backHistory"))q("#backHistory").onclick=()=>{S.detail=false;render()};
}
function render(){nav();main.innerHTML=S.view==="Pronostici"?(S.detail?detail():predictions()):S.view==="Partite"?(S.detail?detail():matches()):S.view==="Sistemi"?systems():S.view==="Storico"?history():stats();drawTray();wire()}
render();
