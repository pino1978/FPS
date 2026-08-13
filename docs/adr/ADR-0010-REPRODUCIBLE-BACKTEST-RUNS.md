# ADR-0010 — Backtest riproducibili su snapshot immutabili

- **Stato:** Accepted
- **Data:** 2026-08-13
- **Ambito:** Backtesting, analytics, model validation

## Problema

SRS e backlog impongono assenza di data leakage, selezione di competition/season/date range/model version, output persistito e riproducibilità. Un backtest che rilegge dati correnti o ricostruisce feature dopo il kickoff può produrre risultati non confrontabili e statisticamente invalidi.

## Alternative considerate

### A. Ricalcolo storico dai dati correnti

**Vantaggi**
- implementazione semplice.

**Svantaggi**
- rischio elevato di data leakage;
- risultati non riproducibili;
- impossibilità di dimostrare quali input fossero disponibili al tempo della prediction.

### B. Replay degli snapshot prediction immutabili — scelta

Il runner utilizza solo `PredictionRun` con `asOf < eventAt` e `inputSnapshot != null`, quindi valuta le prediction già congelate prima del kickoff. Gli outcome arrivano dal settlement append-only.

**Vantaggi**
- anti-leakage verificabile;
- model version preservata;
- input auditabili;
- confronto coerente tra run.

**Svantaggi**
- il backtest può coprire soltanto periodi per cui esistono snapshot storici validi;
- la profondità storica dipende dalla raccolta dati disponibile.

### C. Persistire soltanto le metriche aggregate

**Vantaggi**
- storage minimo.

**Svantaggi**
- non consente di dimostrare l'esatto insieme di input utilizzato;
- una successiva aggiunta di snapshot allo stesso periodo può rendere ambiguo il run originario.

### D. Persistire fingerprint + snapshot IDs — scelta

Ogni run conserva nel `parameters` la stagione, gli ID degli snapshot utilizzati e un fingerprint SHA-256 costruito sui dati rilevanti del replay. Se lo stesso insieme di input/versione viene richiesto nuovamente, il run persistito viene riutilizzato.

## Decisione

1. Gate anti-leakage obbligatorio: `asOf < eventAt AND inputSnapshot != null`.
2. Il runner accetta competition, season, date range e model version.
3. `season` è metadata esplicita del run; se omessa viene derivata dal range e non usata per inventare dati mancanti.
4. Ogni run persiste `snapshotIds` e `inputFingerprint`.
5. A parità di query e fingerprint, il backend riusa il run esistente anziché creare duplicati.
6. Le metriche includono Brier score, log loss, calibration buckets/error, breakdown per mercato/confidence/periodo.
7. ROI/yield virtuali sono calcolati solo per snapshot con una `offeredOdds` storica realmente disponibile; le fair odds non vengono usate come quota bookmaker.
8. La coverage delle quote storiche è esposta esplicitamente.

## Impatti

- I risultati possono essere auditati fino ai singoli snapshot.
- Nuovi snapshot acquisiti successivamente producono un fingerprint differente e quindi un nuovo run, senza sovrascrivere il precedente.
- Il backtest non pretende una profondità storica che il provider/dataset non possiede.
- La validazione economica non inventa quote mancanti.

## Conseguenze operative

Qualunque futura ricostruzione di feature storiche dovrà conservare timestamp e versione e rispettare lo stesso cutoff pre-kickoff. L'introduzione di un nuovo modello o di una nuova calibrazione richiede una nuova model version confrontabile con le precedenti.
