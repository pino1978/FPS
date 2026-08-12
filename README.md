# Football Prediction System

Football Prediction System (FPS) è una web app mobile-first che trasforma dati calcistici reali e versionati in probabilità, indicatori di qualità, sistemi di scommessa verificabili e storico separato tra prediction, paper/non giocate e giocate reali.

## Principi

- Probability, Confidence, Data Quality, Value e Pick Score sono concetti distinti.
- `NO_BET` è un risultato valido.
- Nessun dato mancante viene inventato.
- Prediction storiche e relativi input sono immutabili/versionati.
- Le combinazioni `INCOMPATIBLE` non vengono generate.
- Correlazione e incompatibilità sono trattate separatamente.
- Model Performance e Betting Performance sono separate.
- Nessuna esecuzione automatica verso bookmaker.
- Solo fonti gratuite/open data salvo decisione esplicita futura.

## Stack

- Web: Next.js / React / TypeScript
- API: NestJS su Fastify
- DB: PostgreSQL + Prisma
- Domain engine: TypeScript puro, deterministico e testabile
- Provider gratuiti: football-data.org + API-Football Free dietro adapter/facade
- CI: GitHub Actions

## Avvio locale

Prerequisiti: Node.js 22+, npm, Docker.

```bash
cp .env.example .env
# valorizzare localmente, senza commit:
# FOOTBALL_DATA_TOKEN=...
# API_FOOTBALL_KEY=...

docker compose up -d
npm install
npm run db:push
npm run dev
```

Web: `http://localhost:3000`  
API: `http://localhost:4000`  
Health: `http://localhost:4000/health`

La chiave API non deve mai essere inserita nel repository. In CI usare i GitHub Secrets `FOOTBALL_DATA_TOKEN` e `API_FOOTBALL_KEY`.

## Funzioni implementate

- caricamento fixture e classifiche Serie A da fonte gratuita;
- Prediction Engine bootstrap Poisson con 1X2, Over/Under 1.5/2.5/3.5 e Goal/No Goal;
- Confidence e Data Quality separate, con `NO_BET` sotto soglia;
- snapshot immutabili delle prediction e model version;
- System Builder manuale e automatico con profilo Prudente/Bilanciato/Aggressivo;
- combinazioni integrali e budget;
- blocco delle incompatibilità logiche prima della generazione;
- System Tray mobile/desktop;
- salvataggio sistemi come non giocati o realmente giocati;
- storico di singole e sistemi;
- Settlement Engine schedulato ogni 10 minuti, idempotente e basato solo su eventi conclusi;
- eventi già verificati esclusi dal normale riprocessamento;
- settlement MVP per 1X2, Goal/No Goal e Over/Under;
- Model Performance e Betting Performance esposte separatamente;
- audit append-only delle principali transizioni;
- prototipo UX originale mantenuto in `prototype/` e documentazione vincolante in `docs/baseline/`.

## Quality gate

```bash
npm run typecheck
npm test
npm run build
```

La CI esegue PostgreSQL, migrazione/schema push, typecheck, test e build. Il workflow manuale include inoltre smoke test dei provider quando i secret sono configurati.

## Limiti intenzionali del bootstrap

I mercati player/marcatore, injury weighting, lineup, quote/value e altri mercati avanzati vengono attivati solo dopo aver verificato che la fonte gratuita esponga dati sufficienti e affidabili. In assenza di dati il sistema restituisce `UNAVAILABLE`/`NO_BET`; non usa valori inventati.

## Documentazione

- `docs/baseline/FOOTBALL-PREDICTION-SYSTEM-SRS.md`
- `docs/baseline/FOOTBALL-PREDICTION-SYSTEM-TECHNICAL-DESIGN.md`
- `docs/baseline/FOOTBALL-PREDICTION-SYSTEM-MVP-BACKLOG.md`
- `docs/phase-0/`
- `docs/adr/`

## Avvertenza

FPS produce stime probabilistiche e non promette vincite. È uno strumento di analisi; utilizzo riservato ai maggiorenni.
