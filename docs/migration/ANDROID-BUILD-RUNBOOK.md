# FPS Android Standalone — Build Runbook

## Scope

Target attuale: Android standalone. iOS e Windows sono solo predisposti architetturalmente e non fanno parte della Definition of Done corrente.

## Runtime

- UI: React/TypeScript riusata dalla Web MVP.
- Container: Capacitor.
- Persistenza: SQLite locale.
- Credenziali provider: secure storage del dispositivo.
- Prediction/System Builder/settlement: TypeScript locale.
- Provider: accesso Internet diretto tramite adapter; nessun backend FPS pubblicato è richiesto.

## Prerequisiti build

- Node.js 22+
- Java compatibile con la toolchain Android di Capacitor 8
- Android SDK

## Build riproducibile

```bash
npm install
npm run build -w @fps/domain
npm run build -w @fps/player-engine
npm run build -w @fps/mobile-runtime
npm run build -w @fps/mobile
cd apps/mobile
npx cap add android
npx cap sync android
node scripts/ci-android.mjs
```

Lo script `ci-android.mjs` assembla l'APK debug quando `CI` è impostata. Per una build manuale, dopo `cap sync`:

```bash
cd android
./gradlew assembleDebug
```

Output previsto:

`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

## Prima esecuzione

L'app richiede il token football-data.org. La chiave API-Football è opzionale e abilita enrichment quando disponibile. Le credenziali vengono inserite dall'utente sul dispositivo e non sono incorporate nell'APK.

## Quality gate Android

Prima di dichiarare una release Android:

- security audit production dependencies PASS;
- typecheck PASS;
- unit/integration tests PASS;
- Web MVP regressions PASS sul branch di sviluppo;
- mobile bundle PASS;
- Android Gradle assemble PASS;
- APK installato su device reale;
- fixture -> prediction -> sistema PASS;
- storico e settlement idempotente PASS;
- dati mancanti -> confidence/data quality ridotte o NO_BET/UNAVAILABLE;
- nessun secret nel repository/APK;
- UI verificata su viewport Android reali.

## Branching

- `release/web-mvp-v1`: Web MVP congelata.
- `main`: linea stabile.
- `develop/android-standalone`: sviluppo Android fino al release gate.
