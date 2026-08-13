# Football Prediction System — Android Standalone Baseline Addendum

**Versione:** 1.0  
**Data:** 2026-08-13  
**Stato:** Vincolante per `develop/android-standalone`  
**ADR di riferimento:** `docs/adr/ADR-0011-android-standalone-runtime.md`

## 1. Scopo

Questo addendum integra e modifica esclusivamente gli aspetti di piattaforma, runtime, persistenza, deployment e gestione segreti della baseline v1 composta da:

1. `FOOTBALL-PREDICTION-SYSTEM-SRS.md`
2. `FOOTBALL-PREDICTION-SYSTEM-TECHNICAL-DESIGN.md`
3. `FOOTBALL-PREDICTION-SYSTEM-MVP-BACKLOG.md`

I requisiti funzionali, statistici, di qualità, UX/UI e di dominio restano vincolanti salvo quanto esplicitamente sostituito qui.

La Web MVP v1 rimane preservata sul branch `release/web-mvp-v1` e non viene retroattivamente modificata.

## 2. Clausole sostituite

### 2.1 Target applicativo

La formulazione SRS “web application professionale, mobile-first” viene sostituita, per la nuova linea Android, da:

> Realizzare una applicazione standalone professionale, mobile-first, installabile su Android tramite APK, basata su React + TypeScript e senza dipendenza obbligatoria da un server FPS remoto pubblicato.

### 2.2 Architettura applicativa

La catena Technical Design:

```text
API Backend
  |
Mobile-first Web UI
```

non è più il runtime target della nuova linea. Viene sostituita da:

```text
React UI
  |
Application Services / Use Cases
  |
Domain Core
  |
Platform Ports
  |
Android Adapters
```

### 2.3 Stack runtime

Per Android MVP:

- React + TypeScript restano lo stack UI/applicativo;
- Capacitor è il contenitore Android;
- SQLite è la persistenza locale;
- NestJS/Fastify e PostgreSQL/Prisma non sono runtime obbligatori;
- il dominio resta TypeScript puro e indipendente dalla piattaforma.

### 2.4 Deployment

La decisione “Hosting” viene sostituita da:

- nessun hosting FPS obbligatorio;
- distribuzione iniziale tramite APK installabile;
- Play Store non necessario alla Definition of Done;
- Internet usato quando servono dati dei provider esterni.

### 2.5 Segreti provider

La regola “segreti provider solo server-side” è sostituita da:

- credenziali mai nel repository;
- credenziali mai embedded nel bundle/APK;
- configurazione a runtime;
- secure storage tramite adapter con Android Keystore dove disponibile;
- nessun secret nei log;
- verifica preventiva delle condizioni d'uso del provider per client installato.

Il rischio residuo di un secret client-side su dispositivo compromesso è accettato solo per l'uso standalone personale e deve essere rivalutato prima di eventuale distribuzione pubblica.

### 2.6 Scheduler

I job non possono assumere un processo server sempre attivo. Le attività periodiche vengono adattate al lifecycle mobile mediante:

- refresh all'apertura/ripresa;
- refresh esplicito;
- background scheduling Android solo quando necessario e compatibile con le policy del sistema.

L'idempotenza e il divieto di riprocessare record già verificati restano invariati.

## 3. Requisiti non modificati

Restano invariati e vincolanti, tra gli altri:

- provider abstraction;
- probability, confidence e data quality separate;
- `NO_BET` come risultato valido;
- dati mancanti non inventati;
- prediction e input storici immutabili/versionati;
- prevenzione data leakage;
- compatibility e correlation separate;
- settlement idempotente;
- separazione prediction / simulazione / reale;
- Model Performance distinta da Betting Performance;
- backtesting e paper trading;
- UI/UX premium, mobile-first, accessibile e coerente;
- test, typecheck/build e documentazione come parte della Definition of Done.

## 4. Scope piattaforme

### Android
**IN SCOPE / P0**

- shell Capacitor;
- APK;
- storage SQLite;
- secure storage;
- provider networking;
- lifecycle/scheduling mobile;
- test pertinenti Android.

### iOS
**OUT OF SCOPE — FUTURE READY**

Non creare progetto iOS, IPA, pipeline o test iOS. La sola predisposizione richiesta è l'indipendenza del core e dei componenti applicativi dalla piattaforma Android.

### Windows/Desktop
**OUT OF SCOPE — FUTURE READY**

Non creare runtime desktop, Tauri/Electron, installer o test desktop. La sola predisposizione richiesta è la presenza di ports/adapters e codice React/TypeScript portabile.

## 5. Regola di compatibilità futura

Nessuna feature Android può introdurre dipendenze Android/Capacitor direttamente nel domain core. Ogni accesso a storage, secret, filesystem, rete, clock o lifecycle che abbia semantica di piattaforma deve essere mediato da una porta/interfaccia.

## 6. Nuovo gate di rilascio Android

L'MVP Android non è pronto finché non sono soddisfatti, oltre ai gate funzionali esistenti:

- APK prodotto e installato con successo;
- applicazione avviabile senza server FPS remoto;
- migration SQLite versionate e testate;
- nessun secret embedded;
- provider reale verificato dal dispositivo/runtime Android;
- critical flow del prodotto verificati sul runtime Android;
- comportamento offline/error/provider unavailable progettato e testato;
- test dominio ancora verdi;
- integration/E2E Android pertinenti verdi;
- documentazione e ADR aggiornati.

## 7. Ordine di responsabilità documentale sul branch Android

Per le decisioni relative alla nuova piattaforma, l'ordine è:

1. SRS v1 per requisiti funzionali/prodotto;
2. questo Addendum per override di piattaforma/runtime;
3. Technical Design v1 per dominio/algoritmi non sostituiti;
4. ADR-0011 per motivazione e trade-off;
5. MVP Backlog v1 per requisiti/storie non sostituite;
6. Android Migration Backlog per la sequenza di migrazione.

In caso di conflitto di piattaforma, prevale questo addendum. Nessun MUST funzionale può essere rimosso per effetto della migrazione.