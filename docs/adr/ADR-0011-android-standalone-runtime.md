# ADR-0011 — Android Standalone Runtime Architecture

**Stato:** Accepted  
**Data:** 2026-08-13  
**Branch:** `develop/android-standalone`  
**Baseline Web preservata:** `release/web-mvp-v1` @ `4b99a8f2d51cb3dc4640efd440712bb1687e270b`

## Problema

La baseline v1 definisce FPS come web application con Next.js, API NestJS/Fastify e PostgreSQL. Il target corretto per la nuova linea di prodotto è invece un'applicazione installabile direttamente su Android, senza pubblicazione obbligatoria di frontend/backend FPS e senza riscrittura applicativa in linguaggio nativo.

La variazione riguarda runtime e infrastruttura. I requisiti funzionali, statistici, di qualità dati, versionamento, idempotenza, provider abstraction e UI/UX della baseline restano invariati salvo esplicita modifica documentata.

## Vincoli

- Target implementato ora: Android.
- Distribuzione: APK installabile, Play Store non obbligatorio.
- Nessun server FPS remoto obbligatorio nel normale utilizzo.
- Internet richiesto per i provider esterni quando servono dati aggiornati.
- Codice applicativo: React + TypeScript.
- Capacitor confinato al platform layer.
- Dominio indipendente da Android, Capacitor, SQLite e driver specifici.
- iOS e Windows: sola predisposizione architetturale, nessuna implementazione nello scope attuale.

## Alternative considerate

### A — Conservare esclusivamente l'architettura Web
Pro: nessuna migrazione; segreti server-side.  
Contro: richiede hosting e non soddisfa il target standalone.  
**Decisione:** mantenuta come release Web v1, non come nuovo runtime.

### B — React Native / Expo
Pro: stack mobile consolidato.  
Contro: maggiore riscrittura della UI e minore riuso diretto dell'implementazione esistente.  
**Decisione:** non scelta.

### C — React/TypeScript + Capacitor + storage locale
Pro: massimo riuso del codice attuale; APK installabile; nessun backend FPS remoto obbligatorio; predisposizione futura iOS.  
Contro: richiede sostituzione dei servizi server-side e della persistenza PostgreSQL nel runtime mobile.  
**Decisione:** scelta.

## Architettura target

```text
React UI
   |
Application Services / Use Cases
   |
FPS Domain Core — TypeScript puro
   |
Ports
   +-- Repository Port
   +-- Secure Secret Port
   +-- Provider Port
   +-- Scheduler/Lifecycle Port
   +-- Network/Clock Port
   |
Android adapters
   +-- Capacitor shell
   +-- SQLite repository
   +-- Keystore-backed secure storage
   +-- HTTP provider adapters
```

## Persistenza

Il runtime Android usa SQLite dietro repository abstractions. Il modello logico deve preservare le invarianti della baseline. Le migration locali devono essere versionate e testate.

PostgreSQL/Prisma restano parte della Web MVP congelata ma non sono runtime obbligatorio della nuova app Android.

## Provider e rete

La provider abstraction resta obbligatoria. Il dominio non deve conoscere endpoint o formati proprietari. Retry/backoff, rate limiting, circuit breaker e gestione esplicita dell'assenza di rete restano requisiti di robustezza.

## Segreti

La regola v1 “segreti solo server-side” non è tecnicamente applicabile a un runtime completamente standalone.

Per Android MVP:

- nessuna credenziale committata;
- nessuna credenziale incorporata nel bundle/APK;
- configurazione a runtime;
- persistenza tramite secure-storage adapter con protezione Keystore dove disponibile;
- nessun secret nei log;
- possibilità di sostituzione/rimozione locale;
- verifica dei termini d'uso del provider prima dell'abilitazione nel client installato.

Un secret client-side non offre la stessa protezione di un secret server-side su dispositivo compromesso. Il rischio è accettato solo per il target standalone personale e dovrà essere rivalutato prima di una distribuzione pubblica/multiutente.

## Scheduling

Il runtime mobile non assume un processo server sempre attivo. Le attività periodiche devono usare lifecycle app, refresh esplicito e, solo quando necessario, scheduling Android compatibile con le policy di batteria. L'idempotenza della baseline resta obbligatoria.

## Predisposizione futura iOS/Windows

Nello scope corrente non si creano progetto iOS, IPA, pipeline iOS, progetto desktop, installer o test specifici.

La predisposizione consiste esclusivamente nel mantenere:

- dominio TypeScript puro;
- ports/adapters per i servizi di piattaforma;
- nessun import Android/Capacitor nel dominio;
- storage e secret management dietro interfacce;
- componenti React portabili;
- contratti dati serializzabili e indipendenti dalla piattaforma.

## Impatti

- la Web MVP v1 resta intatta sul branch release;
- la nuova linea viene sviluppata su `develop/android-standalone`;
- i servizi server-side necessari all'app vengono progressivamente trasformati in application services in-process;
- SQLite sostituisce PostgreSQL nel runtime Android;
- i test di dominio vengono riutilizzati;
- vengono aggiunti test di storage/migration e test Android pertinenti;
- il gate di rilascio richiederà un APK installabile e verificato.

## Definition of Done aggiuntiva Android

Oltre ai quality gate già esistenti:

1. APK installabile prodotto con successo;
2. avvio e utilizzo senza server FPS remoto;
3. SQLite e migration verificate;
4. nessun secret embedded in repository, bundle o log;
5. almeno un provider reale verificato dal runtime Android;
6. critical flow esistenti verificati sul runtime Android;
7. comportamento offline/failure provider esplicito;
8. unit test del dominio verdi;
9. integration/E2E Android pertinenti verdi.

## Decisioni rinviate

- implementazione iOS;
- implementazione Windows/Desktop;
- sincronizzazione multi-device;
- distribuzione tramite store;
- backend opzionale futuro per sync/account/secret centralizzati.

Questi elementi non fanno parte dell'attuale Definition of Done.