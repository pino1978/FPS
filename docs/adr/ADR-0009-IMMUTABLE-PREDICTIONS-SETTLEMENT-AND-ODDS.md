# ADR-0009 — Prediction immutabili, settlement separato e quote on-demand

- **Stato:** Accepted
- **Data:** 2026-08-13
- **Ambito:** Prediction, Settlement, Odds/Value, storico

## Problema

L'SRS richiede che prediction storiche e relativi input restino immutabili/versionati, che il Settlement Engine sia idempotente e che Probability e Value restino concetti distinti. Il vincolo di progetto richiede inoltre l'uso esclusivo di fonti gratuite/open data; API-Football Free ha un budget di chiamate limitato.

Scrivere l'esito direttamente nello stesso record della prediction renderebbe lo snapshot storico mutabile. Recuperare quote e risultati ripetutamente consumerebbe inutilmente il free tier e aumenterebbe il rischio di inconsistenza.

Lo storico richiede inoltre che una giocata o una selezione di sistema continui a mostrare la prediction originaria anche dopo nuove rigenerazioni del modello. Ricostruire tale contesto interrogando ogni volta "l'ultima prediction" introdurrebbe ambiguità temporale.

## Alternative considerate

### A. Aggiornare direttamente `PredictionSnapshot`

**Vantaggi**
- modello dati più semplice;
- query immediate.

**Svantaggi**
- viola l'immutabilità dello snapshot originario;
- mescola forecast e osservazione successiva;
- rende più debole l'audit del backtesting.

### B. Settlement append-only separato — scelta

`PredictionSnapshot` conserva esclusivamente ciò che era noto/calcolato al momento della prediction. `PredictionSettlement` registra successivamente outcome, timestamp, result version ed evidenza.

**Vantaggi**
- immutabilità reale;
- audit completo;
- backtest riproducibile;
- idempotenza tramite vincolo unique su `snapshotId`.

**Svantaggi**
- query leggermente più articolate;
- necessità di join per analytics.

### C. Quote recuperate a ogni caricamento pagina

**Vantaggi**
- semplicità frontend.

**Svantaggi**
- spreco del rate limit gratuito;
- assenza di storico affidabile;
- impossibilità di riprodurre Value/EV storici.

### D. Quote on-demand + snapshot append-only — scelta

Il dettaglio partita richiede le quote soltanto quando l'utente apre la sezione Value. Le offerte disponibili vengono normalizzate e memorizzate in `OddsSnapshot` con fingerprint univoco, provider timestamp e captured timestamp.

### E. Ricostruire la prediction originaria dinamicamente dallo storico prediction

**Vantaggi**
- nessuna duplicazione nei record bet/system.

**Svantaggi**
- una nuova prediction per la stessa fixture/mercato rende ambiguo quale snapshot fosse quello visto al momento della giocata;
- query più complesse e maggiore rischio di associare uno snapshot posteriore alla decisione dell'utente.

### F. Proiezione immutabile della prediction originaria nella bet/selezione sistema — scelta

Quando una bet o un sistema vengono salvati, il backend individua l'ultimo `PredictionSnapshot` compatibile generato prima del kickoff e copia nel record storico i soli campi necessari alla lettura/audit: probability, confidence, data quality, fair odds, model version e captured timestamp. Lo snapshot sorgente resta la source of truth immutabile; la proiezione serve a congelare il contesto decisionale.

**Vantaggi**
- storico stabile anche dopo nuove prediction;
- lettura efficiente;
- nessun rischio di associare retroattivamente una prediction successiva.

**Svantaggi**
- duplicazione controllata di alcuni campi;
- necessità di mantenere esplicito che i campi `origin*` sono una proiezione e non una seconda source of truth.

## Decisione

1. Le prediction v2 sono snapshot immutabili.
2. Gli outcome sono conservati in `PredictionSettlement` separato.
3. Il settlement normale non modifica i campi forecast originari.
4. Il risultato di una fixture viene recuperato al massimo una volta per singolo ciclo del Settlement Engine e riusato per tutte le selezioni/prediction collegate.
5. I record già `VERIFIED` non vengono interrogati nuovamente nel normale ciclo.
6. Quote e Value sono caricati on-demand.
7. Ogni quota disponibile viene archiviata come `OddsSnapshot` append-only; non viene sovrascritta.
8. Se il provider gratuito non offre quote, `Value = UNAVAILABLE`; nessuna quota viene inventata.
9. Fair Odds derivano esclusivamente dalla probabilità del modello; bookmaker odds, Edge ed EV rimangono campi distinti.
10. Bet e `SystemSelection` congelano una proiezione `origin*` della prediction disponibile prima del kickoff; questa proiezione non viene aggiornata durante execution/settlement.
11. Lo storico prediction resta interrogabile direttamente dagli snapshot immutabili, separatamente da bet reali e paper trading.

## Impatti

- Il Backtest Runner può applicare il gate `asOf < eventAt` e utilizzare input snapshot congelati.
- Model Performance può essere ricostruita senza modificare dati previsionali storici.
- Value storico può essere riprodotto solo quando esiste uno snapshot quote valido.
- Il consumo delle API gratuite è ridotto tramite cache, caricamento on-demand e riuso del risultato fixture.
- I campi legacy `outcome/settledAt/resultVersion` restano temporaneamente nello schema soltanto per backward compatibility; il flusso v2 non li scrive e la source of truth è `PredictionSettlement`.
- I campi `origin*` di Bet/SystemSelection sono denormalizzazioni immutabili del contesto decisionale e non sostituiscono `PredictionSnapshot`.

## Conseguenze operative

Qualunque nuova feature che richieda dati successivi al kickoff deve registrarli in una struttura di osservazione/settlement separata e non modificare lo snapshot originario della prediction.

Qualunque modifica all'esecuzione di una bet (`PLAYED`, `SIMULATED`, `NOT_PLAYED`, bookmaker, stake, quota effettiva) non deve riscrivere i campi `origin*` già acquisiti.
