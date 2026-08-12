# Football Prediction & Betting System — Software Requirements Specification

**Documento master per agenti AI e sviluppo**  
**Versione:** 1.0  
**Data:** 12/08/2026  
**Stato:** Baseline iniziale

---

## 1. Scopo

Realizzare una web application professionale, mobile-first, dedicata all'analisi probabilistica delle partite di calcio e alla costruzione/gestione di pronostici e sistemi di scommessa.

L'applicazione NON deve limitarsi a fornire pronostici 1X2: deve analizzare i principali mercati calcistici, inclusi mercati squadra, partita e giocatore, produrre probabilità motivate, individuare value bet, impedire combinazioni incompatibili, controllare le correlazioni e consentire la costruzione automatica, assistita o manuale di sistemi.

L'applicazione deve inoltre conservare lo storico dei pronostici e delle scommesse realmente giocate, verificarne automaticamente gli esiti e utilizzare lo storico per misurare e migliorare le performance del motore predittivo.

> Principio fondamentale: il prodotto deve presentare **probabilità e livelli di affidabilità**, mai certezze di vincita.

---

## 2. Principi di prodotto non negoziabili

1. **Probability first** — ogni pronostico deve essere espresso come probabilità stimata.
2. **No Bet è un risultato valido** — il sistema non deve generare giocate solo per riempire una schedina.
3. **Trasparenza** — deve essere possibile comprendere perché un pronostico è stato prodotto.
4. **Value ≠ probabilità** — probabilità di successo e convenienza economica devono essere metriche distinte.
5. **Qualità del dato** — confidence e raccomandazioni devono tenere conto della completezza/attualità dei dati.
6. **Controllo rischio** — incompatibilità, correlazioni ed esposizione devono essere gestite esplicitamente.
7. **Validazione** — backtesting e paper trading devono precedere qualsiasi valutazione di affidabilità del modello.
8. **Snapshot immutabili** — una previsione storica non deve essere riscritta dopo aver conosciuto il risultato.
9. **UI/UX premium** — l'interfaccia è un requisito di prodotto di primo livello, non una rifinitura successiva.
10. **Provider abstraction** — i provider dati devono poter essere sostituiti senza riscrivere il dominio applicativo.

---

## 3. Obiettivi principali

- Acquisire automaticamente eventi calcistici e dati statistici.
- Analizzare forma, classifica, rendimento casa/trasferta, statistiche offensive/difensive, xG quando disponibile, assenze, squalifiche, probabili formazioni e statistiche giocatore.
- Stimare probabilità per i principali mercati.
- Stimare probabilità relative a singoli giocatori, incluso il marcatore.
- Confrontare probabilità modello e quote bookmaker.
- Identificare value bet.
- Costruire sistemi integrali, ridotti, ponderati e con fisse.
- Bloccare selezioni incompatibili.
- Identificare e gestire selezioni correlate.
- Ottimizzare un sistema in funzione di budget e profilo di rischio.
- Simulare sistemi prima dell'utilizzo.
- Registrare separatamente pronostici, simulazioni e scommesse realmente giocate.
- Verificare automaticamente gli esiti delle scommesse giocate.
- Misurare performance predittive ed economiche.
- Utilizzare lo storico per calibrare e migliorare gli algoritmi.

---

## 4. Esperienza utente e UI/UX

### 4.1 Requisito generale

**UX-001 — MUST**  
L'app deve avere un'interfaccia comparabile per qualità percepita a una moderna applicazione professionale consumer/sportsbook.

La progettazione deve precedere l'implementazione. Ogni componente deve essere deliberatamente progettato: gerarchia, spacing, tipografia, dimensioni touch, icone, stati, transizioni, feedback, loading, empty state, error state, disabled state, responsive behavior e accessibilità.

### 4.2 Principi UX

- Mobile-first.
- Utilizzabile comodamente con una mano.
- Riduzione del carico cognitivo.
- Progressive disclosure: mostrare subito ciò che serve e rendere disponibili i dettagli su richiesta.
- Nessuna schermata deve sembrare un gestionale tecnico.
- Le informazioni statistiche avanzate devono essere leggibili anche da un utente non tecnico.
- Navigazione coerente tra mobile, tablet e desktop.
- Dark mode e light mode predisposte.
- Interazioni rapide per aggiungere/rimuovere una selezione dal sistema.
- Feedback immediato su incompatibilità e correlazioni.

### 4.3 Navigazione principale proposta

- **Pronostici**
- **Partite**
- **Crea Sistema**
- **I miei sistemi**
- **Storico**
- **Statistiche**

La struttura finale dovrà essere validata durante la fase UX.

### 4.4 Card partita

La card deve mostrare in modo sintetico almeno:

- squadre;
- competizione;
- data/ora;
- stato evento;
- migliori pronostici suggeriti;
- probabilità;
- confidence;
- eventuale indicatore Value;
- accesso al dettaglio partita;
- azione `+ Sistema`.

### 4.5 Dettaglio partita

I mercati devono essere organizzati per categorie facilmente navigabili, ad esempio:

- Esito
- Gol
- Combinazioni
- Giocatori
- Marcatori
- Corner
- Cartellini
- Altri mercati

Devono essere disponibili anche statistiche e motivazioni del modello senza sovraccaricare la schermata principale.

---

## 5. Acquisizione dati

### FR-DATA-001 — MUST
Il sistema deve caricare automaticamente gli eventi dai provider configurati.

### FR-DATA-002 — MUST
Ogni evento deve avere un identificativo interno e il riferimento all'ID evento del provider.

### FR-DATA-003 — MUST
Il sistema deve poter acquisire, quando disponibili:

- fixture;
- risultati;
- classifiche;
- forma recente;
- statistiche squadra;
- statistiche casa/trasferta;
- gol fatti/subiti;
- xG e metriche avanzate;
- H2H;
- lineup;
- probabili formazioni;
- infortuni;
- squalifiche;
- statistiche giocatore;
- eventi partita;
- corner;
- cartellini;
- tiri e tiri in porta;
- quote bookmaker.

### FR-DATA-004 — MUST
L'applicazione deve utilizzare un adapter/provider abstraction layer.

Interfaccia concettuale:

```text
FootballDataProvider
  getFixtures()
  getFixture()
  getStandings()
  getTeamStats()
  getLineups()
  getInjuries()
  getMatchEvents()
  getPlayerStats()
  getOdds()
```

Il dominio non deve dipendere direttamente da uno specifico provider.

### FR-DATA-005 — SHOULD
Supportare più provider e fallback futuro.

---

## 6. Prediction Engine

### FR-PRED-001 — MUST
Il motore deve produrre probabilità, non semplici etichette di pronostico.

### FR-PRED-002 — MUST
Tra i fattori devono poter rientrare:

- forma recente;
- classifica e punti/partita;
- forza relativa;
- casa/trasferta;
- gol fatti/subiti;
- statistiche offensive/difensive;
- xG/xGA quando disponibili;
- qualità dell'avversario;
- indisponibili;
- squalifiche;
- probabili formazioni;
- giorni di riposo;
- H2H con peso controllato;
- momentum;
- metriche individuali dei giocatori.

### FR-PRED-003 — MUST
Il motore deve produrre un **Confidence Score** separato dalla probabilità.

### FR-PRED-004 — MUST
La confidence deve diminuire quando i dati sono incompleti, vecchi o incerti.

### FR-PRED-005 — MUST
Il sistema deve poter restituire `NO BET` quando non sono soddisfatte le soglie minime.

### FR-PRED-006 — SHOULD
Prevedere più modelli, tra cui:

- Poisson / goal distribution;
- rating/Elo o equivalente;
- modello statistico/ML;
- ensemble/model consensus.

### FR-PRED-007 — SHOULD
Il disaccordo tra modelli deve ridurre la confidence.

### FR-PRED-008 — MUST
Ogni previsione deve memorizzare la versione del modello che l'ha generata.

---

## 7. Mercati supportati

### 7.1 MVP / Core

- 1X2
- Doppia chance 1X / X2 / 12
- Draw No Bet
- Goal / No Goal
- Over/Under 0.5 / 1.5 / 2.5 / 3.5 / 4.5
- Team Over/Under
- Risultato esatto
- Multigol
- Clean sheet
- Vittoria a zero
- Margine di vittoria
- Gol pari/dispari
- 1X2 + Over/Under
- 1X2 + Goal/No Goal
- mercati primo tempo compatibili con i dati disponibili

### 7.2 Mercati giocatore

- Marcatore in qualsiasi momento
- 2+ gol
- Primo/ultimo marcatore in fase successiva
- Tiro in porta
- Numero tiri
- Assist, se supportato dal provider

### 7.3 Mercati statistici

- Corner
- Cartellini
- ulteriori mercati basati su statistiche granulari se supportati dal provider

### FR-MKT-001 — MUST
Un mercato deve essere attivabile solo se sono disponibili dati sufficienti per modellazione e settlement.

---

## 8. Player & Scorer Engine

### FR-PLAYER-001 — MUST
Stimare la probabilità che un determinato giocatore segni almeno un gol.

### FR-PLAYER-002 — MUST
Considerare almeno:

- probabilità di titolarità;
- minuti attesi;
- ruolo;
- rigori;
- piazzati;
- gol/90;
- xG/90 quando disponibile;
- tiri/90;
- tiri in porta;
- forma recente;
- forza difensiva avversaria;
- expected goals della squadra;
- quota di xG/gol del giocatore nella squadra.

### FR-PLAYER-003 — MUST
Le probabilità dei giocatori devono essere coerenti con la distribuzione dei gol prevista per la squadra.

### FR-PLAYER-004 — SHOULD
Supportare sensitivity analysis, ad esempio:

```text
Probabilità marcatore se titolare: 47%
Se minuti attesi = 60: 38%
Se non rigorista: 35%
```

---

## 9. Value Engine

### FR-VALUE-001 — MUST
Calcolare la quota equa:

```text
fair_odds = 1 / model_probability
```

### FR-VALUE-002 — MUST
Confrontare quota equa e quota bookmaker.

### FR-VALUE-003 — MUST
Probabilità e Value devono essere presentati separatamente.

### FR-VALUE-004 — SHOULD
Calcolare Expected Value e un indicatore sintetico `Pick Score`.

Il Pick Score può considerare:

- probabilità;
- confidence;
- data quality;
- expected value;
- affidabilità storica del mercato;
- correlazione;
- stabilità del pronostico.

---

## 10. Market Compatibility Engine

### FR-COMP-001 — MUST
Il sistema deve impedire combinazioni logicamente incompatibili.

Esempi:

- Over 3.5 + Under 2.5;
- Goal + No Goal;
- risultato esatto 1-0 + Goal;
- risultato esatto 1-0 + Over 2.5;
- squadra non segna + giocatore della stessa squadra marcatore;
- primo tempo Under 0.5 + giocatore marcatore nel primo tempo.

### FR-COMP-002 — MUST
Le incompatibilità devono essere gestite tramite regole/tassonomia di dominio, non tramite `if` distribuiti nell'interfaccia.

### FR-COMP-003 — MUST
Una selezione incompatibile non deve mai essere inserita automaticamente in un sistema.

### FR-COMP-004 — MUST
Se l'utente tenta manualmente l'inserimento, la UI deve spiegare chiaramente quale selezione genera il conflitto.

---

## 11. Correlation Engine

### FR-CORR-001 — MUST
Distinguere incompatibilità da correlazione.

Esempio:

```text
Inter vince + Lautaro segna
```

è possibile ma correlato.

### FR-CORR-002 — MUST
Classificare almeno:

- incompatibile;
- alta correlazione;
- compatibile/diversificata.

### FR-CORR-003 — SHOULD
Produrre un correlation score quantitativo.

### FR-CORR-004 — MUST
I sistemi automatici prudenti devono penalizzare/escludere correlazioni elevate.

### FR-CORR-005 — SHOULD
Controllare anche la concentrazione per:

- stessa partita;
- stessa squadra;
- stesso campionato;
- stessa tipologia di mercato;
- mercati giocatore.

---

## 12. System Builder

L'app deve offrire tre modalità.

### 12.1 Automatico

L'utente indica principalmente:

- campionati/eventi;
- budget;
- profilo di rischio.

Il motore seleziona pronostici e costruisce il sistema.

### 12.2 Assistito

L'utente sceglie i pronostici; l'app decide come combinarli e suggerisce la struttura ottimale.

### 12.3 Manuale

L'utente controlla:

- selezioni;
- fisse;
- singole;
- doppie;
- triple;
- quadruple;
- quintuple;
- combinazioni superiori;
- importi.

### FR-SYS-001 — MUST
Supportare sistemi integrali.

Esempio:

```text
6 pronostici / triple
C(6,3) = 20 combinazioni
```

### FR-SYS-002 — MUST
Mostrare numero combinazioni e investimento totale prima della conferma.

### FR-SYS-003 — SHOULD
Supportare sistemi ridotti.

### FR-SYS-004 — SHOULD
Supportare sistemi ponderati sulla qualità delle selezioni.

### FR-SYS-005 — MUST
Supportare selezioni `FISSE`.

### FR-SYS-006 — MUST
L'interfaccia semplice non deve richiedere all'utente di conoscere la matematica dei sistemi.

### FR-SYS-007 — MUST
L'utente deve poter indicare:

- numero di pronostici;
- numero minimo di pronostici corretti desiderato;
- budget.

Il sistema deve proporre lo sviluppo appropriato e spiegare la copertura.

> Nota: “copertura” significa presenza di combinazioni vincenti al verificarsi delle condizioni previste; non equivale a garanzia di profitto economico.

---

## 13. System Optimizer

### FR-OPT-001 — MUST
Prevedere profili almeno:

- Prudente
- Bilanciato
- Aggressivo

### FR-OPT-002 — SHOULD
Dato un budget massimo, scegliere automaticamente struttura, combinazioni e distribuzione delle puntate.

### FR-OPT-003 — MUST
Non abbassare automaticamente le soglie qualitative solo per raggiungere un numero richiesto di selezioni.

Se non esistono abbastanza opportunità valide, il sistema deve dichiararlo.

### FR-OPT-004 — SHOULD
Funzione `Migliora il mio sistema` con suggerimenti What-if.

Esempio:

```text
Rimuovendo selezione X: rischio -12%
Sostituendo 1 con 1X: probabilità di ritorno +7%, payout potenziale -9%
```

### FR-OPT-005 — SHOULD
Funzione `Trova alternative` per suggerire mercati migliori sulla stessa partita.

---

## 14. Simulazione Monte Carlo

### FR-SIM-001 — SHOULD
Simulare un sistema prima di salvarlo/giocarlo utilizzando le probabilità del modello.

Metriche possibili:

- investimento;
- probabilità di ritorno;
- probabilità di profitto;
- perdita massima;
- distribuzione ritorni;
- rendimento mediano;
- profilo di rischio.

---

## 15. Storico pronostici e scommesse

### FR-HIST-001 — MUST
Ogni pronostico/sistema salvato deve essere conservato nello storico.

### FR-HIST-002 — MUST
L'utente deve poter indicare se il sistema/pronostico è stato **realmente giocato**.

Campo concettuale:

```text
played = true | false
```

### FR-HIST-003 — MUST
Per una giocata reale devono poter essere memorizzati almeno:

- bookmaker;
- quota effettiva;
- stake/importo;
- data/ora giocata;
- eventuali note.

### FR-HIST-004 — MUST
Distinguere chiaramente:

- pronostico;
- simulazione/paper bet;
- scommessa realmente giocata.

### FR-HIST-005 — MUST
Lo storico deve offrire filtri almeno per:

- periodo;
- competizione;
- squadra;
- mercato;
- giocata/non giocata;
- esito;
- bookmaker;
- sistema/singola.

---

## 16. Settlement automatico delle giocate

### 16.1 Principio operativo richiesto

La data dell'evento viene utilizzata come trigger per individuare ciò che deve essere verificato.

### FR-SET-001 — MUST
Il processo deve selezionare esclusivamente eventi/scommesse che soddisfano entrambe le condizioni:

```text
event_datetime < current_datetime
AND
verification_status = PENDING
```

### FR-SET-002 — MUST
Per evitare controlli mentre una partita è ancora normalmente in corso, deve essere configurabile un margine temporale successivo all'orario previsto di inizio.

Esempio calcio:

```text
event_datetime + 2h30 <= current_datetime
```

### FR-SET-003 — MUST
Gli eventi già verificati NON devono essere riprocessati.

```text
verification_status = VERIFIED
=> skip
```

### FR-SET-004 — MUST
Quando l'evento è eleggibile alla verifica, recuperare i dati necessari dal provider e determinare l'esito delle selezioni collegate.

### FR-SET-005 — MUST
Stati minimi della selezione:

- PENDING
- WIN
- LOSS
- VOID
- PARTIAL_WIN, se richiesto dal mercato
- PARTIAL_LOSS, se richiesto dal mercato

### FR-SET-006 — MUST
Dopo settlement definitivo:

```text
verification_status = VERIFIED
settled_at = timestamp
```

La giocata non deve più entrare nei normali cicli di verifica.

### FR-SET-007 — MUST
Una partita deve essere acquisita/consolidata una volta e riutilizzata per tutte le selezioni collegate, evitando chiamate duplicate al provider.

### FR-SET-008 — SHOULD
Prevedere un comando amministrativo `force refresh` per casi eccezionali di rettifica del dato ufficiale.

### FR-SET-009 — MUST
Il settlement deve conoscere la semantica del mercato (ad esempio 90 minuti vs eventuali supplementari) e non basarsi genericamente sul solo punteggio finale.

---

## 17. Snapshot e audit delle prediction

### FR-AUDIT-001 — MUST
Al momento della generazione di una prediction salvare uno snapshot immutabile contenente almeno:

- timestamp;
- evento;
- mercato;
- selezione;
- probabilità;
- confidence;
- data quality;
- quota disponibile, se presente;
- fair odds;
- value/EV;
- versione modello;
- principali feature/input utilizzati;
- motivazione sintetica.

### FR-AUDIT-002 — MUST
Lo snapshot storico non deve essere sovrascritto dopo il risultato.

---

## 18. Performance: separazione Model vs Betting

### 18.1 Model Performance

Deve misurare **tutte le prediction generate**, indipendentemente dal fatto che siano state realmente giocate.

### FR-PERF-001 — MUST
Metriche almeno per:

- mercato;
- campionato;
- fascia di probabilità;
- confidence;
- versione modello;
- periodo.

### FR-PERF-002 — MUST
Valutare la **calibrazione probabilistica**.

Esempio: eventi classificati ~80% dovrebbero verificarsi approssimativamente nell'80% dei casi su campioni sufficientemente grandi.

### 18.2 Betting Performance

Deve utilizzare esclusivamente le scommesse con `played = true`.

### FR-PERF-003 — MUST
Metriche economiche almeno:

- profit/loss;
- ROI;
- yield;
- win rate;
- quota media;
- max drawdown;
- performance per mercato;
- performance per campionato;
- sistemi vs singole;
- bookmaker, se utile.

### FR-PERF-004 — SHOULD
Misurare Closing Line Value quando sono disponibili quote storicizzate sufficienti.

---

## 19. Apprendimento e miglioramento algoritmo

### FR-LEARN-001 — MUST
Conservare il dataset:

```text
input disponibili al momento
→ prediction
→ confidence
→ quota
→ risultato reale
→ errore modello
```

### FR-LEARN-002 — MUST
Non utilizzare esclusivamente le scommesse realmente giocate per valutare/addestrare il modello, per evitare selection bias.

### FR-LEARN-003 — SHOULD
Produrre analisi degli errori per mercato, competizione, squadra e tipologia di giocatore.

### FR-LEARN-004 — MUST
Qualunque retraining/calibrazione deve essere versionato e confrontabile con il modello precedente.

---

## 20. Backtesting

### FR-BACK-001 — MUST
Il sistema deve poter essere testato su stagioni storiche.

### FR-BACK-002 — MUST
Durante il backtest, per una partita storica il modello deve poter utilizzare esclusivamente dati che sarebbero stati disponibili prima dell'inizio di quella partita.

**È vietato il data leakage.**

### FR-BACK-003 — MUST
Confrontare almeno:

- accuratezza/calibrazione;
- performance per mercato;
- ROI simulato;
- yield;
- drawdown;
- stabilità temporale;
- performance per confidence band.

---

## 21. Paper Trading

### FR-PAPER-001 — MUST
Prevedere modalità con capitale virtuale.

### FR-PAPER-002 — MUST
Le giocate virtuali devono essere sottoposte allo stesso settlement delle giocate reali.

### FR-PAPER-003 — MUST
Metriche almeno:

- capitale iniziale/attuale;
- numero sistemi;
- P/L;
- ROI;
- yield;
- max drawdown;
- win rate;
- CLV se disponibile.

---

## 22. Last Minute Recheck

### FR-RECHECK-001 — SHOULD
Prima della partita il sistema deve poter ricalcolare una prediction in presenza di nuovi dati rilevanti.

Esempi:

- formazione ufficiale;
- titolare escluso;
- cambio portiere;
- variazione ruolo/rigorista;
- infortunio;
- forte movimento quota.

### FR-RECHECK-002 — SHOULD
Se una prediction presente in sistemi salvati cambia significativamente, deve essere evidenziata.

---

## 23. Timing Engine

### FR-TIME-001 — SHOULD
Storicizzare l'evoluzione di probabilità e quote nel tempo.

### FR-TIME-002 — SHOULD
Consentire analisi sul momento migliore in cui una selezione avrebbe avuto valore.

---

## 24. Market Reliability

### FR-REL-001 — SHOULD
Ogni tipologia di mercato deve avere un'affidabilità storica del modello.

Il System Optimizer deve poter privilegiare mercati sui quali il modello ha dimostrato migliore calibrazione/stabilità.

---

## 25. AI Analyst

### FR-AI-001 — SHOULD
L'utente deve poter chiedere spiegazioni in linguaggio naturale, ad esempio:

```text
Perché consigli Under 3.5?
```

### FR-AI-002 — MUST
L'AI deve spiegare una prediction prodotta dal motore utilizzando dati realmente disponibili. Non deve inventare autonomamente il pronostico o statistiche mancanti.

---

## 26. Data Quality

### FR-DQ-001 — MUST
Definire un `Data Quality Score`.

Può considerare:

- completezza;
- freschezza;
- lineup disponibili;
- injury data;
- quantità di storico;
- affidabilità provider;
- copertura del mercato.

### FR-DQ-002 — MUST
Data Quality deve influenzare Confidence e possibilità di generare una raccomandazione.

---

## 27. Modello dati concettuale minimo

Entità principali previste:

```text
Competition
Season
Team
Player
Fixture
FixtureResult
TeamStatistics
PlayerStatistics
Lineup
Injury
Suspension
Bookmaker
Market
MarketSelection
OddsSnapshot
Prediction
PredictionSnapshot
ModelVersion
System
SystemSelection
SystemCombination
Bet
BetSelection
Settlement
Simulation
BacktestRun
ModelPerformance
BettingPerformance
```

La progettazione DB definitiva deve essere svolta dopo la selezione dei provider e la definizione dell'MVP.

---

## 28. Sicurezza e qualità tecnica

### NFR-001 — MUST
Separazione tra frontend, dominio, prediction engine e provider adapter.

### NFR-002 — MUST
Logging strutturato delle elaborazioni critiche.

### NFR-003 — MUST
Idempotenza dei job di settlement.

### NFR-004 — MUST
Le elaborazioni automatiche non devono duplicare sistemi, prediction o settlement.

### NFR-005 — MUST
Gestione timezone coerente; persistenza preferibilmente UTC e visualizzazione nella timezone dell'evento/utente.

### NFR-006 — MUST
Responsive almeno smartphone, tablet e desktop.

### NFR-007 — MUST
Accessibilità dei principali controlli e flussi.

### NFR-008 — SHOULD
Caching e deduplicazione delle richieste provider per contenere costi e rate limit.

### NFR-009 — MUST
Test automatici per Market Compatibility e Settlement Engine.

### NFR-010 — MUST
Le regole matematiche dei sistemi devono avere test deterministici.

---

## 29. MVP proposto

L'MVP deve essere sufficientemente piccolo da consentire validazione reale del modello ma progettato per l'estensione futura.

### MVP — MUST

1. Un campionato iniziale (preferibilmente Serie A).
2. Import automatico fixture/risultati/classifica/statistiche.
3. Prediction Engine iniziale.
4. 1X2.
5. Doppia chance.
6. Goal/No Goal.
7. Over/Under principali.
8. Team Over/Under.
9. Marcatore, se il provider selezionato garantisce dati adeguati.
10. Probability + Confidence + Data Quality.
11. No Bet.
12. Quote e fair odds, se disponibili.
13. Value Engine base.
14. Aggiunta rapida al sistema.
15. Sistema integrale.
16. Modalità Assistita.
17. Fisse.
18. Compatibility Engine.
19. Correlation Engine iniziale.
20. Storico.
21. Flag `Giocata realmente`.
22. Settlement automatico.
23. Separazione Model Performance / Betting Performance.
24. Paper trading.
25. Backtesting.
26. UI/UX professionale mobile-first.

### Post-MVP

- sistemi ridotti;
- sistemi ponderati;
- optimizer avanzato;
- Monte Carlo;
- ML ensemble;
- corner/cartellini completi;
- player props avanzate;
- Last Minute Recheck;
- Timing Engine;
- CLV;
- What-if;
- AI Analyst;
- notifiche.

---

## 30. Roadmap progettuale obbligatoria

Gli agenti devono procedere nell'ordine seguente, salvo motivazione tecnica documentata:

1. **Analisi e consolidamento requisiti**
2. **Definizione MVP**
3. **Analisi e selezione provider/API**
4. **Data model**
5. **Progettazione Prediction Engine**
6. **Progettazione Compatibility/Correlation Engine**
7. **Progettazione System Builder/Optimizer**
8. **Architettura applicativa**
9. **UX research e benchmark**
10. **Information architecture e user flow**
11. **Wireframe**
12. **Visual design / design system**
13. **Prototipo responsive**
14. **Implementazione**
15. **Test**
16. **Backtesting**
17. **Paper trading**
18. **Calibrazione**
19. **Estensione mercati/campionati**

Non iniziare l'implementazione completa prima di aver validato almeno provider, data model, Prediction Engine concettuale e principali user flow.

---

## 31. Istruzioni per gli agenti AI

### AGENT-001
Questo documento costituisce la baseline funzionale. Gli agenti possono proporre miglioramenti, ma **non devono eliminare o semplificare requisiti MUST per comodità implementativa**.

### AGENT-002
Qualunque assunzione non specificata deve essere esplicitata.

### AGENT-003
Le decisioni architetturali rilevanti devono includere almeno:

- alternative considerate;
- vantaggi/svantaggi;
- costo/complessità;
- impatto futuro;
- decisione proposta.

### AGENT-004
Prima di scegliere un provider dati, verificare concretamente:

- copertura competizioni;
- profondità storica;
- fixture;
- risultati;
- statistiche squadra;
- statistiche giocatore;
- lineup;
- infortuni/squalifiche;
- xG;
- corner;
- cartellini;
- tiri/tiri in porta;
- eventi gol/assist;
- odds;
- limiti API;
- pricing;
- termini/licenze di utilizzo.

### AGENT-005
Per la UX/UI effettuare benchmark aggiornato di applicazioni sportive e sportsbook professionali. Il benchmark deve servire a individuare pattern UX efficaci, **non a copiare branding o visual identity**.

### AGENT-006
Ogni schermata deve essere progettata nei dettagli prima dell'implementazione definitiva.

### AGENT-007
La semplicità d'uso ha priorità sulla quantità di informazioni visualizzate contemporaneamente.

### AGENT-008
Qualunque algoritmo deve essere testabile e misurabile. Non introdurre euristiche prive di possibilità di backtesting.

### AGENT-009
Prediction e spiegazione AI devono essere separate: il modello quantitativo produce la previsione; l'AI può spiegarla e sintetizzarla.

### AGENT-010
Nessuna performance deve essere dichiarata senza dati di backtest/paper trading sufficienti.

---

## 32. Acceptance criteria trasversali

Il prodotto non può essere considerato pronto per una release reale se non sono soddisfatti almeno i seguenti criteri:

- gli eventi vengono caricati automaticamente;
- le prediction sono riproducibili e versionate;
- probability e confidence sono distinte;
- le incompatibilità sono bloccate;
- le correlazioni principali sono identificate;
- i sistemi producono matematicamente le combinazioni attese;
- il costo totale del sistema è calcolato correttamente;
- lo storico distingue giocato/non giocato;
- le giocate passate PENDING vengono verificate automaticamente;
- le giocate VERIFIED non vengono riprocessate;
- il settlement è testato per i mercati supportati;
- Model Performance e Betting Performance sono separate;
- il backtest non utilizza dati futuri;
- la UI è responsive e validata sui principali flussi mobile;
- il sistema può dichiarare `NO BET`;
- il sistema non inventa dati mancanti.

---

## 33. Decisioni già assunte

- Il documento Markdown è il **master ufficiale** dei requisiti.
- L'app deve essere mobile-first e avere qualità grafica professionale.
- Non sarà limitata all'1X2.
- Saranno supportati mercati giocatore, incluso il marcatore.
- È prevista una sezione dedicata alla costruzione dei sistemi.
- Devono essere disponibili modalità Automatica, Assistita e Manuale.
- Devono essere gestite fisse, combinazioni e sistemi integrali; sistemi ridotti/ponderati sono previsti nell'evoluzione.
- Le selezioni incompatibili devono essere impedite.
- Le selezioni correlate devono essere riconosciute e gestite.
- Lo storico deve distinguere le scommesse realmente giocate.
- Le giocate devono essere verificate automaticamente una volta trascorso l'evento.
- Gli eventi già verificati non devono essere riprocessati.
- Lo storico completo delle prediction deve alimentare la misurazione e il miglioramento dell'algoritmo.
- Le performance del modello devono rimanere separate dalle performance delle sole scommesse effettivamente giocate.

---

## 34. Nota finale

La priorità del progetto non è generare il maggior numero possibile di pronostici, ma costruire un motore **misurabile, calibrato, spiegabile e progressivamente migliorabile**, presentato attraverso un'esperienza utente estremamente semplice e professionale.

L'architettura deve quindi favorire fin dall'inizio:

**Data Engine → Prediction Engine → Player Engine → Market Engine → Compatibility/Correlation Engine → Value Engine → System Builder/Optimizer → Simulation → Settlement → Performance → Backtesting/Learning → AI Analyst**.
