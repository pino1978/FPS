# ADR-0015 — Preseason/Test, Daily Highlights e Mobile Navigation

## Stato
Accepted for test release `v1.1.0-beta.1`.

## Problema
Prima dell'inizio della Serie A la classifica corrente contiene un campione nullo o insufficiente. Il quality gate Live restituisce correttamente `NO_BET`, ma questo impedisce di validare l'esperienza end-to-end dell'app. Contestualmente la Home necessita di una gerarchia più simile a una moderna sportsbook: navigazione secondaria nel drawer e pochi suggerimenti in evidenza invece di un elenco piatto.

## Alternative considerate
1. Usare statistiche della stagione precedente come se fossero correnti. Pro: semplice. Contro: falsa freschezza, confidence fuorviante. Scartata.
2. Abbassare i gate Live finché il campionato non parte. Pro: nessuna nuova modalità. Contro: altera implicitamente il modello di produzione e rende i risultati difficili da interpretare. Scartata.
3. Modalità `PRESEASON` esplicita con prior storico versionato, blending progressivo, quality gate dedicato e provenienza visibile. Pro: testabile, riproducibile, trasparente. Contro: richiede un percorso applicativo aggiuntivo. Scelta.

## Decisione — Preseason/Test
- Fonte storica: standings ufficiali football-data.org della stagione precedente tramite filtro `season=YYYY`.
- Nessun dato viene inventato.
- Le squadre prive di storico Serie A compatibile e senza almeno 3 partite correnti restano `NO_BET`.
- Configurazione versionata `preseason-v1`.
- A zero partite correnti il prior storico pesa 100%; il peso corrente cresce linearmente fino al 100% dopo 8 partite.
- Confidence e Data Quality sono calcolate separatamente dalla Probability e hanno gate Preseason dedicati.
- Gli snapshot persistiti includono modalità, stagione storica, dati correnti, dati precedenti, blend e versione config.

## Decisione — In evidenza oggi
La Home mostra da 0 a 4 suggerimenti; nessuno slot è obbligatorio.
- `Pick del giorno`: candidato robusto ordinato da score sintetico basato su Probability, Confidence e Data Quality.
- `Alternativa`: secondo candidato robusto su fixture diversa e vicino al primo per score.
- `Sorpresa`: candidato meno probabile ma con Confidence/Data Quality sufficienti; non viene definito Value in assenza di quota bookmaker.
- `Tentativo`: candidato ad alta varianza, preferibilmente `EXACT_SCORE` o scorer, solo quando il mercato è realmente attivo.

Lo score è usato per ordinamento e non sostituisce le metriche sottostanti. `NO_BET` prevale sempre sulla necessità di riempire gli slot.

## Decisione — Navigazione mobile
- Bottom navigation per `Pronostici`, `Partite`, `Sistema`, `Storico`.
- Burger drawer per modalità dati e sezioni secondarie: `I miei sistemi`, `Statistiche`, `Impostazioni` oltre ai link principali.
- Release visibile nel drawer/header/impostazioni.
- Nomi squadra visualizzati in forma breve nella UI; ID e dati provider restano invariati.

## Impatti
- Nessuna modifica semantica al settlement o allo storico delle prediction già generate.
- Le prediction Preseason sono distinguibili tramite model version e input snapshot.
- La modalità non è una promessa di performance: serve per test e transizione iniziale di stagione.

## Verifica
- Unit test su season resolution, blending e quality envelope.
- Typecheck/build mobile.
- E2E responsive e critical flow esistenti.
- APK generato solo con CI verde.
