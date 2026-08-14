# Football Prediction System — MVP Backlog Addendum

**Documento operativo integrativo del backlog MVP**  
**Data:** 15/08/2026  
**Stato:** APPROVED FOR PLANNING / IMPLEMENTATION  
**Baseline:** questo addendum integra `FOOTBALL-PREDICTION-SYSTEM-MVP-BACKLOG.md` senza eliminare o indebolire alcun requisito MUST di SRS e Technical Design.

## Regola di tracciamento

Le modifiche concordate durante la UX review devono essere considerate backlog vincolante. In caso di conflitto con SRS/Technical Design, l'Orchestratore deve aprire una decisione/ADR e non modificare implicitamente la baseline.

# EPIC 0 — Research / decisioni aggiuntive

## US-0004 — Review metodologia S.A.C.R.A. applicata alle scommesse

**Priorità:** P0 discovery

### Task
- Studiare la metodologia S.A.C.R.A. indicata dall'utente e documentarne principi, input, processo decisionale e gestione del rischio.
- Mappare ogni principio sui moduli FPS: Prediction, Confidence/Data Quality, Value, Compatibility/Correlation e System Optimizer.
- Distinguere ciò che è metodo operativo/UX da ciò che introdurrebbe una nuova euristica quantitativa.
- Non incorporare automaticamente regole S.A.C.R.A. nel motore predittivo senza testabilità, versionamento e backtesting.
- Produrre ADR/nota tecnica con alternative, vantaggi/svantaggi, impatti e decisione.

### Acceptance criteria
- Esiste una review documentata della metodologia.
- Nessuna regola non riproducibile entra nel Prediction Engine.
- Eventuali regole adottate hanno configurazione/versione e strategia di test/backtest.

## US-0005 — Decisione provider/aggregatore quote

**Priorità:** P0/P1

### Task
- Valutare concretamente API-Football come sorgente odds già disponibile e alternative pertinenti.
- Verificare bookmaker coperti, mercati, frequenza aggiornamento, storico, limiti, pricing e licenza.
- Valutare due strategie: bookmaker di riferimento vs aggregazione multi-bookmaker.
- Valutare quota mediana di mercato come reference odds e best available odds come informazione separata.
- Documentare la decisione con ADR prima di rendere definitivo il Value Engine.

### Acceptance criteria
- Le quote non richiedono inserimento manuale nel normale flusso utente quando il provider le rende disponibili.
- Ogni quota conserva provider, bookmaker, mercato, selezione e timestamp.
- Probability, fair odds, market odds, best odds e Value restano concetti distinti.
- Nessuna quota mancante viene inventata.

# EPIC 3 — Provider reliability & caching

## US-0305 — Provider cache, deduplication e refresh on-demand

**Priorità:** MUST

### Task
- Cache per endpoint/provider con TTL configurabile.
- Deduplicazione delle richieste simultanee identiche.
- Retry/backoff e gestione esplicita HTTP 429.
- Stale fallback: in caso di rate limit/rete mostrare l'ultimo dato valido marcandolo chiaramente come cache/stale.
- Refresh manuale `Aggiorna ora` che bypassa volontariamente la cache senza resettare selezioni, filtri o navigazione.
- Mostrare timestamp/freschezza del dato in linguaggio comprensibile.
- Impedire crescita illimitata della cache browser e degli snapshot: pruning/LRU o strategia equivalente.

### Acceptance criteria
- Un render React non genera chiamate duplicate allo stesso endpoint.
- Il rate limit non svuota la UI se esiste un dato cache valido.
- Il refresh manuale non perde lo stato utente.
- `QuotaExceededError` del browser non blocca l'applicazione.
- Cache/stale/live sono distinguibili e nessun dato stale viene presentato come live.

# EPIC 6 — Compatibility gate preventivo

## US-0604 — Blocco incompatibilità prima dell'inserimento nel System Slip

**Priorità:** MUST / P0

### Regola funzionale
Prima di mutare il System Slip, ogni nuova selezione deve essere verificata dal Compatibility Engine contro TUTTE le selezioni già presenti.

### Acceptance criteria
- Se almeno una coppia è `INCOMPATIBLE`, la nuova selezione NON viene aggiunta.
- Il numero di selezioni resta invariato.
- La UI mostra un messaggio semplice con la selezione in conflitto e una motivazione comprensibile.
- Il controllo vale da Home, card partita, dettaglio, mercati e card in evidenza.
- Il backend/domain applica lo stesso vincolo: il controllo non è soltanto visuale.
- Le correlazioni NON vengono bloccate automaticamente: sono segnalate/classificate separatamente.
- Non è possibile generare o salvare una combinazione contenente selezioni incompatibili.
- E2E obbligatorio: `prima selezione -> seconda incompatibile -> blocco -> conteggio invariato`.

# EPIC 7 — System Flow v2

## US-0706 — Flusso Sistema lineare e autoesplicativo

**Priorità:** MUST / P0

### User flow normale
1. L'utente aggiunge pronostici compatibili.
2. Entra in `Sistema` e vede immediatamente le selezioni correnti.
3. Può rimuovere qualsiasi selezione direttamente dal Sistema.
4. Indica il budget tramite preset o valore personalizzato.
5. Sceglie un profilo comprensibile: Prudente / Bilanciato / Aggressivo.
6. Preme `Genera sistema`.
7. FPS propone la struttura e ne mostra lo sviluppo completo.
8. L'utente può salvare, simulare oppure indicare che il sistema è stato realmente giocato.

### Acceptance criteria
- Il percorso normale non richiede conoscenza di `N`, `K`, `minCorrect`, combinatoria o terminologia interna.
- Automatico/Assistito restano capacità di dominio, ma la UI normale non obbliga l'utente a scegliere una modalità tecnica prima di iniziare.
- La configurazione tecnica è disponibile tramite `Personalizza` / `Avanzato` con progressive disclosure.
- Budget e costo totale sono sempre visibili prima della conferma.
- Rimuovere una selezione invalida eventuali combinazioni calcolate su uno stato precedente.

## US-0707 — Sviluppo completo del sistema

**Priorità:** MUST / P0

### Task
Dopo `Genera sistema`, mostrare almeno:
- numero selezioni;
- struttura proposta (es. triple);
- numero combinazioni;
- stake per combinazione;
- investimento totale;
- profilo rischio/copertura;
- eventuali correlazioni rilevanti;
- quote disponibili e timestamp.

La sezione `Vedi sviluppo` deve rendere navigabili tutte le combinazioni generate.

### Acceptance criteria
- Ogni combinazione mostra le proprie selezioni con descrizioni comprensibili.
- Quando disponibili, mostra quota combinata e stake della combinazione.
- Lo sviluppo matematico corrisponde esattamente alle combinazioni generate dal dominio.
- Nessuna combinazione incompatibile è visualizzabile.
- La UI gestisce sistemi con molte combinazioni senza diventare un elenco ingestibile (accordion/paginazione/virtualizzazione o pattern equivalente).

## US-0708 — Quote automatiche nel System Slip e nello sviluppo

**Priorità:** SHOULD, anticipata per UX

### Acceptance criteria
- Le selezioni mostrano automaticamente la quota di mercato disponibile.
- La UI distingue chiaramente `Quota mercato`, eventuale `Migliore quota`, `Probabilità FPS` e `Value`.
- Se non esiste una quota affidabile, viene mostrato `Quota non disponibile`, senza placeholder inventati.
- Il refresh quote usa cache/rate-limit policy e può essere forzato on-demand.

# EPIC 13 — UX/UI Premium v2

## US-1307 — Information architecture semplificata

**Priorità:** MUST / P0

### Principi
- L'app deve essere comprensibile senza tutorial permanente.
- Se un controllo necessita di spiegazione esterna per essere usato, deve essere riprogettato.
- Microcopy orientata all'utente: evitare label tecniche come `HOME`, `AWAY`, `DQ`, `EV`, `minCorrect`, ecc. nel percorso base.
- Esempio: `AWAY` -> `Vince <squadra ospite>` quando semanticamente corretto.
- Dettagli quantitativi avanzati disponibili su richiesta.

### Acceptance criteria
- Flusso critico autoesplicativo: `trova partita -> capisci pronostico -> aggiungi/rimuovi -> sistema -> genera -> sviluppo`.
- Ogni azione produce feedback immediato e indica chiaramente il nuovo stato.
- Una selezione aggiunta è visivamente distinguibile e può essere deselezionata dallo stesso contesto.

## US-1308 — Home/Partite per giornate collassabili

**Priorità:** MUST / P0

### Task
- Organizzare le fixture principalmente per giornata di campionato quando `matchday` è disponibile dal provider.
- Ogni giornata mostra numero giornata e data/intervallo date.
- Giornate collassabili/espandibili.
- Dentro la giornata, raggruppamento temporale secondario quando utile.
- Righe/card partita compatte e facilmente scansionabili.
- Alternanza odd/even molto leggera o separatori equivalenti per migliorare la leggibilità.

### Acceptance criteria
- La UI non inventa il numero di giornata: usa il dato provider normalizzato quando disponibile.
- Stato aperto/chiuso è evidente e accessibile.
- Mobile mantiene touch target adeguati nonostante la maggiore densità.

## US-1309 — Home highlights fino a quattro pronostici

**Priorità:** MUST UX

### Categorie
- Più affidabile.
- Alternativa/Value quando applicabile.
- Sorpresa.
- Tentativo ad alta quota/mercato speciale quando statisticamente giustificato.

### Acceptance criteria
- Massimo quattro card; non è obbligatorio riempirle tutte.
- Ogni card mostra almeno partita, DATA/ORA, pronostico, probability e affidabilità in forma comprensibile.
- Risultato esatto/marcatore/mercati speciali possono comparire solo se prodotti dal motore e con dati sufficienti.
- Nessuna categoria viene riempita forzatamente in assenza di opportunità.

## US-1310 — Visual Design premium sportsbook/fintech

**Priorità:** MUST / P0

### Task
- Benchmark aggiornato di app betting/sportsbook professionali come pattern UX, senza copiarne il branding.
- Header/brand FPS riconoscibile.
- Hero o area editoriale/contestuale compatta quando utile, senza sottrarre spazio al task primario.
- Palette completa e semantic colors coerenti per tutte le sezioni.
- Typography scale più compatta e professionale.
- Spacing, radius, elevation, borders, chips, tabs, accordion, filter bar e system slip coerenti.
- Iconografia professionale e consistente.
- Stati selected/disabled/error/loading/empty/stale progettati.
- Desktop: System Slip/pannello laterale sticky quando lo spazio lo consente.
- Mobile: bottom navigation e System Slip persistente.
- Predisposizione dark/light coerente con Design System.

### Acceptance criteria
- Nessuna schermata core appare come elenco tecnico/basic.
- Colori e gerarchia hanno significato funzionale e non sono decorazione casuale.
- Font size e densità permettono scansione rapida di molte partite.
- Responsive verificato a 320px, mobile comune, tablet e desktop.
- Accessibilità/contrasto/focus verificati.

## US-1311 — Filtri semplificati con progressive disclosure

**Priorità:** MUST UX

### Filtri primari
- giornata/data;
- squadra;
- tipo pronostico/mercato;
- affidabilità minima.

### Acceptance criteria
- Filtri tecnici avanzati non affollano la schermata principale.
- Stato filtri attivi evidente e facilmente azzerabile.
- Cambiare filtro non perde le selezioni nel Sistema.

## US-1312 — Team naming e microcopy normalizzati

**Priorità:** SHOULD

### Acceptance criteria
- Nella UI compatta usare nomi squadra brevi e naturali (es. `Como`) quando non ambigui.
- Il nome completo resta disponibile dove necessario.
- Label tecniche provider non vengono esposte direttamente all'utente.

## US-1313 — Preseason UX trasparente

**Priorità:** MUST quando attiva

### Acceptance criteria
- Se la stagione corrente non offre dati sufficienti, l'eventuale uso di dati storici/scorsa stagione è dichiarato chiaramente.
- Il blending è deterministico, versionato e testabile.
- Dati mancanti non vengono inventati.
- Confidence/Data Quality riflettono l'incertezza aggiuntiva.
- L'utente non deve configurare parametri tecnici di blending nel percorso normale.

# EPIC 14 — Desktop development experience

## US-1404 — Runtime browser per test UX

**Priorità:** SHOULD / developer experience

### Task
- Entry desktop/browser separata quando necessario.
- Storage browser senza dipendenza obbligatoria da `jeep-sqlite` per il test UX.
- Proxy dev per provider che non accettano l'origin Vite/CORS.
- Credenziali di sviluppo solo da `.env.local`/secret non versionati.

### Acceptance criteria
- La stessa UI può essere testata da browser desktop senza modificare il comportamento Android production.
- Nessun secret viene committato.
- Cache browser ha limiti/pruning e non satura `localStorage`.

# EPIC 15 — E2E aggiuntivi obbligatori

## US-1504 — E2E UX/System Flow v2

**Priorità:** MUST

### Flussi minimi
1. Home -> giornata -> partita -> aggiungi -> stato selezionato.
2. Selezione -> tap rimozione -> conteggio aggiornato.
3. Prima selezione -> seconda `INCOMPATIBLE` -> blocco preventivo -> seconda NON presente nello slip.
4. Correlazione -> avviso/classificazione -> nessun blocco automatico salvo diversa regola documentata.
5. Sistema -> rimuovi selezione -> combinazioni precedenti invalidate.
6. Budget + profilo rischio -> genera -> numero combinazioni/costo totale corretti.
7. `Vedi sviluppo` -> elenco combinazioni coerente col dominio.
8. 429 provider -> stale cache disponibile -> UI utilizzabile.
9. Refresh on-demand -> dati aggiornati senza perdita di selezioni/filtri.
10. Responsive 320/mobile/tablet/desktop.

# Ordine di implementazione dell'addendum

1. Chiudere US-0004 (review S.A.C.R.A.) e US-0005 (odds decision) con ADR/nota tecnica.
2. US-0604 Compatibility gate preventivo.
3. US-0706 System Flow v2.
4. US-0707 sviluppo completo sistema.
5. US-0305 caching/reliability e refresh.
6. US-0708 quote automatiche dopo decisione provider odds.
7. US-1307..US-1313 UX/UI premium e semplificazione completa.
8. US-1404 desktop developer experience.
9. US-1504 E2E e quality gate.

# Gate specifico prossima release

La prossima release UX/System NON può essere considerata completata se:
- una selezione incompatibile riesce anche temporaneamente a entrare nel System Slip;
- dal Sistema non è possibile rimuovere una selezione;
- lo sviluppo delle combinazioni non è visibile;
- costo totale/budget non sono chiari prima della conferma;
- quote mancanti vengono inventate o confuse con Probability;
- refresh/provider error azzerano lo stato utente senza necessità;
- le giornate non sono navigabili/collassabili;
- microcopy tecnica rende il flusso incomprensibile a un nuovo utente;
- la UI non supera i gate responsive/accessibilità/quality previsti dal backlog principale.
