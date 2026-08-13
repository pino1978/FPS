# Football Prediction System

Football Prediction System (FPS) è una web app mobile-first che trasforma dati calcistici reali e versionati in probabilità, indicatori di qualità, sistemi combinatori verificabili e storico distinto tra prediction, paper trading e giocate reali.

## Principi non negoziabili

- Probability, Confidence, Data Quality, Value e Pick Score sono concetti distinti.
- `NO_BET` è un risultato valido.
- Nessun dato mancante viene inventato.
- Prediction e input storici sono snapshot immutabili/versionati.
- Gli esiti delle prediction sono registrati separatamente in `PredictionSettlement`.
- Una combinazione `INCOMPATIBLE` non viene generata.
- Correlazione e incompatibilità sono trattate separatamente.
- Model Performance e Betting Performance sono separate.
- Nessuna esecuzione automatica verso bookmaker.
- Solo fonti gratuite/open data salvo decisione architetturale esplicita futura.

## Stack

- Web: Next.js / React / TypeScript
- API: NestJS su Fastify
- DB: PostgreSQL 16 + Prisma
- Domain engine: TypeScript puro, deterministico e testabile
- Provider gratuiti: football-data.org + API-Football Free dietro adapter/facade
- CI: GitHub Actions

## Configurazione

Prerequisiti: Node.js 22+, npm e Docker.

```bash
cp .env.example .env
```

Configurare localmente senza mai committare le credenziali:

```text
FOOTBALL_DATA_TOKEN=...
API_FOOTBALL_KEY=...
DATABASE_URL=postgresql://fps:fps@localhost:5432/fps
NEXT_PUBLIC_API_URL=http://localhost:4000
CORS_ORIGINS=http://localhost:3000
```

In GitHub Actions usare esclusivamente i repository secrets:

- `FOOTBALL_DATA_TOKEN`
- `API_FOOTBALL_KEY`

## Avvio locale

```bash
docker compose up -d
npm install
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
npm run dev
```

Web: `http://localhost:3000`  
API: `http://localhost:4000`  
Health: `http://localhost:4000/health`

## Data ingestion

L’ingestion persiste fixture e snapshot delle statistiche attraverso il provider abstraction layer.

- job schedulato idempotente;
- fixture aggiornate con upsert;
- snapshot team timestampati e non sovrascritti;
- competizioni configurabili con `FPS_COMPETITIONS`;
- default: `SA,PL,PD,BL1,CL` quando coperte dal piano gratuito disponibile.

Endpoint operativo:

```text
POST /ops/ingestion/run
GET  /ops/fixtures/persisted
```

## Prediction Engine

Il motore v2 utilizza expected goals + matrice Poisson normalizzata e configurazione versionata.

Mercati modellati:

- 1X2;
- doppia chance;
- Draw No Bet;
- Over/Under 0.5, 1.5, 2.5, 3.5, 4.5;
- Goal / No Goal;
- team goals casa/trasferta;
- risultati esatti;
- multigol;
- combo coerenti derivabili dalla stessa matrice.

Per ogni prediction sono conservati model version, timestamp, input snapshot, Probability, Confidence, Data Quality e Fair Odds. Se i dati sono insufficienti viene restituito `NO_BET`.

Endpoint:

```text
GET /v2/predictions?competition=SA&persist=true
```

## Player / Anytime Scorer

Il mercato marcatore è on-demand e viene attivato solo quando i dati gratuiti permettono una valutazione sufficientemente affidabile di:

- scoring share / performance del giocatore;
- expected goals della squadra;
- titolarità;
- lineup;
- indisponibilità.

In assenza di evidenze adeguate il risultato è `NO_BET`/`UNAVAILABLE`.

```text
GET /player-markets?fixtureId=...&competition=SA
```

## Value Engine

Le Fair Odds derivano dalla probabilità del modello. Value ed Expected Value sono calcolati soltanto quando esiste una quota bookmaker reale.

Le quote API-Football sono recuperate on-demand per minimizzare il consumo del free tier e vengono archiviate come `OddsSnapshot` immutabili e timestampati.

```text
GET /v2/value?fixtureId=...&competition=SA
GET /v2/odds-history?fixtureId=...
```

Se il free tier non fornisce quote per la fixture, `valueStatus = UNAVAILABLE`.

## System Builder

Modalità disponibili:

- Automatico;
- Assistito;
- Manuale.

Supporta:

- N pronostici e dimensione combinazione K;
- fisse;
- budget massimo;
- profilo Prudente / Bilanciato / Aggressivo;
- incompatibilità logiche bloccanti;
- correlazioni classificate e considerate nell’ottimizzazione;
- sistemi integrali;
- spiegazione della copertura combinatoria.

La copertura combinatoria non viene mai descritta come garanzia di profitto.

## Storico e settlement

Prediction, non giocate, paper trading e giocate reali sono mantenute separate.

Per le giocate reali possono essere conservati:

- bookmaker;
- quota effettiva;
- stake;
- data di giocata;
- note.

Il Settlement Engine:

- gira automaticamente ogni 10 minuti;
- considera solo record eleggibili e già oltre il margine temporale di completamento;
- recupera una fixture una sola volta per ciclo e riusa il risultato;
- è idempotente;
- non riprocessa record `VERIFIED`;
- registra evidenza e versione del risultato;
- liquida individualmente le combinazioni di un sistema.

Mercati settlement MVP: 1X2, doppia chance, DNB, Over/Under, BTTS, team goals, risultato esatto, multigol, combo e anytime scorer quando l’evidenza marcatore è disponibile.

## Backtesting

Il runner applica un gate anti-data-leakage:

```text
prediction.asOf < fixture.eventAt
AND immutable inputSnapshot exists
```

I backtest usano prediction e relativi input storici già congelati; non ricostruiscono feature usando dati futuri. Brier Score e hit rate vengono persistiti insieme a model version e parametri del run.

## Paper trading

Il paper trading utilizza lo stesso Settlement Engine delle giocate reali e mantiene il portafoglio simulato separato.

Metriche iniziali:

- bankroll iniziale/finale;
- stake;
- ritorni;
- P/L;
- ROI / yield;
- win rate;
- max drawdown.

## Analytics

`GET /ops/performance` restituisce due aree separate:

**Model Performance**
- sample;
- Brier Score;
- hit rate;
- calibration buckets;
- breakdown per mercato.

**Betting Performance** — esclusivamente `played=true && simulated=false`
- stake;
- ritorni;
- P/L;
- ROI / yield;
- win rate;
- average odds;
- max drawdown.

## UX/UI

L’interfaccia implementa:

- layout mobile-first e responsive;
- navigation desktop e bottom navigation mobile;
- loading skeleton;
- error state con retry;
- empty state;
- `NO_BET` distinto da errore;
- match detail con progressive disclosure;
- categorie mercato;
- scorer e Value caricati on-demand;
- System Tray;
- fisse e modalità Automatico/Assistito/Manuale;
- storico filtrabile;
- dashboard Model vs Betting Performance;
- focus state da tastiera.

## Quality gate

```bash
npm run typecheck
npm test
npm run build
```

GitHub Actions esegue inoltre:

- PostgreSQL 16 reale;
- `prisma migrate deploy` su database pulito;
- production dependency security audit con failure su HIGH/CRITICAL;
- integration test del Settlement Engine;
- smoke test autenticato di API-Football e football-data.org su `main`.

## Observability e sicurezza

- secret solo via environment/GitHub Secrets;
- CORS con allowlist `CORS_ORIGINS`;
- `x-request-id` propagato in risposta;
- log HTTP strutturato con durata/status, senza secret;
- audit trail delle principali transizioni dominio.

## Documentazione vincolante

- `docs/baseline/FOOTBALL-PREDICTION-SYSTEM-SRS.md`
- `docs/baseline/FOOTBALL-PREDICTION-SYSTEM-TECHNICAL-DESIGN.md`
- `docs/baseline/FOOTBALL-PREDICTION-SYSTEM-MVP-BACKLOG.md`
- `docs/phase-0/`
- `docs/adr/`

## Avvertenza

FPS produce stime probabilistiche, non certezze e non promesse di vincita. È uno strumento di analisi destinato a utenti maggiorenni.
