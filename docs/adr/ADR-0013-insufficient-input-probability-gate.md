# ADR-0013 — Insufficient Input Probability Gate

**Stato:** Accepted  
**Data:** 2026-08-14

## Problema
Con standings privi di partite giocate, i rate per-game possono risultare zero e il Goal Model applica il minimo configurato ai lambda. La matrice Poisson risultante può quindi produrre probabilità estreme pur senza evidenza statistica sufficiente.

## Alternative considerate
1. Limitare artificialmente le probabilità estreme: rifiutata, perché introdurrebbe una euristica non calibrata.
2. Continuare a calcolare e mostrare le probabilità marcandole NO_BET: rifiutata, perché esporrebbe falsa precisione.
3. Fermare la generazione dei mercati quando gli input essenziali sono insufficienti: scelta.

## Decisione
Il runtime richiede almeno 3 partite giocate per entrambe le squadre e statistiche numeriche valide prima di invocare il Goal/Market Engine. Se il gate non è superato, restituisce solo `NO_BET`, con xG non esposti e motivazione esplicita. Se Confidence o Data Quality non superano le soglie bootstrap, i mercati operativi non vengono esposti.

## Impatti
- Nessun cap artificiale a 98/99/100%.
- Nessun dato mancante viene trasformato in informazione predittiva.
- A inizio stagione possono esserci più `NO_BET`.
- Le probabilità numeriche restano disponibili solo per mercati generati con input minimi validi.
- Il comportamento è deterministico, versionabile e backtestabile.
