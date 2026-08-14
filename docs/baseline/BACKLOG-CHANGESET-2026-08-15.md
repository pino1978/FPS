# Football Prediction System — Backlog Change Set

**Data:** 15/08/2026  
**Stato:** APPROVED — da integrare nel MVP Backlog prima dell'implementazione  
**Baseline:** SRS + Technical Design + MVP Backlog restano vincolanti.

> Questo change set è parte operativa del backlog. Non sostituisce i requisiti MUST esistenti e non autorizza semplificazioni del dominio. In caso di conflitto prevale l'SRS.

## Obiettivo

Rendere FPS estremamente semplice da usare pur mantenendo intatte le capacità quantitative e di System Builder. Il flusso primario deve essere autoesplicativo: **seleziona pronostici → Sistema → budget/profilo → genera → visualizza sviluppo → salva/simula/segna come giocato**.

---

# EPIC 0 — Product / UX / Methodology

## US-0002A — Benchmark UX/UI sportsbook premium

**Priorità:** MUST

### Task
- Consolidare benchmark di sportsbook/app sportive professionali.
- Definire una visual identity FPS originale, premium e coerente, senza copiare branding di terzi.
- Rivedere header, hero, navigation, card, System Slip, filtri, dettaglio partita, storico, loading/empty/error/disabled/selected.
- Ridurre font size e densità dove l'attuale UI appare sovradimensionata.
- Definire uso coerente dei colori per sezioni, stati e categorie.

### Acceptance criteria
- UI percepita come app consumer/sportsbook professionale, non gestionale tecnico.
- Gerarchia visiva chiara a colpo d'occhio.
- Nessun tutorial permanente necessario per capire il flusso base.
- Ogni CTA comunica chiaramente cosa succede al click.
- Responsive verificato a 320px, mobile comune, tablet e desktop.

## US-0004 — Studio metodologia S.a.c.r.a. per System Builder

**Priorità:** P1 / DESIGN GATE

### Scopo
Valutare come riferimento concettuale le funzionalità documentate del software S.a.c.r.a. per sviluppo di sistemi integrali/ridotti, percentuale di riduzione, presenze delle selezioni, copertura e visualizzazione dello sviluppo.

### Vincoli
- Non copiare algoritmi non documentati o non verificabili.
- Nessuna euristica entra nel motore se non è testabile, versionabile, riproducibile e sottoponibile a backtest.
- Le percentuali di copertura devono avere definizione matematica documentata e non essere presentate come probabilità di profitto.
- La metodologia è un riferimento da valutare, non una nuova baseline automatica.

### Deliverable
- Nota tecnica/ADR con: concetti riutilizzabili, formule verificabili, alternative, impatti su System Optimizer e UX, decisione finale.

---

# EPIC 3 — Provider, caching e quote

## US-0305 — Provider cache, dedup e refresh on-demand

**Priorità:** MUST

### Acceptance criteria
- Cache per endpoint/provider con TTL configurabile.
- Richieste concorrenti identiche deduplicate.
- Rate limit e `429` gestiti con backoff.
- In caso di errore/rate limit è possibile usare l'ultimo dato valido, marcandolo esplicitamente come cache/stale.
- La UI mostra freschezza/origine del dato.
- `Aggiorna ora` forza una nuova richiesta su azione esplicita dell'utente senza perdere selezioni, filtri o contesto.
- Il refresh forzato non inventa dati e non altera snapshot storici immutabili.
- Test di integrazione coprono cache hit/miss, dedup, 429, stale fallback e force refresh.

## US-0306 — Odds ingestion & market aggregation

**Priorità:** P1, anticipata perché necessaria al nuovo System Flow

### Task
- Recuperare quote tramite adapter provider (`getOdds`), senza dipendenza del dominio da API-Football o altro provider concreto.
- Valutare più bookmaker disponibili anziché obbligare l'utente a inserire manualmente le quote.
- Definire tramite ADR la quota di riferimento per Value Engine; proposta iniziale: **mediana** dei bookmaker qualificati disponibili.
- Calcolare e mostrare separatamente anche la **best available odds** con bookmaker e timestamp.
- Definire criteri di inclusione/esclusione bookmaker e gestione outlier.

### Acceptance criteria
- Ogni quota è associata a fixture, mercato, selezione, provider, bookmaker e timestamp.
- Gli snapshot quote non vengono sovrascritti.
- Probability, fair odds, quota mercato e Value restano concetti distinti.
- Se le quote non sono disponibili la UI lo dichiara; nessun valore viene inventato.
- La quota usata da una prediction/sistema salvato rimane storicizzata.
- Cache e rate limit delle odds sono gestiti.

---

# EPIC 6 — Compatibility & Correlation

## US-0602A — Preventive Compatibility Gate

**Priorità:** MUST / RELEASE BLOCKER

### Regola vincolante
Una selezione classificata `INCOMPATIBLE` con **qualunque selezione già presente nel System Slip non deve essere aggiunta**. Non deve essere aggiunta temporaneamente, non deve essere aggiunta per poi essere rimossa e non deve entrare in alcuna combinazione.

### Flusso
1. L'utente preme `Aggiungi al sistema`.
2. La nuova selezione viene normalizzata tramite Market Taxonomy.
3. Il Compatibility Engine la confronta con tutte le selezioni presenti.
4. Se esiste almeno un conflitto `INCOMPATIBLE`, l'operazione è rifiutata atomicamente.
5. System Slip e contatore rimangono invariati.
6. La UI spiega in linguaggio naturale quale selezione esistente genera il conflitto e perché.
7. Se non esistono incompatibilità, la selezione può essere aggiunta.

### Acceptance criteria
- Enforcement nel dominio/backend/shared engine, non tramite `if` distribuiti nella UI.
- Stesso controllo da Home, dettaglio partita, mercati, card in evidenza e qualunque futuro entry point.
- Correlazione alta NON equivale a incompatibilità e non viene automaticamente bloccata salvo policy esplicita del profilo/optimizer.
- Test unitari deterministici della tassonomia/regole.
- Test integrazione del comando add-selection.
- E2E: prima selezione → tentativo seconda incompatibile → blocco → contatore invariato → seconda selezione assente dal sistema.

---

# EPIC 7 — System Slip & System Builder v2

## US-0701A — Selezione/deselezione coerente ovunque

**Priorità:** MUST

### Acceptance criteria
- Una selezione aggiunta è immediatamente riconoscibile come selezionata.
- Lo stesso controllo consente la rimozione oppure espone chiaramente `Rimuovi dal sistema`.
- Rimozione disponibile anche dalla schermata Sistema/System Slip.
- Conteggio aggiornato immediatamente.
- Rimozione invalida eventuale sviluppo/calcolo precedente e richiede rigenerazione.

## US-0703A — System Flow semplificato

**Priorità:** MUST

### Flusso primario
1. Riepilogo selezioni.
2. Budget: preset + importo personalizzato.
3. Profilo: Prudente / Bilanciato / Aggressivo.
4. `Genera sistema`.
5. Risultato con struttura, copertura, combinazioni e costo.

### Acceptance criteria
- Nel flusso normale l'utente non deve conoscere `N`, `K`, minCorrect o combinatoria.
- Automatico/Assistito restano capacità di dominio, ma la UI primaria usa linguaggio orientato al risultato.
- Le opzioni matematiche complete restano disponibili sotto `Personalizza` / modalità avanzata, senza eliminare requisiti MUST dell'SRS.
- Budget e costo totale sempre visibili prima della conferma.
- Nessuna selezione incompatibile presente.
- Correlazioni e concentrazioni vengono valutate dal System Optimizer.

## US-0706 — Sviluppo completo del sistema

**Priorità:** MUST

### Acceptance criteria
- Dopo la generazione mostra: numero selezioni, struttura del sistema, numero combinazioni, stake per combinazione, costo totale, budget e livello rischio/copertura.
- È disponibile `Vedi sviluppo` con elenco di **tutte** le combinazioni generate.
- Ogni combinazione mostra selezioni, quota combinata disponibile, stake e ritorno potenziale quando calcolabile.
- Per sistemi integrali il numero di combinazioni coincide con la combinatoria attesa.
- Per sistemi ridotti/ponderati viene mostrata la copertura e la regola/algoritmo/versione che ha prodotto lo sviluppo.
- Lo sviluppo salvato è riproducibile dagli stessi input/versione.
- Nessun termine come “copertura 100%” può essere interpretato come garanzia di profitto; la UI deve esplicitare cosa è coperto matematicamente.

## US-0707 — Azioni post-generazione lineari

**Priorità:** MUST

### Acceptance criteria
Dopo lo sviluppo le azioni principali sono, in ordine comprensibile:
- `Salva`;
- `Simula` / paper trading;
- `L'ho giocato` per registrare una giocata reale.

La UI mantiene sempre distinta prediction, simulazione e scommessa reale.

---

# EPIC 13 — UX/UI Premium v2

## US-1301A — Navigation & premium shell

**Priorità:** MUST

### Acceptance criteria
- Header/brand FPS riconoscibile.
- Hero o area editoriale compatta dove utile, senza sottrarre spazio al task principale.
- Bottom navigation mobile semplice; desktop navigation coerente.
- System Slip sempre raggiungibile.
- Nessuna duplicazione di flussi.

## US-1302A — Home e giornate

**Priorità:** MUST

### Acceptance criteria
- Massimo 4 pick in evidenza.
- Ogni pick in evidenza mostra almeno fixture, **data**, ora, mercato/selezione, probability e stato di affidabilità comprensibile.
- Niente label tecniche ambigue come `HOME`/`AWAY` nella UI primaria: usare microcopy contestuale (`Vince Napoli`, `Vince squadra ospite`, ecc.).
- Eventi raggruppati per **giornata di campionato**.
- Ogni giornata mostra numero giornata e **data/intervallo date**.
- Le giornate sono collassabili.
- Righe/card partita più compatte e facilmente scansionabili.
- È ammessa alternanza odd/even molto leggera se migliora leggibilità e contrasto.
- Filtri standard semplici; filtri tecnici dietro progressive disclosure.

## US-1303A — Dettaglio partita semplificato

**Priorità:** MUST

### Acceptance criteria
- Pronostico principale immediatamente comprensibile.
- Mercati secondari organizzati in sezioni/accordion: Esito, Gol, Over/Under, Risultato esatto, Marcatori, altri mercati.
- Analisi tecnica avanzata chiusa di default.
- `Aggiungi al sistema` / `Rimuovi dal sistema` chiari e coerenti.
- Preventive Compatibility Gate applicato prima dell'aggiunta.

## US-1304A — Sistema premium e comprensibile

**Priorità:** MUST

### Acceptance criteria
- Le selezioni mostrano fixture/data, mercato leggibile, quota disponibile e comando rimuovi.
- Il flusso primario è selezioni → budget → rischio → genera → sviluppo.
- Le opzioni avanzate non affollano la prima viewport.
- Lo sviluppo combinazioni è navigabile senza perdere il contesto.
- Stati selected/disabled/error/conflict sono visivamente inequivocabili.

## US-1307 — Microcopy e terminologia consumer

**Priorità:** MUST

### Acceptance criteria
- Eliminare termini tecnici/criptici dalla UI primaria quando esiste un equivalente comprensibile.
- `Confidence` → `Affidabilità` nella UI consumer; il concetto di dominio resta invariato.
- `NO_BET` → messaggio comprensibile come `Nessun pronostico consigliato`, preservando il codice dominio.
- Data Quality può essere sintetizzata come `Dati: Ottimi/Buoni/Limitati` con dettaglio tecnico su richiesta.
- Probability non viene chiamata affidabilità e resta separata da Confidence.
- Ogni messaggio di errore indica cosa è successo e, quando possibile, l'azione successiva.

---

# EPIC 15 — QA additions

## US-1504 — E2E System Flow v2

**Priorità:** MUST / RELEASE BLOCKER

### Flussi obbligatori
1. aggiungi selezione → stato selected → rimuovi → contatore aggiornato;
2. aggiungi selezione A → tenta selezione incompatibile B → B bloccata → A resta presente;
3. selezioni compatibili → Sistema → budget → rischio → genera → sviluppo completo;
4. rimuovi selezione dal Sistema → sviluppo precedente invalidato;
5. sistema generato → salva;
6. sistema generato → simula;
7. sistema generato → `L'ho giocato` → dati giocata reale;
8. refresh provider/cache non perde selezioni o stato del System Slip;
9. quote assenti/stale/rate-limited gestite senza dati inventati;
10. responsive 320/mobile/tablet/desktop.

---

# Gate di implementazione di questo change set

Ordine orchestrato:
1. ADR studio S.a.c.r.a. e decisione su eventuali sistemi ridotti/copertura.
2. ADR Odds Aggregator e regola quota di riferimento.
3. Compatibility Gate dominio + test.
4. Odds adapter/cache/snapshot.
5. System Flow v2 + sviluppo combinazioni.
6. UX/UI Premium v2 e microcopy.
7. E2E completi.
8. Quality gate globale e verifica regressioni MUST.

**Non dichiarare completato il change set se anche uno solo dei release blocker sopra è rosso.**
