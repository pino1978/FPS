# Design System V2 — Mobile Predictions

## Scope
Riprogettazione UX/UI di Pronostici, Partite e navigazione mobile senza modificare Prediction Engine, settlement o provider contracts.

## Decisione
La partita è l'unità primaria di interazione. I mercati sono mostrati tramite progressive disclosure dentro una MatchCard collassabile. Non si usa un accordion per squadra perché i mercati sono evento-centrici e la stessa squadra compare in più fixture.

## Navigazione mobile
Bottom navigation a una mano:
- Pronostici
- Partite
- Sistema
- Storico
- Altro

`Altro` contiene I miei sistemi, Statistiche e Impostazioni/diagnostica quando disponibili.

## Pronostici
Toolbar:
- competition selector;
- date scope;
- ricerca;
- apertura filtri avanzati.

Quick chips orizzontali:
- Tutti
- Top Pick
- 1X2
- Gol
- O/U
- Team
- Value
- NO BET

Filtri avanzati in bottom sheet/panel:
- periodo;
- mercato;
- squadra;
- probability minima;
- confidence minima;
- data quality minima;
- solo Value;
- stato ACTIVE / NO_BET;
- ordinamento per orario, probability, confidence, data quality.

Le soglie sono solo filtri di presentazione: non modificano le soglie qualitative del motore.

## MatchCard compatta
Stato collassato:
- data/ora e competition;
- home/away;
- stato evento;
- un solo Top Pick;
- Probability;
- Confidence;
- Data Quality;
- Value se disponibile;
- CTA `+ Sistema`;
- affordance per espansione.

Stato espanso:
- categorie Esito / Gol / Team / Risultati / Combinazioni;
- mercati disponibili della fixture;
- `NO_BET` con reason;
- link Analisi completa.

## Dettaglio partita
Mantiene le categorie previste dalla baseline: Overview, Esiti, Gol, Giocatori, Corner, Cartellini, Analisi. Mercati e intelligence restano progressive disclosure.

## System Slip
Desktop: tray persistente.
Mobile: floating bottom bar sopra la bottom navigation, visibile quando esistono selezioni, con conteggio e CTA Apri sistema.

## Stati
Devono essere progettati e testati: loading, empty, error, disabled, selected, ACTIVE, NO_BET.

## Accessibilità
- touch target >= 44 px dove applicabile;
- focus visible;
- label/aria per expand, filter e add-to-system;
- colore mai unico vettore per stato.

## Acceptance mapping
- US-1301: navigazione mobile a una mano.
- US-1302: eventi organizzati, migliori pick rapidamente visibili, indicatori distinti, NO_BET elegante, + Sistema immediato.
- US-1303: progressive disclosure e categorie facilmente navigabili.
- US-0003: chip, card, filters, bottom navigation e stati coerenti con il design system.
