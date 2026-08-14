# ADR-0006 — Premium sportsbook UI e compatibility gate preventivo

## Problema
La UI precedente era funzionale ma con qualità percepita insufficiente, scarsa gerarchia visiva e System Slip poco presente. Inoltre una selezione incompatibile poteva essere inserita nel bag e bloccata soltanto durante l'analisi/costruzione del sistema.

## Vincoli
- SRS FR-COMP-002/003/004: tassonomia/regole nel dominio, incompatibili non ammesse, feedback comprensibile.
- Backlog US-0602/US-0701: incompatibilità gestite al momento dell'aggiunta.
- Technical Design §30-31: qualità sportsbook/fintech, System Slip sempre accessibile, progressive disclosure, Design System completo.

## Alternative considerate
1. Mantenere UI chiara e aggiungere solo colori. Pro: costo minimo. Contro: non risolve information hierarchy e qualità percepita.
2. Tema scuro solo CSS sulla UI esistente. Pro: rapido. Contro: struttura ancora basic e System Slip non integrato.
3. Nuova shell premium con hero, brand, highlight semantici, campionato/schedina affiancati su desktop, bottom navigation/slip mobile e compatibility gate preventivo. Pro: coerente con benchmark e requisiti. Contro: maggiore superficie di QA.

## Decisione
Adottare l'alternativa 3.

La UI usa token dark premium, accenti funzionali distinti (safe/alternative/surprise/try), hero sportiva non legata a branding di terzi, card dense e leggibili, giornate collassabili, System Slip sticky su desktop e persistente su mobile.

Prima di aggiungere manualmente una nuova selezione, la UI invoca `/v2/systems/analyze` con bag corrente + candidata. Il backend locale delega a `compatibility()` del dominio. Se `INCOMPATIBLE`, la selezione non viene aggiunta e la UI indica la selezione in conflitto. Le correlazioni non vengono bloccate: rimangono distinte dalle incompatibilità.

## Impatti
- Nessuna modifica agli algoritmi predittivi.
- Nessuna duplicazione di regole di incompatibilità nella UI.
- Maggior carico E2E su desktop/mobile e sui flussi add/remove/conflict.
- Nuovi asset SVG locali e Design System premium.

## Stato
Accepted — 2026-08-14
