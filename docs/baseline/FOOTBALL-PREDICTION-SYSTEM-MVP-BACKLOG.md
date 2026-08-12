# Football Prediction System — MVP Backlog

**Documento operativo per orchestratore e agenti AI**  
**Versione:** 1.0  
**Data:** 12/08/2026  
**Stato:** Ready for implementation planning  
**Documenti sorgente vincolanti:**
- `FOOTBALL-PREDICTION-SYSTEM-SRS.md`
- `FOOTBALL-PREDICTION-SYSTEM-TECHNICAL-DESIGN.md`

---

## 1. Scopo del documento

Questo backlog trasforma SRS e Technical Design in un piano di lavoro eseguibile. Gli agenti devono rispettare i requisiti dei documenti sorgente e non eliminare, semplificare o reinterpretare requisiti MUST per comodità implementativa.

L'obiettivo della prima release è produrre un MVP tecnicamente solido, con UI/UX professionale, capace di:

- acquisire automaticamente fixture e dati calcistici;
- generare pronostici probabilistici;
- supportare i mercati MVP;
- gestire selezioni e sistemi;
- bloccare incompatibilità e gestire correlazioni;
- conservare storico di prediction e giocate reali;
- verificare automaticamente le giocate concluse;
- misurare performance del modello e performance economiche separatamente;
- eseguire backtesting e paper trading.

---

## 2. Regole operative per gli agenti

1. SRS e Technical Design sono vincolanti.
2. Ogni modifica architetturale significativa deve essere documentata tramite ADR o nota tecnica equivalente.
3. UI/UX non deve essere implementata senza una fase preliminare di benchmark e design.
4. Il codice di dominio non deve dipendere direttamente da uno specifico provider esterno.
5. Prediction storiche e dati usati per il backtesting devono essere immutabili/versionati.
6. Il Settlement Engine deve essere idempotente.
7. Un evento già verificato non deve essere riprocessato salvo esplicito `force refresh` amministrativo.
8. Il motore deve poter restituire `NO_BET`.
9. Nessuna selezione logicamente incompatibile deve poter entrare nella stessa combinazione.
10. Le correlazioni devono essere trattate separatamente dalle incompatibilità.
11. I dati mancanti devono ridurre la confidence; non devono essere sostituiti da valori inventati.
12. Le performance devono essere misurate separatamente per modello e scommesse realmente giocate.
13. Tutti i calcoli probabilistici devono essere testabili e riproducibili.
14. Le quote bookmaker non devono essere confuse con la probabilità del modello.
15. La UI deve essere mobile-first e comparabile per qualità percepita a una moderna app consumer/sportsbook.

---

## 3. Definition of Done globale

Una story è completata solo se:

- implementazione terminata;
- test automatici pertinenti presenti e verdi;
- error handling implementato;
- logging minimo presente dove necessario;
- acceptance criteria verificati;
- UI verificata almeno a 320 px, mobile comune, tablet e desktop per le story frontend;
- nessun requisito MUST correlato risulta regressivo;
- eventuale documentazione tecnica aggiornata;
- lint/typecheck/build passano;
- nessun dato sensibile o API key è committato nel repository.

---

# EPIC 0 — Product, Provider & UX Foundation

**Priorità:** P0 — bloccante  
**Obiettivo:** chiudere le decisioni necessarie prima dello sviluppo core.

## US-0001 — Confronto provider dati calcistici

**Priorità:** MUST  
**Dipendenze:** nessuna

### Task
- Confrontare almeno API-Football e Sportmonks e, se utile, un terzo provider.
- Valutare copertura per fixture, standings, forma, statistiche squadra, player stats, injuries, suspensions, lineups, goalscorer data, corner, cards, shots, odds e storico.
- Verificare rate limit, costo, SLA, licenza e profondità storica.
- Verificare presenza di identificativi stabili per fixture, team e player.
- Produrre decisione motivata sul provider iniziale.

### Acceptance criteria
- Esiste una matrice comparativa.
- È identificato un provider primario e almeno una strategia fallback.
- Sono documentati i dati non disponibili nell'MVP.
- Nessun modulo dominio dipende da contratti proprietari del provider.

---

## US-0002 — Benchmark UX/UI professionale

**Priorità:** MUST  
**Dipendenze:** nessuna

### Task
- Analizzare pattern UX di moderne app sportive/sportsbook e app analytics professionali.
- Studiare home eventi, dettaglio partita, market navigation, bet slip/system slip, filtri, storico, dashboard e stati vuoti/errori/loading.
- Identificare pattern utili senza copiare identità visive proprietarie.
- Definire principi visuali e di interaction design.

### Acceptance criteria
- È prodotto un benchmark con pattern consigliati e pattern da evitare.
- Sono definiti principi per spacing, tipografia, touch target, navigazione, gerarchia, feedback, filtri e progressive disclosure.
- Il benchmark copre mobile e desktop.

---

## US-0003 — Design System v1

**Priorità:** MUST  
**Dipendenze:** US-0002

### Task
- Definire token: spacing, radius, elevation, typography, semantic colors, borders.
- Definire light/dark mode.
- Definire componenti base: button, chip, badge, card, input, select, tabs, bottom sheet, modal, toast, skeleton, empty state, error state.
- Definire componenti dominio: MatchCard, PickChip, ProbabilityBadge, ConfidenceBadge, ValueBadge, SystemTray, CompatibilityWarning.

### Acceptance criteria
- Tutti i componenti hanno stati default/hover/pressed/focus/disabled/loading dove applicabile.
- Touch target adeguati su mobile.
- Contrasto e accessibilità verificabili.
- Nessun componente core è progettato ad hoc in modo incoerente rispetto al design system.

---

# EPIC 1 — Repository & Engineering Foundation

**Priorità:** P0

## US-0101 — Bootstrap repository applicativo

**Priorità:** MUST

### Task
- Configurare monorepo o struttura equivalente.
- Frontend Next.js + TypeScript.
- Backend Node.js + TypeScript.
- Shared domain/types package.
- Configurare lint, formatter, typecheck, test e build.
- Configurare `.env.example`.

### Acceptance criteria
- Frontend e backend si avviano localmente.
- Build completa eseguibile con un singolo comando documentato.
- Nessuna API key presente nel repository.

---

## US-0102 — CI baseline

**Priorità:** MUST  
**Dipendenze:** US-0101

### Task
- Pipeline per lint, typecheck, unit test e build.
- Failure della pipeline in caso di regressione.

### Acceptance criteria
- Ogni PR/branch di integrazione riceve esito automatico.
- Pipeline verde sul baseline iniziale.

---

## US-0103 — Observability baseline

**Priorità:** SHOULD

### Task
- Logging strutturato.
- Correlation/request ID.
- Distinzione errori provider, dominio, prediction e settlement.

### Acceptance criteria
- Un errore di ingestion o settlement è diagnosticabile dai log senza riprodurlo manualmente.

---

# EPIC 2 — Domain Model & Database

**Priorità:** P0

## US-0201 — Schema database core

**Priorità:** MUST

### Entità minime
- competitions
- seasons
- teams
- players
- fixtures
- fixture_status_history
- standings_snapshots
- team_statistics_snapshots
- player_statistics_snapshots
- injuries_suspensions
- lineups
- markets
- market_selections
- predictions
- prediction_features_snapshot
- model_versions
- odds_snapshots
- bets
- bet_selections
- systems
- system_combinations
- settlements
- backtest_runs
- paper_trading_runs

### Acceptance criteria
- Migrazioni versionate.
- Foreign key e indici definiti.
- Gli snapshot storici non vengono sovrascritti.
- È possibile risalire da una prediction ai dati/modello che l'hanno generata.

---

## US-0202 — Stati dominio standard

**Priorità:** MUST

### Definire almeno
- Fixture: `SCHEDULED`, `LIVE`, `FINISHED`, `POSTPONED`, `SUSPENDED`, `CANCELLED`.
- Prediction: `ACTIVE`, `NO_BET`, `EXPIRED`.
- Bet execution: `NOT_PLAYED`, `PLAYED`, `SIMULATED`.
- Settlement: `PENDING`, `WIN`, `LOSS`, `VOID`, `PARTIAL_WIN`, `PARTIAL_LOSS`, `VERIFIED` dove necessario separare status ed outcome.

### Acceptance criteria
- Gli stati sono centralizzati e non duplicati con stringhe libere.

---

# EPIC 3 — Football Provider Adapter & Data Ingestion

**Priorità:** P0

## US-0301 — FootballDataProvider interface

**Priorità:** MUST

### Metodi minimi
- `getFixtures`
- `getFixture`
- `getStandings`
- `getTeamStats`
- `getPlayerStats`
- `getInjuries`
- `getLineups`
- `getMatchEvents`
- `getOdds` se disponibile nell'MVP

### Acceptance criteria
- Il dominio usa DTO normalizzati.
- Il provider concreto può essere sostituito tramite configurazione/adapter.

---

## US-0302 — Fixture ingestion

**Priorità:** MUST  
**Dipendenze:** US-0301, US-0201

### Task
- Caricare fixture future per competizioni configurate.
- Upsert idempotente.
- Conservare provider ID.
- Normalizzare timezone in UTC e presentazione locale lato client.

### Acceptance criteria
- Nessun duplicato con ingestion ripetuta.
- Una modifica di data/ora del provider aggiorna la fixture non ancora conclusa.

---

## US-0303 — Statistics ingestion

**Priorità:** MUST

### Task
- Standings.
- Forma recente.
- Casa/trasferta.
- Goals for/against.
- Dati offensivi/difensivi disponibili.
- Snapshot temporali.

### Acceptance criteria
- Ogni snapshot è timestampato.
- Il Prediction Engine può richiedere i dati disponibili a un certo timestamp.

---

## US-0304 — Players, injuries, suspensions & lineups

**Priorità:** MUST se disponibili dal provider

### Acceptance criteria
- Player ID stabile e normalizzato.
- Assenze collegate a team/player/fixture quando possibile.
- Lineup e probabili formazioni distinguibili.
- I dati mancanti sono esplicitamente marcati come mancanti.

---

# EPIC 4 — Prediction Engine v1

**Priorità:** P0

## US-0401 — Team Strength Model

**Priorità:** MUST

### Input
- forma recente;
- classifica / punti per partita;
- casa/trasferta;
- gol fatti/subiti;
- forza avversari quando disponibile;
- indisponibili;
- data quality.

### Acceptance criteria
- Output numerico riproducibile per home e away strength.
- Pesi configurabili/versionati.
- Nessun peso hardcoded senza configurazione/versione modello.

---

## US-0402 — Expected Goals Model v1

**Priorità:** MUST

### Task
- Stimare lambda home e away.
- Integrare attacco/difesa, home advantage, forma e availability impact.

### Acceptance criteria
- Output `expectedGoalsHome`, `expectedGoalsAway`.
- Test su casi sintetici.
- Valori anomali gestiti tramite limiti/configurazione documentata.

---

## US-0403 — Score Probability Matrix

**Priorità:** MUST

### Task
- Poisson iniziale o modello equivalente.
- Calcolare scoreline da 0-0 a soglia configurabile.
- Normalizzare probabilità residua.

### Acceptance criteria
- Somma probabilità ≈ 1 entro tolleranza definita.
- Da una matrice sono derivabili mercati coerenti tra loro.

---

## US-0404 — Market Probability Engine — core markets

**Priorità:** MUST

### Mercati MVP
- 1X2
- doppia chance
- draw no bet dove supportato
- Over/Under 0.5 / 1.5 / 2.5 / 3.5 / 4.5
- Goal / No Goal
- team goals
- risultato esatto
- multigol base
- combo derivabili coerentemente dalla matrice

### Acceptance criteria
- Ogni mercato restituisce probabilità numerica.
- Mercati derivati dalla stessa matrice sono logicamente coerenti.
- Ogni prediction memorizza model version e timestamp.

---

## US-0405 — Confidence & Data Quality Engine

**Priorità:** MUST

### Acceptance criteria
- Confidence distinta dalla probabilità.
- Dati mancanti/obsoleti riducono confidence.
- Lineup ufficiale può aumentare confidence rispetto a probabile formazione.
- Nessun valore di confidence può aumentare per dati mancanti.

---

## US-0406 — No Bet Engine

**Priorità:** MUST

### Acceptance criteria
- Il motore può non raccomandare alcuna selezione.
- Soglie configurabili per probability, confidence e data quality.
- La UI distingue chiaramente `NO_BET` da errore o dato assente.

---

# EPIC 5 — Player & Scorer Engine

**Priorità:** P0/P1

## US-0501 — Player Impact Score

**Priorità:** MUST

### Input possibili
- minuti;
- titolarità;
- ruolo;
- goals/assists;
- xG se disponibile;
- shots / shots on target se disponibili;
- rigori e piazzati;
- disponibilità;
- expected minutes.

### Acceptance criteria
- L'assenza di un titolare rilevante incide più dell'assenza di una riserva equivalente per numerosità.
- Il calcolo è versionato e spiegabile.

---

## US-0502 — Anytime Goalscorer Prediction

**Priorità:** MUST

### Acceptance criteria
- Probabilità collegata agli expected goals della squadra.
- Considera expected minutes e ruolo.
- Se player non previsto/titolare incerto, confidence ridotta.
- La somma delle probabilità player non viene interpretata erroneamente come eventi indipendenti.

---

## US-0503 — Player markets estendibili

**Priorità:** SHOULD

Preparare interfacce per:
- 2+ goals;
- shots;
- shots on target;
- assists.

Non bloccare MVP se il provider non offre sufficiente copertura.

---

# EPIC 6 — Compatibility & Correlation Engine

**Priorità:** P0

## US-0601 — Market taxonomy

**Priorità:** MUST

### Task
Ogni selection deve poter essere rappresentata semanticamente con attributi strutturati: fixture, team, player, period, metric, operator, threshold, outcome.

### Acceptance criteria
- Le regole non dipendono dalle label visuali del bookmaker.
- Nuovi provider possono mappare i loro mercati sulla tassonomia comune.

---

## US-0602 — Compatibility rules

**Priorità:** MUST

### Esempi minimi da bloccare
- Over 3.5 + Under 2.5 stessa fixture/periodo.
- Goal + No Goal.
- Risultato esatto 1-0 + Goal.
- Risultato esatto 1-0 + Over 2.5.
- Team non segna + player di quel team segna.
- Under 0.5 primo tempo + marcatore primo tempo.

### Acceptance criteria
- Una combinazione incompatibile non viene mai generata automaticamente.
- Inserimento manuale produce feedback immediato e comprensibile.
- Suite di test tabellare copre le regole principali.

---

## US-0603 — Correlation Engine base

**Priorità:** MUST

### Esempi
- Team vince + suo attaccante segna.
- Team Over 1.5 + suo attaccante segna.
- Under 2.5 + No Goal.

### Acceptance criteria
- Non blocca automaticamente gli eventi solo correlati.
- Produce almeno classe/score di correlazione.
- System Optimizer può penalizzare correlazioni elevate.

---

# EPIC 7 — Bet Slip & System Builder

**Priorità:** P0

## US-0701 — Selezione rapida pronostici

**Priorità:** MUST

### Acceptance criteria
- Da card partita e dettaglio è disponibile azione `+ Sistema`.
- System tray mobile mostra il numero selezioni.
- Rimozione immediata.
- Incompatibilità gestite al momento dell'aggiunta.

---

## US-0702 — Sistema integrale

**Priorità:** MUST

### Acceptance criteria
- L'utente inserisce N selezioni e dimensione K.
- Il sistema genera `C(N,K)` combinazioni corrette.
- Per 6 selezioni e triple genera 20 combinazioni.
- Sono mostrati numero combinazioni, stake per combinazione e investimento totale.

---

## US-0703 — Modalità assistita

**Priorità:** MUST

### Acceptance criteria
- L'utente sceglie i pronostici.
- L'app propone una struttura compatibile con budget e confidence.
- L'utente può accettare o personalizzare.

---

## US-0704 — Automatic System Builder base

**Priorità:** MUST

### Input
- budget;
- profilo rischio: prudente / bilanciato / aggressivo;
- competizioni/periodo configurati.

### Acceptance criteria
- Seleziona solo pick sopra soglie configurabili.
- Non forza il numero di pick quando non esistono opportunità sufficienti.
- Esclude incompatibili.
- Penalizza correlazioni elevate.
- Rispetta budget massimo.

---

## US-0705 — Fisse

**Priorità:** SHOULD

### Acceptance criteria
- Una o più selezioni possono essere marcate fisse.
- Tutte le combinazioni generate le includono.
- L'app può suggerire una fissa ma non imporla.

---

# EPIC 8 — Bet History & Settlement

**Priorità:** P0

## US-0801 — Salvataggio prediction e sistema

**Priorità:** MUST

### Acceptance criteria
- Ogni prediction/sistema può essere salvato anche se non giocato.
- Lo snapshot della prediction conserva probabilità, confidence, model version e timestamp.

---

## US-0802 — Flag giocata realmente

**Priorità:** MUST

### Dati
- `played = true/false`
- bookmaker opzionale
- stake
- quota effettivamente presa
- played_at

### Acceptance criteria
- Il flag può essere impostato manualmente.
- Le metriche economiche includono esclusivamente le giocate reali.

---

## US-0803 — Eligibility automatica per verifica

**Priorità:** MUST

### Regola funzionale
Una giocata è candidata al controllo se:

```text
played = true
AND settlement_status = PENDING
AND fixture_start_at + completion_margin < now
```

Il margine è configurabile.

### Acceptance criteria
- Le fixture future non vengono interrogate per settlement.
- Le fixture già verificate non vengono riprocessate.
- Query/job considera solo record eleggibili.

---

## US-0804 — Fixture verification

**Priorità:** MUST

### Acceptance criteria
- Il provider viene interrogato solo per fixture passate/non consolidate necessarie al settlement.
- `FINISHED` consente settlement.
- `POSTPONED`/`SUSPENDED` restano pendenti secondo regole configurate.
- `CANCELLED` è gestibile come void secondo market rules.
- Una fixture `FINAL_VERIFIED` non viene riscaricata nei cicli normali.

---

## US-0805 — Settlement Engine core markets

**Priorità:** MUST

### Mercati
- 1X2
- doppia chance
- Over/Under
- Goal/No Goal
- team goals
- risultato esatto
- multigol base
- anytime goalscorer

### Acceptance criteria
- Calcolo deterministico e testato.
- Idempotenza garantita.
- Ogni settlement registra timestamp e input usati.

---

## US-0806 — Storico UX

**Priorità:** MUST

### Filtri minimi
- tutte
- giocate
- non giocate/simulate
- vinte
- perse
- aperte
- periodo
- competizione
- mercato

### Acceptance criteria
- Lo storico è leggibile su mobile senza tabella desktop compressa.
- Ogni record mostra esito, quota, stake, ritorno, prediction originaria e stato.

---

# EPIC 9 — Performance Analytics

**Priorità:** P1

## US-0901 — Model Performance Dashboard

**Priorità:** MUST

### Metriche iniziali
- hit rate per mercato;
- Brier score dove applicabile;
- log loss dove applicabile;
- calibration buckets;
- performance per competition;
- performance per confidence range;
- performance per model version.

### Acceptance criteria
- Include tutte le prediction valide, non solo quelle giocate.

---

## US-0902 — Betting Performance Dashboard

**Priorità:** MUST

### Metriche
- profit/loss;
- ROI;
- yield;
- win rate;
- average odds;
- max drawdown;
- stake totale;
- ritorno totale;
- breakdown per mercato/competition.

### Acceptance criteria
- Include solo record `PLAYED`.
- Non mescola paper trading e denaro reale.

---

# EPIC 10 — Backtesting

**Priorità:** P0/P1

## US-1001 — Historical feature reconstruction

**Priorità:** MUST

### Acceptance criteria
- Per una fixture storica vengono utilizzati solo dati disponibili prima del kickoff.
- Nessun leakage da risultato o dato futuro.

---

## US-1002 — Backtest runner

**Priorità:** MUST

### Acceptance criteria
- Selezione di competition/season/date range/model version.
- Output persistito.
- Riproducibilità dello stesso run con stessi input/versione.

---

## US-1003 — Calibration report

**Priorità:** MUST

### Acceptance criteria
- Confronta probabilità dichiarate con frequenze osservate.
- Evidenzia mercati/modelli sovra o sotto confidenti.

---

# EPIC 11 — Paper Trading

**Priorità:** P1

## US-1101 — Portafoglio virtuale

**Priorità:** MUST

### Acceptance criteria
- Bankroll iniziale configurabile.
- Sistemi/pick simulati separati dalle giocate reali.
- Settlement usa lo stesso engine delle giocate reali.

---

## US-1102 — Report paper trading

**Priorità:** MUST

### Metriche
- bankroll iniziale/finale;
- P/L;
- ROI;
- yield;
- drawdown;
- numero giocate;
- risultati per mercato.

---

# EPIC 12 — Value Engine

**Priorità:** P1, anticipabile se quote disponibili

## US-1201 — Odds normalization

**Priorità:** SHOULD

### Acceptance criteria
- Quote associate a provider/bookmaker/market/selection/timestamp.
- Storico quote non sovrascritto.

---

## US-1202 — Fair odds & value

**Priorità:** SHOULD

### Formule base

```text
fair_odds = 1 / model_probability
implied_probability = 1 / bookmaker_odds
```

Expected value definito e documentato.

### Acceptance criteria
- Probability e Value mostrati separatamente.
- Nessuna selezione è consigliata solo perché ha quota elevata.

---

# EPIC 13 — UI Screens MVP

**Priorità:** P0

## US-1301 — App shell & navigation

**Priorità:** MUST

### Schermate principali
- Pronostici
- Partite
- Crea Sistema
- I miei sistemi
- Storico
- Statistiche

### Acceptance criteria
- Mobile navigation utilizzabile con una mano.
- Desktop navigation coerente.
- Nessuna duplicazione non necessaria dei flussi.

---

## US-1302 — Pronostici/Home

**Priorità:** MUST

### Acceptance criteria
- Eventi organizzati per giorno/competition.
- Migliori pick visibili rapidamente.
- Probability, confidence e value distinguibili.
- `NO_BET` gestito in modo elegante.
- Azione `+ Sistema` immediata.

---

## US-1303 — Dettaglio partita

**Priorità:** MUST

### Sezioni
- overview
- forma/statistiche
- mercati
- players/scorers
- indisponibili/lineup
- motivazione prediction

### Acceptance criteria
- Progressive disclosure.
- Nessun overload informativo nella prima viewport.
- Market categories facilmente navigabili.

---

## US-1304 — Crea Sistema

**Priorità:** MUST

### Modalità UI
- Automatico
- Assistito
- Manuale

### Acceptance criteria
- L'utente non deve conoscere combinatoria per usare Automatico/Assistito.
- Manuale espone singole/doppie/triple/quadruple/etc. solo quando richiesto.
- Budget e costo totale sempre visibili.

---

## US-1305 — Storico

**Priorità:** MUST

### Acceptance criteria
- Filtri semplici.
- Stato giocata/esito immediatamente riconoscibile.
- Dettaglio apribile senza perdere il contesto.

---

## US-1306 — Dashboard statistiche

**Priorità:** MUST

### Acceptance criteria
- Separa chiaramente Model Performance e Betting Performance.
- KPI principali leggibili senza competenze statistiche avanzate.
- Dettagli avanzati disponibili su richiesta.

---

# EPIC 14 — Security, Privacy & Reliability

**Priorità:** P0/P1

## US-1401 — Secrets management

**Priorità:** MUST

### Acceptance criteria
- API key solo via environment/secret manager.
- Nessun secret nei log.

---

## US-1402 — Input validation

**Priorità:** MUST

### Acceptance criteria
- API validation lato backend.
- Budget/stake/odds validati.
- Market selection non accettate se semanticamente invalide.

---

## US-1403 — Idempotency jobs

**Priorità:** MUST

### Acceptance criteria
- Ingestion ripetuta non duplica dati.
- Settlement ripetuto non duplica ritorni o modifica record consolidati.

---

# EPIC 15 — Testing Strategy

**Priorità:** P0

## US-1501 — Unit tests dominio

**Priorità:** MUST

Copertura prioritaria:
- combinatoria sistemi;
- Poisson / score matrix;
- market derivation;
- compatibility rules;
- correlation classification;
- settlement;
- fair odds/value;
- confidence/data quality.

---

## US-1502 — Integration tests provider/database

**Priorità:** MUST

### Acceptance criteria
- Fixture provider mockate/versionate.
- Errori/rate limit provider gestiti.
- Migrazioni testate.

---

## US-1503 — E2E critical flows

**Priorità:** MUST

### Flussi
1. fixture caricata → prediction → selezione → sistema;
2. sistema salvato → `played=true` → evento concluso → settlement;
3. incompatibilità → blocco UI/backend;
4. evento già verified → nessun nuovo processing;
5. storico → metriche aggiornate.

---

# 16. Sequenza di implementazione raccomandata

## Sprint/Phase 0 — Decisioni
- US-0001 Provider comparison
- US-0002 UX benchmark
- US-0003 Design System v1

## Sprint/Phase 1 — Foundation
- Epic 1 Repository
- Epic 2 Database
- US-0301 Provider abstraction
- primi test infrastrutturali

## Sprint/Phase 2 — Data pipeline
- US-0302 Fixture ingestion
- US-0303 Statistics ingestion
- US-0304 Player/availability data

## Sprint/Phase 3 — Prediction core
- Epic 4 completo
- prime prediction salvate
- test matematici

## Sprint/Phase 4 — Market/player intelligence
- Epic 5
- Epic 6

## Sprint/Phase 5 — Product UX core
- Epic 13: app shell, home, dettaglio
- Epic 7: bet slip/system builder

## Sprint/Phase 6 — History & Settlement
- Epic 8 completo
- E2E settlement

## Sprint/Phase 7 — Validation
- Epic 9 analytics
- Epic 10 backtesting
- Epic 11 paper trading

## Sprint/Phase 8 — Value & optimization
- Epic 12
- System Optimizer evoluto
- Monte Carlo opzionale

---

# 17. Parallelizzazione agenti

Dopo Phase 0, l'orchestratore può attivare in parallelo:

### Agent A — Data/Provider
Responsabile di Epic 3 e adapter provider.

### Agent B — Backend/Domain
Responsabile di Epic 2, 8 e API dominio.

### Agent C — Prediction/Quant
Responsabile di Epic 4, 5, 9 e 10.

### Agent D — Systems/Risk
Responsabile di Epic 6, 7 e 12.

### Agent E — UX/UI
Responsabile di US-0002, US-0003 ed Epic 13.

### Agent F — QA/Validation
Responsabile di Epic 15, quality gates e test E2E.

### Orchestrator
Responsabile di:
- dipendenze tra agenti;
- contratti condivisi;
- ADR;
- merge strategy;
- verifica coerenza SRS/Technical Design;
- accettazione finale delle story.

---

# 18. Gate di rilascio MVP

L'MVP NON è considerato pronto finché non sono soddisfatti tutti i seguenti punti:

- fixture e dati base caricati automaticamente;
- almeno una competition reale funzionante end-to-end;
- prediction 1X2, Goal/No Goal, Over/Under e mercati MVP funzionanti;
- marcatore disponibile dove i dati lo consentono;
- probability e confidence distinte;
- `NO_BET` operativo;
- Compatibility Engine operativo;
- Correlation Engine base operativo;
- sistema integrale e assistito funzionanti;
- UI mobile-first validata;
- storico prediction disponibile;
- flag giocata reale disponibile;
- settlement automatico per eventi passati funzionante;
- fixture già verificate non riprocessate;
- Model Performance separata da Betting Performance;
- backtest eseguibile senza data leakage;
- paper trading operativo;
- test critici verdi;
- nessuna regressione sui MUST dell'SRS.

---

# 19. Fuori MVP / Roadmap successiva

Da implementare dopo validazione del core:

- corner avanzati;
- cartellini avanzati;
- tiri / tiri in porta;
- assist;
- Monte Carlo avanzato;
- sistemi ridotti matematicamente ottimizzati;
- Last Minute Recheck;
- notifiche intelligenti;
- AI Analyst;
- ensemble ML;
- CLV e timing quote;
- modelli specifici per campionato;
- auto-retraining controllato;
- ulteriori sport/competizioni solo dopo consolidamento calcio.

---

# 20. Prima attività da eseguire

L'orchestratore deve iniziare da **Phase 0** e non dal coding della UI o del Prediction Engine.

Ordine immediato:

1. Provider comparison.
2. UX/UI benchmark.
3. Design System v1.
4. ADR stack/provider.
5. Bootstrap repository.
6. Database schema.
7. Provider adapter e ingestion.

Solo dopo questi punti partire con Prediction Engine e schermate applicative definitive.

