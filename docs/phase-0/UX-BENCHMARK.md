# Phase 0 — UX/UI Benchmark

**Data:** 2026-08-12  
**Obiettivo:** derivare pattern UX professionali senza copiare branding o identità proprietarie.

## Evidenze
Il benchmark di sportsbook e app sportive evidenzia come fattori critici: velocità, navigazione prevedibile, pochi tap, bet slip immediato, mercati organizzati e stabilità mobile. Feedback utenti recenti penalizzano menu profondi, controlli piccoli, liste player nascoste e perdita dello stato durante la navigazione.

## Pattern adottati
1. **Mobile-first / thumb-first** — CTA primarie nella zona raggiungibile con una mano.
2. **Bottom navigation** — Pronostici, Partite, Sistema, Storico, Altro.
3. **System Slip persistente** — compare solo con almeno una selezione e non copre la navigazione.
4. **Progressive disclosure** — top picks subito; statistiche e mercati avanzati su richiesta.
5. **Dettaglio partita per tab** — Overview, Esiti, Gol, Giocatori, Corner, Cartellini, Analisi.
6. **Market chips grandi e leggibili** — probabilità e quota non devono competere visivamente.
7. **Feedback immediato** — incompatibilità bloccata; correlazione segnalata ma distinta.
8. **Preservazione stato** — tornando indietro filtri, tab e system slip restano invariati.
9. **Skeleton e empty/error state** progettati, non schermate vuote.
10. **No Bet** rappresentato come stato informativo, non come errore.

## Anti-pattern vietati
- dashboard tecnica come home;
- tabelle dense su mobile;
- più di due livelli di navigazione per trovare un mercato core;
- CTA solo tramite icone ambigue;
- probabilità, confidence, data quality e value fuse in un unico numero;
- rosso/verde come unico discriminante accessibile;
- reset del system slip cambiando schermata;
- scrolling orizzontale per contenuti ordinari;
- modali per operazioni frequenti quando basta inline/bottom sheet.

## Information architecture v1
### Pronostici
- data/competition filter
- top picks
- fixture cards
- quick add

### Partite
- calendario
- competizioni
- ricerca
- fixture detail

### Sistema
- Automatico
- Assistito
- Manuale/Avanzato
- riepilogo costo/budget/rischio/copertura

### Storico
- Prediction
- Paper trading
- Giocate reali
- Pending / Settled

### Statistiche
- Model Performance
- Betting Performance
- breakdown per mercato/campionato/modello

## Flusso critico
`Pronostici -> fixture -> mercato -> aggiungi -> System Slip -> scegli modalità -> verifica compatibilità/correlazione -> costo/budget -> salva -> opzionale played=true -> storico -> settlement`

## Accessibilità
- touch target minimo 44x44 CSS px;
- focus visibile;
- label testuali per stati critici;
- contrasto WCAG AA come target;
- numeri e percentuali accompagnati da label;
- supporto 320 px senza overflow funzionale.

## Benchmark outcome
FPS non deve imitare un bookmaker: deve combinare la velocità di selezione di uno sportsbook con la leggibilità di un'app analytics/fintech. Il vantaggio UX è mostrare **prima la decisione**, poi l'evidenza statistica.
