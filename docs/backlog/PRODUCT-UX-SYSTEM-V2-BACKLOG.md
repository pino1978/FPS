# Football Prediction System — Product UX & System Flow v2 Backlog

**Data:** 15/08/2026  
**Stato:** APPROVED FOR IMPLEMENTATION  
**Owner:** Orchestrator  
**Fonti vincolanti:** `docs/baseline/FOOTBALL-PREDICTION-SYSTEM-SRS.md`, `docs/baseline/FOOTBALL-PREDICTION-SYSTEM-TECHNICAL-DESIGN.md`, `docs/baseline/FOOTBALL-PREDICTION-SYSTEM-MVP-BACKLOG.md`  

> Questo backlog incrementale traccia le modifiche concordate durante la review UX/UI e System Builder. Non sostituisce i documenti baseline e non può indebolire requisiti MUST esistenti.

---

# EPIC UX2 — Premium UX/UI & information architecture

## US-UX2-01 — Esperienza autoesplicativa senza tutorial permanente

**Priorità:** MUST

### Obiettivo
Rendere i flussi comprensibili attraverso gerarchia, microcopy, stato visuale e feedback, senza richiedere una guida per capire cosa fare.

### Acceptance criteria
- Nessun termine tecnico interno è necessario per completare il flusso principale.
- Label come `HOME`, `AWAY`, `DQ`, `NO_BET` tecnico e simili sono tradotte in microcopy comprensibile nel contesto.
- Esempio: `AWAY` -> `Vince <squadra ospite>`.
- Probability, Confidence, Data Quality e Value restano concetti distinti.
- I dettagli tecnici sono disponibili tramite progressive disclosure.
- Ogni azione modifica immediatamente e chiaramente lo stato visuale.

## US-UX2-02 — Visual design premium sportsbook/fintech

**Priorità:** MUST

### Task
- Consolidare palette dark premium e predisposizione light mode.
- Header/brand FPS riconoscibile.
- Hero sportiva non invasiva.
- Tipografia più compatta e professionale.
- Ridurre font size e spaziature eccessive.
- Definire colori semantici per azioni, selezioni, warning, incompatibilità, confidence e stato dati.
- Card, chip, filtri, navigation e system slip coerenti con Design System.
- Alternanza odd/even leggera nelle liste dense dove migliora la scansione.

### Acceptance criteria
- Qualità percepita comparabile a moderna app consumer/sportsbook, senza copiare branding proprietario.
- Nessuna schermata ha aspetto da gestionale tecnico.
- Stati default/hover/pressed/focus/disabled/selected/error progettati.
- Responsive verificato a 320px, smartphone comune, tablet e desktop.
- Contrasto e touch target accessibili.

## US-UX2-03 — Home e quattro pronostici in evidenza

**Priorità:** MUST

### Acceptance criteria
- Massimo 4 pronostici in evidenza.
- Categorie comprensibili: `Più affidabile`, `Interessante/Alternativa`, `Sorpresa`, `Tentativo` o nomenclatura finale validata UX.
- Ogni card mostra almeno squadre, mercato leggibile, probabilità, affidabilità, data e ora.
- Nessuna promessa di vincita o certezza.
- Card compatte e visivamente differenziate senza sovraccarico.

## US-UX2-04 — Campionato, giornate e partite

**Priorità:** MUST

### Acceptance criteria
- Navigazione primaria per giornata di campionato.
- Ogni giornata mostra numero giornata e data/intervallo date.
- Le giornate sono collassabili.
- Le partite sono card/righe compatte; il dettaglio completo si apre su richiesta.
- Le righe possono usare alternanza odd/even leggera.
- Nomi squadra abbreviati in modo naturale dove opportuno (es. `Como`, non denominazioni societarie estese).
- Filtri base semplici; filtri avanzati nascosti dietro progressive disclosure.

## US-UX2-05 — Dettaglio partita e mercati

**Priorità:** MUST

### Acceptance criteria
- Prima viewport: partita, data/ora, pronostico principale, probability, confidence e azione Sistema.
- Mercati raggruppati per categorie/accordion: Esito, Gol, Over/Under, Risultato esatto, Marcatori, altri mercati.
- Analisi e dati avanzati chiusi di default.
- Se una selezione è già nel sistema, l'azione diventa chiaramente `Rimuovi dal sistema`.

## US-UX2-06 — Navigazione applicazione

**Priorità:** MUST

### Acceptance criteria
- Mobile bottom navigation per funzioni primarie.
- Menu secondario/burger per funzioni meno frequenti.
- System Slip sempre raggiungibile.
- Nessun flusso duplicato o ambiguo.

---

# EPIC SYS2 — System Flow v2 semplificato

## US-SYS2-01 — Selezione e deselezione reversibile ovunque

**Priorità:** MUST

### Acceptance criteria
- Una selezione può essere aggiunta da Home, lista partite, dettaglio e mercati.
- Una selezione già aggiunta può essere rimossa dagli stessi punti.
- Può essere rimossa anche direttamente dal System Slip e dalla schermata Sistema.
- Il contatore si aggiorna immediatamente.
- La rimozione invalida qualsiasi sviluppo/calcolo precedente che dipenda dalla selezione rimossa.

## US-SYS2-02 — Blocco preventivo incompatibilità prima dell'aggiunta

**Priorità:** MUST — BLOCKING

### Regola
Prima di modificare il System Slip, la nuova selezione deve essere confrontata con **tutte** le selezioni già presenti tramite Compatibility Engine.

### Acceptance criteria
- Se almeno una coppia è `INCOMPATIBLE`, la nuova selezione **NON viene aggiunta**.
- Il System Slip rimane invariato e il contatore non aumenta.
- L'utente riceve feedback immediato e comprensibile che identifica la selezione in conflitto e il motivo.
- Il controllo è applicato a ogni entry point di aggiunta.
- Il controllo è applicato sia UI sia dominio/backend; non è aggirabile dal client.
- Le selezioni solo `CORRELATED` non sono bloccate automaticamente.
- Correlation e incompatibility non vengono mai confuse.
- Test tabellari e E2E verificano esplicitamente il mancato inserimento.

## US-SYS2-03 — Flusso Sistema lineare

**Priorità:** MUST

### Flusso normale
1. L'utente sceglie i pronostici.
2. Entra in `Sistema` e vede il riepilogo delle selezioni.
3. Imposta il budget tramite preset o importo libero.
4. Sceglie profilo `Prudente`, `Bilanciato` o `Aggressivo`.
5. Seleziona `Genera sistema`.
6. FPS propone la struttura compatibile con budget, confidence, incompatibilità e correlazioni.
7. L'utente vede lo sviluppo completo prima di salvare/simulare/segnare come realmente giocato.

### Acceptance criteria
- Il flusso normale non espone `N`, `K`, `minCorrect`, nomi interni o combinatoria tecnica.
- `Automatico/Assistito/Manuale` non sono una scelta obbligatoria iniziale.
- Le capacità avanzate restano disponibili tramite `Personalizza` / `Avanzato` senza rimuovere i requisiti MUST baseline.
- Budget e costo totale sono sempre visibili prima della conferma.

## US-SYS2-04 — Sviluppo completo e navigabile del sistema

**Priorità:** MUST

### Acceptance criteria
Prima della conferma sono mostrati almeno:
- selezioni;
- struttura del sistema;
- numero combinazioni;
- stake per combinazione;
- costo/investimento totale;
- budget;
- livello rischio/copertura;
- quote disponibili e timestamp;
- ritorno potenziale per combinazione quando calcolabile.

### UX
- Sezione `Vedi sviluppo` collassabile.
- Ogni combinazione mostra le selezioni che la compongono, quota combinata e stake.
- Lo sviluppo deve essere matematicamente coerente con il System Builder.
- Nessuna combinazione incompatibile può comparire nello sviluppo.

## US-SYS2-05 — Azioni finali del sistema

**Priorità:** MUST

### Acceptance criteria
Dopo aver visualizzato lo sviluppo l'utente può:
- salvare il sistema;
- simularlo/paper trading;
- indicare `L'ho giocato`;
- modificare selezioni/budget/profilo prima della conferma.
- Prediction, simulazione e giocata reale restano entità/stati distinti.

---

# EPIC ODDS2 — Quote bookmaker automatiche e Value

## US-ODDS2-01 — Provider quote e adapter

**Priorità:** MUST per il nuovo System Flow

### Task
- Verificare concretamente API-Football e provider alternativi per copertura quote, bookmaker, mercati, limiti, pricing e termini d'uso.
- Formalizzare ADR sulla scelta del provider quote.
- Implementare quote esclusivamente tramite adapter normalizzato `getOdds`.

### Acceptance criteria
- Nessun dominio dipende direttamente da API-Football o da un bookmaker.
- Quote mancanti/non aggiornate non vengono inventate.
- Ogni quota conserva bookmaker/provider, market/selection e timestamp.

## US-ODDS2-02 — Odds Aggregator

**Priorità:** MUST

### Decisione da validare in ADR
Candidato iniziale: quota di riferimento calcolata come **mediana** dei bookmaker principali disponibili, con `best available odds` mostrata separatamente.

### Acceptance criteria
- Outlier di un singolo bookmaker non distorce la quota di riferimento.
- UI distingue `Quota di riferimento`, `Migliore quota`, bookmaker e timestamp.
- Se i bookmaker disponibili sono insufficienti, Data Quality/affidabilità quote lo segnala.
- Nessuna media/mediana viene calcolata mescolando mercati semanticamente diversi.

## US-ODDS2-03 — Fair odds e Value nella UX

**Priorità:** MUST quando le quote sono disponibili

### Acceptance criteria
- `Probability`, `Confidence`, `Data Quality`, `Quota` e `Value` sono visualmente e semanticamente distinti.
- Fair odds deriva esclusivamente dalla probabilità del modello.
- Value confronta modello e quota di mercato secondo formula/versione documentata.
- Quota elevata da sola non genera una raccomandazione.

## US-ODDS2-04 — Cache, dedup, rate limit e refresh manuale

**Priorità:** MUST

### Acceptance criteria
- Cache per endpoint/parametri con TTL documentato.
- Deduplicazione delle richieste simultanee identiche.
- Retry/backoff per 429 e indisponibilità provider.
- Stale fallback esplicitamente marcato; mai presentato come live.
- UI mostra freschezza/origine del dato.
- `Aggiorna ora` forza una chiamata on-demand bypassando la cache solo su azione esplicita.
- Il refresh non perde selezioni, filtri o stato corrente.
- Rate limit provider coperto da integration test.

---

# EPIC METH2 — Valutazione metodologia S.A.C.R.A.

## SPIKE-METH2-01 — Analisi S.A.C.R.A. applicata alle scommesse

**Priorità:** MUST prima di integrare la metodologia nel motore

**Fonte indicata:** `https://cpsmilano.wixsite.com/betcip/blank-xibal`

### Obiettivo
Studiare la metodologia S.A.C.R.A. e verificare quali principi siano compatibili con SRS, Technical Design, approccio probabilistico, Value Engine e System Optimizer.

### Vincoli
- Nessuna regola S.A.C.R.A. viene implementata implicitamente prima dell'analisi.
- Non può trasformare prediction probabilistiche in certezze.
- Non può sostituire dati mancanti con assunzioni inventate.
- Qualunque euristica adottata deve essere formalizzata, versionata, riproducibile e backtestabile.
- Qualunque modifica algoritmica significativa richiede ADR.

### Deliverable
- sintesi della metodologia;
- mapping S.A.C.R.A. -> moduli FPS;
- elementi adottabili / non adottabili;
- rischi e conflitti con baseline;
- proposta algoritmo versionato;
- piano di backtest e metriche di accettazione.

---

# EPIC DATA2 — Esperienza dati e resilienza

## US-DATA2-01 — Stato freschezza dati

**Priorità:** MUST

### Acceptance criteria
- L'utente può distinguere `aggiornato`, `da cache`, `ultimo dato disponibile`, `non disponibile`.
- Dato stale o incompleto incide su Data Quality/Confidence secondo regole versionate.
- Nessun errore provider viene mascherato con valori inventati.

## US-DATA2-02 — Browser/Desktop test mode

**Priorità:** SHOULD

### Acceptance criteria
- La UI mobile può essere testata da browser senza dipendere da SQLite nativo Android.
- Storage browser ha pruning e limiti per evitare `QuotaExceededError`.
- Le API in sviluppo desktop usano proxy/dev configuration senza modificare il comportamento Android.
- Nessun secret viene committato.

---

# EPIC QA2 — Quality gates del nuovo flusso

## US-QA2-01 — E2E System Flow v2

**Priorità:** MUST

### Flussi obbligatori
1. Home -> partita -> selezione -> System Slip.
2. Selezione -> deselezione -> contatore torna allo stato precedente.
3. Selezione A -> tentativo selezione B incompatibile -> B non entra -> contatore invariato -> messaggio comprensibile.
4. Selezioni solo correlate -> inserimento consentito -> warning/penalizzazione secondo regola.
5. Sistema -> budget -> rischio -> genera -> sviluppo completo -> costo totale coerente.
6. Rimozione dal Sistema -> sviluppo precedente invalidato.
7. Quote cache -> refresh manuale -> stato/freschezza aggiornati senza perdere il System Slip.
8. Responsive 320px, smartphone, tablet, desktop.

## US-QA2-02 — Definition of Done aggiuntiva

**Priorità:** MUST

Una release che include questo backlog non è completata finché:
- tutti gli acceptance criteria sopra sono verificati;
- compatibility gate è verde a livello unit/integration/E2E;
- combinazioni generate sono matematicamente corrette;
- nessun sistema incompatibile è salvabile o simulabile;
- quote e timestamp sono tracciabili;
- nessuna API key è nel repository;
- lint/typecheck/test/build sono verdi;
- UI è verificata sui breakpoint previsti;
- ADR provider quote e ADR delle eventuali regole S.A.C.R.A. sono approvati prima dell'implementazione definitiva.

---

# Sequenza operativa approvata

1. Risolvere conflitti branch/main e riportare questo backlog nel ramo di integrazione definitivo.
2. SPIKE metodologia S.A.C.R.A. + ADR se adottata.
3. ADR provider quote / strategia aggregazione.
4. Compatibility gate preventivo completo e testato.
5. Odds ingestion/normalization/cache.
6. System Flow v2 lineare.
7. Sviluppo completo combinazioni.
8. Premium UX/UI refinement su tutte le schermate.
9. E2E completi e quality gate.
10. Merge/tag/release solo a gate verdi.
