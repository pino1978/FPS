# Football Prediction System — Architecture Foundation

**Versione:** 0.1  
**Data:** 12/08/2026  
**Stato:** Draft for decision

## ADR-0001 — Stack applicativo

**Decisione proposta:** monorepo TypeScript; Next.js/React frontend; NestJS con Fastify backend; PostgreSQL; REST nell'MVP; scheduler persistente con locking DB. Redis/BullMQ e Python restano differiti fino a necessità misurata e ADR dedicata. JSONB è limitato a raw payload, rationale e configurazioni versionate. Timestamp in UTC, timezone evento/utente conservate separatamente.

**Alternative:** Fastify non strutturato, backend Python completo, serverless-first. La scelta proposta massimizza contratti condivisi, modularità e testabilità senza duplicare prematuramente lo stack.

**Stato:** Ready for approval; non autorizza bootstrap prima del Gate 0.

## ADR-0002 — Provider football e quote

**Decisione:** API-Football primario provvisorio; Sportmonks fallback progettuale; football-data.org fallback parziale. Nessun failover automatico MVP. Football e odds sono capability/provider separati. Tutto passa da adapter e DTO normalizzati. Identità esterna: `(provider_code, entity_type, external_id)`. Raw response append-only con request fingerprint, checksum, adapter version e timestamp.

**Stato:** Provisionally Accepted; diventa Accepted solo dopo trial, licensing e soglie go/no-go approvate.

## 1. Modello logico

### Identità e sorgenti

`Provider`, `ProviderCapability`, entità canoniche (`Competition`, `Season`, `Team`, `Player`, `Fixture`, `Bookmaker`) ed `ExternalEntityReference` con validità, metodo/confidence di matching e unique provider/type/external ID. Nessun singolo provider ID identifica il dominio.

### Snapshot temporali

`FixtureStatusEvent`, `FixtureResultVersion`, `StandingSnapshot`, `TeamStatisticsSnapshot`, `PlayerStatisticsSnapshot`, `AvailabilitySnapshot`, `LineupSnapshot`, `MatchEventVersion`, `OddsSnapshot`. Ogni snapshot conserva source, raw reference, quality flags, semantic/adapter version e timestamp `effective_at`, `observed_at`, `available_at`, `captured_at` quando applicabili.

### Prediction e provenance

`ModelDefinition`, `ModelVersion`, `PredictionRun`, `Prediction`, `PredictionSnapshot`, `PredictionFeatureSnapshot`. Lo snapshot include probability, confidence, DQ, fair odds, quota, EV/value, Pick Score, rationale e manifest delle feature/versioni. `NO_BET` è uno stato operativo, non un errore.

### Sistemi, execution e settlement

`BettingSystem`, `SystemSelection`, `SystemCombination`, `Execution` (`NOT_PLAYED`, `REAL`, `PAPER`), `BetSelection`, `FixtureVerification`, `SettlementAttempt`, `Settlement`, `PayoutLedgerEntry`, `PaperPortfolio`, `PaperTransaction`. Prediction, paper ed execution reale sono entità/eventi distinti. Ledger e tentativi sono append-only e idempotenti.

### Performance e backtest

`BacktestRun`, `BacktestFixtureEvaluation`, `ModelMetricAggregate`, `BettingMetricAggregate`. Model legge tutte le prediction eleggibili; Betting soltanto REAL; Paper resta separato.

## 2. As-of e immutabilità

Regola centrale:

```text
source.available_at <= prediction_run.as_of < fixture.scheduled_start_at
```

Online e backtest usano la stessa query as-of. Correzioni generano nuove versioni; recheck genera una nuova prediction collegata; nessuna sovrascrittura di prediction, quote, lineup, statistiche o risultati versionati. Ogni run conserva versioni di modello, feature transformation, tassonomia e configurazione.

Test obbligatori: rifiuto feature future; esclusione risultati/final status; riproducibilità; fixture rinviate/kickoff variato; correzioni successive incapaci di mutare output storico.

## 3. State machine

- Fixture: `SCHEDULED → LIVE → FINISHED → FINAL_VERIFIED`; rami POSTPONED/SUSPENDED/CANCELLED. FINAL_VERIFIED è interno.
- Prediction: `GENERATED → ACTIVE | NO_BET`; ACTIVE → EXPIRED/SUPERSEDED senza mutare snapshot.
- Execution: `NOT_PLAYED → REAL | PAPER`; correzioni tramite reversal auditato.
- Verification: `PENDING → ELIGIBLE → FETCHING → CONSOLIDATED`; retry/manual review; force refresh produce REVISED.
- Settlement processing: `PENDING → PROCESSING → SETTLED`, con RETRYABLE_ERROR/MANUAL_REVIEW/REVERSED.
- Settlement outcome separato: `WIN`, `LOSS`, `VOID`, `PARTIAL_WIN`, `PARTIAL_LOSS`.
- System: `DRAFT → VALIDATED → CONFIRMED → OPEN → SETTLED`, con rami ABANDONED/VOID/PARTIALLY_SETTLED.

`settlement_eligible_at` deriva da kickoff attuale, durata attesa e safety margin configurati.

## 4. Contratti normalizzati

- `FootballDataProvider`: capabilities, fixtures, standings, team/player stats, availability, lineups, match events.
- `OddsProvider`: capabilities e odds snapshot, separato dal football provider.
- `AsOfFeatureRepository`: costruisce feature manifest a un istante e fallisce su leakage; nessuna imputazione nascosta.
- `PredictionEngine`: input fixture/asOf/modelVersion/featureManifest; output metriche distinte e recommendation status.
- `MarketEngine` e `PlayerPredictionEngine`: tassonomia/versione e coerenza con goal distribution.
- `CompatibilityEngine`: COMPATIBLE/INCOMPATIBLE; `CorrelationEngine` separato con classe/score.
- `ValueEngine`: Value `UNAVAILABLE` se manca la quota, mai zero fittizio.
- `SystemBuilder`: selezioni, modalità, fisse, K/copertura, budget, rischio e stake policy; restituisce combinazioni, costo, incompatibilità e correlazioni.
- `SettlementEngine`: funzione deterministica e side-effect free su selection snapshot, result version, rule version e idempotency key; persistenza transazionale separata.
- `BacktestRunner`: manifest esplicito e divieto di interrogare latest data.

Tutti i DTO includono source, external references, capturedAt, availableAt, quality flags e schemaVersion.

## 5. Decisioni bloccanti prima dello schema fisico

Competition/stagioni; catalogo mercati e settlement semantics; 2+ goals; provider quote/storico; soglie trial; regole 90 minuti/ET/rigori/rinvii; safety margin; auth/ownership; hosting/backup/RPO/RTO; retention; soglie NO_BET/DQ/confidence/correlation; metriche/sample size; force refresh/reversal; entity matching.

