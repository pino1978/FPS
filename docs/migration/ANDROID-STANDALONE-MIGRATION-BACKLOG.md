# Football Prediction System — Android Standalone Migration Backlog

**Versione:** 1.0  
**Data:** 2026-08-13  
**Stato:** Ready for implementation planning  
**Branch:** `develop/android-standalone`

## 1. Obiettivo

Migrare la Web MVP v1 certificata verso un runtime Android standalone installabile via APK, preservando il dominio e tutti i requisiti MUST non legati alla precedente architettura server/web.

La migrazione non è una riscrittura funzionale. L'obiettivo è sostituire i componenti di runtime necessari mantenendo invarianti i contratti e i comportamenti del prodotto già verificati.

## 2. Gate preliminari

Prima del coding definitivo devono essere chiusi:

- ADR-0011 approvato;
- baseline addendum Android approvato;
- inventory dei package riusabili;
- mappa API backend → application services locali;
- data model SQLite e strategia migration;
- secure storage contract;
- lifecycle/scheduler contract;
- provider compatibility per client installato;
- piano test Android;
- impatto UX degli stati offline/permission/error.

## 3. EPIC A0 — Migration Architecture

### US-A001 — Codebase reuse inventory
**Priorità:** MUST

Task:
- classificare package in `reuse as-is`, `adapt`, `replace`, `web-only`;
- individuare dipendenze Node/server-only;
- individuare dipendenze Next.js server-side;
- individuare accessi diretti a Prisma/PostgreSQL;
- individuare punti di accesso HTTP interni oggi usati dalla UI.

Acceptance criteria:
- inventory versionata nel repository;
- nessun package critico senza classificazione;
- dipendenze bloccanti Android identificate.

### US-A002 — Platform ports
**Priorità:** MUST

Definire contratti per:
- repository/storage;
- secure secrets;
- provider networking;
- clock;
- connectivity;
- lifecycle/scheduling;
- logging/audit locale.

Acceptance criteria:
- nessun import Capacitor/Android nei package dominio;
- contratti TypeScript testabili con fake/in-memory adapter.

### US-A003 — API-to-use-case mapping
**Priorità:** MUST

Task:
- mappare endpoint NestJS usati dall'app verso use case locali;
- separare orchestrazione applicativa da transport HTTP;
- conservare validazioni e regole di dominio.

Acceptance criteria:
- matrice endpoint → use case completa;
- nessuna regola di dominio persa nel passaggio in-process.

## 4. EPIC A1 — Local Persistence

### US-A101 — SQLite data model
**Priorità:** MUST

Task:
- tradurre il modello logico PostgreSQL/Prisma in schema SQLite;
- preservare ID, relazioni, versioni, timestamp e invarianti;
- definire indici necessari;
- definire policy di retention per payload/raw snapshot.

Acceptance criteria:
- mapping entity-by-entity documentato;
- prediction/input storici non mutabili per effetto della migrazione;
- settlement separato dagli snapshot prediction.

### US-A102 — Versioned SQLite migrations
**Priorità:** MUST

Acceptance criteria:
- schema iniziale creato tramite migration versionata;
- upgrade da versione N a N+1 testabile;
- migration ripetuta non corrompe dati;
- failure gestita esplicitamente.

### US-A103 — Repository adapters
**Priorità:** MUST

Acceptance criteria:
- domain/application layer usa solo repository ports;
- integration test sui flussi principali;
- nessuna query SQLite sparsa nella UI o nel dominio.

## 5. EPIC A2 — Android Container

### US-A201 — Capacitor Android shell
**Priorità:** MUST

Task:
- introdurre Capacitor;
- generare esclusivamente il target Android;
- configurare bundle/app id, versioning e build;
- verificare cold start e resume.

Acceptance criteria:
- debug APK prodotto;
- installazione su almeno un dispositivo/emulatore;
- nessun progetto iOS creato.

### US-A202 — Production-like APK pipeline
**Priorità:** MUST

Acceptance criteria:
- build riproducibile;
- artifact APK disponibile dalla pipeline prevista;
- versione applicativa tracciabile al commit;
- nessun secret incluso nell'artifact.

## 6. EPIC A3 — Provider & Secure Configuration

### US-A301 — Secure provider configuration
**Priorità:** MUST

Task:
- definire schermata/configurazione locale;
- salvare credenziali tramite secure secret port;
- consentire test connessione, modifica e rimozione.

Acceptance criteria:
- nessun secret in repository/bundle/log;
- credenziale non restituita in chiaro dalla UI dopo il salvataggio;
- cancellazione effettiva verificata.

### US-A302 — Provider adapter mobile compatibility
**Priorità:** MUST

Task:
- verificare HTTP stack/browser restrictions/CORS applicabili nel WebView;
- verificare termini d'uso per client installato;
- adattare retry/backoff/rate limit al mobile;
- verificare almeno un provider reale.

Acceptance criteria:
- provider reale raggiungibile dal runtime Android;
- errori rete/rate limit gestiti;
- nessun dato mancante inventato.

## 7. EPIC A4 — Lifecycle, Refresh & Settlement

### US-A401 — App lifecycle refresh
**Priorità:** MUST

Acceptance criteria:
- refresh controllato su start/resume quando necessario;
- nessun loop o duplicazione ingestion;
- stato offline riconosciuto.

### US-A402 — Mobile settlement trigger
**Priorità:** MUST

Acceptance criteria:
- record eleggibili verificati quando l'app torna attiva o su refresh;
- record già consolidati non riprocessati;
- force refresh resta esplicito;
- comportamento idempotente coperto da test.

### US-A403 — Background execution decision
**Priorità:** SHOULD

Prima di implementare background scheduling, produrre nota tecnica che dimostri che start/resume/manual refresh non sono sufficienti.

Non introdurre servizi background permanenti per semplice analogia con il server precedente.

## 8. EPIC A5 — UI Adaptation

### US-A501 — Mobile shell adaptation
**Priorità:** MUST

Task:
- eliminare dipendenze da URL/server FPS interno;
- mantenere design system e navigation mobile-first;
- gestire safe area, tastiera e lifecycle mobile.

### US-A502 — Offline and degraded states
**Priorità:** MUST

Acceptance criteria:
- offline distinto da errore applicativo;
- dati cached/storici chiaramente riconoscibili;
- azioni che richiedono rete disabilitate o spiegate;
- Data Quality/Confidence non falsificate.

### US-A503 — Large screen portability
**Priorità:** SHOULD

Mantenere componenti e layout responsivi senza implementare Windows/Desktop. Nessun lavoro specifico Tauri/Electron.

## 9. EPIC A6 — Validation & Regression

### US-A601 — Domain regression suite
**Priorità:** MUST

Acceptance criteria:
- suite dominio Web MVP riutilizzata e verde;
- nessuna regressione su algoritmi/versioning/invarianti.

### US-A602 — SQLite integration suite
**Priorità:** MUST

Copertura:
- persistence;
- migrations;
- immutable history;
- idempotent refresh/settlement;
- recovery da errori storage.

### US-A603 — Android critical E2E
**Priorità:** MUST

Flussi minimi:
1. configurazione provider → fixture/data refresh;
2. fixture → prediction → selezione → sistema;
3. stato salvato → evento concluso → settlement → storico;
4. incompatibilità → blocco;
5. record già verificato → nessun riprocessamento;
6. offline → stato degradato corretto → recovery quando torna rete.

### US-A604 — Android release audit
**Priorità:** MUST

Acceptance criteria:
- APK installato e smoke testato;
- test/typecheck/build verdi;
- security checks pertinenti verdi;
- nessun secret nell'artifact;
- MUST baseline verificati;
- ADR/documentazione aggiornati;
- release decision esplicita.

## 10. Sequenza raccomandata

### Phase A0 — Architecture Gate
- US-A001
- US-A002
- US-A003
- decisioni storage/secret/provider/lifecycle

### Phase A1 — Persistence
- US-A101
- US-A102
- US-A103

### Phase A2 — Android shell
- US-A201
- US-A202

### Phase A3 — Provider configuration
- US-A301
- US-A302

### Phase A4 — Application migration
- API → use case locali
- UI adaptation
- lifecycle/refresh/settlement

### Phase A5 — Validation
- US-A601
- US-A602
- US-A603
- US-A604

## 11. Definition of Done globale della migrazione

La migrazione Android è completa soltanto se:

- la Web MVP v1 resta intatta e recuperabile;
- il nuovo runtime non richiede backend FPS remoto;
- APK installabile verificato;
- storage locale versionato;
- secret management conforme ad ADR-0011;
- provider abstraction mantenuta;
- requisiti funzionali/statistici MUST non regressivi;
- critical flows verificati su Android;
- comportamento offline/error definito;
- test dominio, integration ed E2E pertinenti verdi;
- documentazione aggiornata;
- iOS e Windows non hanno introdotto scope/tempo implementativo oltre alla predisposizione architetturale.