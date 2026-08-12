# ADR-0001 — Provider primario e stack MVP

**Stato:** Accepted  
**Data:** 2026-08-12

## Problema
FPS richiede dati fixture/team/player/availability sufficientemente ricchi, storico per backtest e un'architettura sostituibile. Serve inoltre uno stack rapido da sviluppare ma rigorosamente tipizzato e testabile.

## Alternative provider
1. API-Football
2. Sportmonks
3. football-data.org

## Decisione provider
**Sportmonks come provider primario MVP**, dietro `FootballDataProvider`. **API-Football come fallback adapter prioritario**. football-data.org resta candidato per dataset storici/supporto.

### Vantaggi
- injuries + suspensions espliciti;
- player/team statistics e lineup;
- xG add-on;
- rate limit adatto a ingestion;
- storico acquistabile.

### Svantaggi
- costo iniziale superiore ad API-Football;
- storico profondo e xG possono richiedere add-on;
- una API key/abbonamento reale resta dipendenza esterna.

## Alternative stack
### A — Next.js full-stack + PostgreSQL
Pro: setup semplice. Contro: rischio di accoppiare troppo dominio e UI.

### B — Monorepo TypeScript: Next.js web + API Node separata + PostgreSQL
Pro: contratti condivisi, separazione netta, testabilità. Contro: più setup.

### C — Next.js + Python API/quant
Pro: ecosistema statistico. Contro: due runtime fin dall'MVP, maggiore complessità operativa.

## Decisione stack
**B**.

- monorepo `pnpm` + Turborepo;
- `apps/web`: Next.js + TypeScript;
- `apps/api`: Node.js + TypeScript, API REST;
- `packages/domain`: entità/value objects/regole pure;
- `packages/prediction`: modelli quantitativi deterministici/versionati;
- `packages/provider-contracts`: DTO canonici e interfacce;
- PostgreSQL;
- Prisma ORM/migrations;
- Zod per validation;
- Vitest per unit/integration;
- Playwright per E2E;
- ESLint + Prettier + strict TypeScript;
- GitHub Actions per lint/typecheck/test/build.

Python potrà essere introdotto tramite ADR separato quando ML/analisi scientifica lo giustificheranno; non è necessario per Poisson/rating MVP.

## Impatti
- dominio indipendente dal provider;
- prediction engine eseguibile offline con fixture versionate;
- frontend non accede direttamente al provider;
- snapshot prediction immutabili;
- migrazioni DB versionate;
- nessuna prediction proprietaria del provider entra nel dominio come output FPS.
