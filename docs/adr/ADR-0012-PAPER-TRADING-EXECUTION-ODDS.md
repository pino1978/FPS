# ADR-0012 — Paper trading richiede quote di esecuzione

## Stato
Accepted — 13/08/2026

## Problema
Il Football Prediction System distingue Fair Odds del modello, quote bookmaker e risultati economici. Il paper trading deve produrre P/L, ROI, yield e drawdown usando lo stesso Settlement Engine delle giocate reali. Se una simulazione economica utilizza automaticamente le Fair Odds, la metrica di betting performance diventa autoreferenziale e confonde probabilità del modello con prezzo di esecuzione.

## Alternative considerate

### A. Usare sempre le Fair Odds come quota paper
**Vantaggi:** nessun input aggiuntivo; paper trading sempre disponibile.

**Svantaggi:** crea una simulazione economicamente artificiale; elimina lo spread tra prezzo teorico e prezzo realmente disponibile; viola la separazione tra Probability/Fair Odds e Value/odds di esecuzione.

### B. Consentire paper trading senza quota e omettere le metriche economiche
**Vantaggi:** permette di classificare una prediction come simulata anche quando le quote non sono disponibili.

**Svantaggi:** genera record paper eterogenei e rende bankroll, ROI e yield incompleti o difficili da interpretare.

### C. Richiedere una quota di esecuzione per reale e paper; consentire il salvataggio senza quota solo come non giocato
**Vantaggi:** mantiene coerenti le metriche economiche; preserva la distinzione tra modello e mercato; rende reali e simulate comparabili usando lo stesso settlement; evita dati inventati.

**Svantaggi:** richiede un input in più all'utente quando il provider non fornisce quote utilizzabili.

## Decisione
Adottare l'alternativa C.

- `NOT_PLAYED`: può essere salvato senza quota.
- `PLAYED`: richiede quota di esecuzione valida.
- `SIMULATED`: richiede quota di esecuzione valida.
- Fair Odds restano una proprietà della prediction originaria e non vengono usate come sostituto automatico delle quote bookmaker.
- Il paper trading usa lo stesso Settlement Engine delle giocate reali, ma rimane escluso dalle Betting Performance reali.

## Impatti
- API History valida le quote per `PLAYED` e `SIMULATED`.
- UI singole e System Builder richiedono quote per reale/paper.
- Report paper trading può calcolare bankroll, P/L, ROI, yield e drawdown senza inventare prezzi.
- Storico prediction, paper trading e denaro reale rimangono separati.

## Requisiti coperti
- SRS: Probability/Value distinti; paper trading; nessun dato inventato.
- Technical Design §15 Value Engine e §21 Storico scommesse.
- Backlog US-1101 / US-1102 e Definition of Done globale.
