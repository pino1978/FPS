# Football Prediction System — Phase 0 Gate-Ready Pack

**Versione:** 1.0  
**Data:** 12/08/2026  
**Stato:** Decision ready — Gate 0 aperto solo per evidenze esterne

## 1. Decisioni assunte dall'Orchestratore

Le decisioni seguenti sono adottate in modo conservativo, rispettando l'ordine SRS → Technical Design → Backlog e senza declassare MUST.

| Tema | Decisione |
|---|---|
| Competition MVP | Serie A 2026/27; storico minimo 2024/25–2025/26 |
| Trial comparativo | Serie A, Premier League e La Liga; Bundesliga/Champions se la quota lo consente |
| Stack | Monorepo TypeScript, Next.js/React, NestJS+Fastify, PostgreSQL, REST |
| Scheduling | Job persistenti e lock/lease PostgreSQL; Redis/BullMQ differiti |
| Mobile IA | 5 voci; `Sistemi` aggrega Crea e I miei sistemi |
| Desktop IA | 6 destinazioni; System Tray sticky separato |
| Auth | MVP autenticato single-user; ownership multi-user-ready nel dominio/DB |
| Tempo | Persistenza UTC; timezone evento e utente separate |
| Settlement | 90 minuti + recupero; ET/rigori esclusi salvo regola versione-specifica |
| Completion margin | 150 minuti iniziali dal kickoff corrente, poi stato provider |
| 2+ gol player | Capability prevista e settlement definito, attivazione runtime subordinata ai dati |
| Value | MUST; `UNAVAILABLE` se quota valida non disponibile, mai valore zero inventato |
| Responsible use | 18+, probabilità e non certezze, nessuna esecuzione automatica bookmaker |

## 2. Catalogo mercati MVP

Ogni mercato è una capability normalizzata e viene attivato soltanto se sono disponibili sia input predittivi sufficienti sia dati affidabili per il settlement (`FR-MKT-001`).

- 1X2, doppia chance, draw no bet.
- Over/Under 0.5, 1.5, 2.5, 3.5 e 4.5.
- Goal/No Goal, team goals, clean sheet, win to nil.
- Risultato esatto, multigol base, margine vittoria, parità gol.
- Combo 1X2 + O/U e 1X2 + GG/NG derivabili dalla stessa matrice.
- Mercati primo tempo quando copertura e regole sono sufficienti.
- Anytime goalscorer.
- Player 2+ goals, runtime-gated.

Corner, cards, shots, shots on target e assist sono estensioni successive salvo evidenza provider sufficiente. Il Value Engine rimane disponibile trasversalmente solo con quote timestampate, bookmaker e mapping semantico valido.

## 3. ADR consolidate

### ADR-0001 — Stack applicativo — Accepted

Monorepo TypeScript con Next.js/React, NestJS su Fastify, PostgreSQL e API REST. Scheduler persistente con advisory lock/lease DB. Redis/BullMQ e servizi Python richiedono evidenza di carico o valore e un ADR dedicato. JSONB limitato a raw payload, configurazioni e rationale versionati.

### ADR-0002 — Provider — Conditional

API-Football primario provvisorio, Sportmonks fallback progettuale, football-data.org fallback parziale. Football provider e Odds provider sono capability separate. Nessun failover automatico MVP. L'accettazione definitiva richiede trial e licenza.

### ADR-0003 — Identità canonica — Accepted

Entità interne con UUID/ULID. Riferimenti esterni tramite `(provider_code, entity_type, external_id)`, matching auditabile e vincolo univoco. Un provider ID non diventa identità di dominio.

### ADR-0004 — Snapshot e anti-leakage — Accepted

Snapshot append-only con `effective_at`, `observed_at`, `available_at`, `captured_at`. Ogni run usa soltanto dati con `available_at <= as_of < kickoff`. Correzioni e ricalcoli creano nuove versioni; prediction storiche non vengono mutate.

### ADR-0005 — Verification e settlement — Accepted

Fixture verification separata dal settlement REAL/PAPER. Processing status e outcome separati. Idempotenza con chiave, transazione e unique constraint. Force refresh amministrativo crea nuova ResultVersion e reversal ledger auditato.

### ADR-0006 — Ownership, sicurezza e audit — Accepted

MVP single-user autenticato ma ownership predisposta per più utenti. Segreti solo server-side; audit append-only per played, settlement e force refresh. Nessun dato economico globale anonimo.

## 4. Contratti normalizzati

Tutti i contratti sono versionati e non espongono DTO proprietari.

`ProviderEnvelope<T>` contiene `schemaVersion`, `providerCode`, `requestId`, `fetchedAt`, `sourceAvailableAt`, `qualityFlags`, `rawPayloadRef` e `data`. Errori tipizzati: `AUTH`, `RATE_LIMIT`, `TRANSIENT`, `UNSUPPORTED_CAPABILITY`, `NOT_FOUND`, `INVALID_PAYLOAD`, `STALE_DATA`. Missing non viene convertito in zero.

- `FootballDataProvider`: capabilities, fixtures, fixture, standings, team/player stats, availability, lineups, match events e health.
- `OddsProvider`: capabilities e OddsSnapshot con market taxonomy, decimal odds, bookmaker, observed/available time e status.
- `AsOfFeatureRepository`: produce un FeatureManifest; genera `LEAKAGE_DETECTED` per dati futuri o risultato finale.
- `PredictionEngine`: run riproducibile con model/config/seed e output distinti probability, confidence, DQ, fair odds e `ACTIVE|NO_BET`.
- `MarketEngine` e `PlayerEngine`: probabilità normalizzate e player probability vincolata agli xG squadra.
- `CompatibilityEngine`: `COMPATIBLE|INCOMPATIBLE`; `CorrelationEngine`: score e classe separati.
- `ValueEngine`: EV o `UNAVAILABLE` con motivazione.
- `SystemBuilder`: modalità, selezioni, fisse, K/copertura, budget, stake e rischio; zero incompatibili e costo entro budget.
- `FixtureVerifier` e `SettlementEngine`: decisione di verifica e funzione pura di settlement con evidenze/versioni.
- `BacktestRunner`: accetta solo manifest congelato, policy as-of, versioni e seed; accesso a `latest` vietato.

## 5. Data model logico MVP

| Area | Entità principali |
|---|---|
| Source/identity | providers, provider_capabilities, raw_provider_payloads, external_entity_references |
| Football | competitions, seasons, teams, players, memberships, fixtures, fixture_status_events, fixture_result_versions, match_event_versions |
| Snapshot | standings, team/player statistics, availability, lineups e relative righe/entry |
| Markets/odds | market_definitions, market_selections, market_rule_versions, bookmakers, odds_snapshots |
| Model/provenance | model_definitions/versions, prediction_runs, feature_manifests, prediction_feature_snapshots, predictions/snapshots/relations |
| Systems | systems, system_selections, system_combinations, combination_selections, executions, bet_selections |
| Verification | fixture_verifications, settlement_attempts, settlements, payout_ledger_entries, idempotency_keys |
| Analytics | paper portfolios/transactions, backtest_runs, dataset_manifests, evaluations, model_metric_aggregates, betting_metric_aggregates |
| Governance | users, audit_events, job_runs, job_leases |

Vincoli: probability/confidence/DQ in `[0,1]`; decimal odds `>1`; stake `>=0`; snapshot prediction immutabile; settlement univoco per execution selection/result version/rule version; indici as-of e settlement eligibility; FK obbligatorie verso result, taxonomy, model e config version.

## 6. Soglie bootstrap versionate

Queste sono configurazioni iniziali da calibrare, non dichiarazioni di qualità.

- Data Quality: completezza 40%, freshness 25%, reliability 15%, lineup/availability 10%, history depth 10%.
- `NO_BET` se `DQ < 0.65` o `confidence < 0.60`, oppure input essenziali mancanti.
- Scorer: `DQ >= 0.75` e prova di expected starter/minutes.
- Value: quota valida e non più vecchia di 15 minuti per il pre-match, soglia configurabile per mercato.
- Correlazione: LOW `<0.40`; MEDIUM `0.40–0.69`; HIGH `>=0.70`; profilo prudente esclude HIGH.
- Performance: holdout temporale minimo 300 fixture per market family; altrimenti `INSUFFICIENT_SAMPLE`.
- Calibration target: ECE `<=0.05`; nessun bucket con `N>=100` e deviazione assoluta `>0.10`.
- Il modello deve migliorare almeno una proper scoring rule rispetto alla baseline senza peggiorare l'altra oltre il 2%; ROI non è gate primario.

## 7. Protocollo trial provider

Campione: tutte le fixture Serie A di almeno due stagioni concluse (hard minimum 760), stagione corrente/futura, audit stratificato di almeno 100 concluse, 30 future, 20 lineup, 20 casi availability e 20 fixture con quote multi-bookmaker. Ripetere lo stesso subset su Sportmonks quando consentito.

Hard gate:

- fixture/result/standings completeness `>=99%`, stable ID 100%, duplicati canonici zero;
- agreement score/status finale `>=99.5%`;
- team stats core `>=95%`; player identity `>=99%`;
- match event/scorer settlement agreement 100% sul campione manuale;
- almeno due stagioni complete per core features;
- success rate `>=99%`, invalid payload `<=0.5%`, p95 `<=2s`, p99 `<=5s`;
- 429 `<1%` sotto il budget previsto e almeno 30% headroom giornaliero/20% di picco;
- licenza scritta compatibile con caching, persistenza, backtest, uso commerciale e display.

`GO` se tutti gli hard gate passano. `CONDITIONAL GO` se falliscono soltanto odds o player avanzati e c'è un provider separato/capability gating conforme. `NO-GO` per licenza incompatibile, ID instabili, disagreement di settlement, storico insufficiente o budget senza headroom.

## 8. UX acceptance pack

Il prototipo deve coprire Home/Pronostici, dettaglio partita, add compatibile, blocker incompatibile, warning correlazione, builder Automatico/Assistito/Manuale, registrazione Reale/Paper e Storico/Statistiche.

Verifiche obbligatorie: 320, 390, 768, 1024 e 1440 px; nessuno scroll involontario; reflow 200%; target 44×44; WCAG 2.2 AA; keyboard e screen-reader smoke test; zero axe critical/serious; test con almeno 5 utenti e almeno 80% di completamento senza aiuto sui quattro task core, zero issue severe.

La matrice degli stati include default, hover, pressed, focus-visible, disabled motivato e loading per i componenti applicabili; inoltre stale, unavailable, error, insufficient sample, `NO_BET`, incompatible e correlated per i componenti dominio. Colore mai unico veicolo semantico.

## 9. Disposition conflitti C-01…C-17

| ID | Stato |
|---|---|
| C-01 | Resolved: Phase 0 unificata |
| C-02 | Resolved: aggiunte specifiche IA/flow/wireframe/prototipo |
| C-03 | Resolved: Value MUST |
| C-04 | Resolved: fisse MUST |
| C-05 | Resolved: Automatic Builder MUST |
| C-06 | Resolved: catalogo mercati di questo documento |
| C-07 | Resolved: 2+ previsto ma runtime-gated |
| C-08–C-13 | Resolved: snapshot, verification, state/outcome, identity e data model tramite ADR |
| C-14 | Conditional: OddsProvider separato, trial/licenza richiesti |
| C-15 | Resolved: soglie bootstrap versionate e insufficient-sample |
| C-16 | Resolved per Phase 0: auth, ownership, audit, scheduler e secrets; dettaglio hosting in Phase 1 |
| C-17 | Mandatory pre-release: legal/privacy/licenze/responsible use |

## 10. Stato Gate 0

Completati documentalmente: requisiti/scope, IA e flow, ADR, contratti, data model logico, catalogo mercati, semantiche settlement, soglie bootstrap, protocollo trial e riconciliazione backlog.

Evidenze residue non sostituibili con una decisione documentale:

1. API key, trial misurato e verifica licenze API-Football/Sportmonks/odds.
2. Prototipo navigabile, contrast report, test responsive/accessibility e usability con utenti.

Perciò `US-0001 = IN VALIDATION`, `US-0002 = DONE`, `US-0003 = SPEC COMPLETE / VALIDATION PENDING`, `Gate 0 = OPEN`. Bootstrap definitivo, migrazioni e coding core restano bloccati fino alla chiusura di queste evidenze.
