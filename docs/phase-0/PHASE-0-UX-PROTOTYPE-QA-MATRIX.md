# Football Prediction System — UX Prototype Traceability & QA Matrix

**Versione:** 1.0  
**Data:** 12/08/2026  
**Ambito:** prototipo navigabile Phase 0, senza dipendenza da API reali  
**Stato:** test specification — evidenze da raccogliere sul prototipo

## 1. Scopo e regola di accettazione

Questa matrice verifica `US-0003`, `US-1301…US-1306`, i flussi UX collegati a `US-0602/0603`, `US-0701…0705`, `US-0802/0806`, `US-0901/0902` e i requisiti trasversali dell'SRS. Il prototipo può usare fixture statiche, chiaramente marcate come demo, per dimostrare navigazione, gerarchia, copy, stati e vincoli d'interazione. Non può dimostrare correttezza algoritmica, copertura provider, freshness reale, settlement o persistenza.

Un test è `PASS` solo con evidenza ripetibile (screenshot/video, report automatico o verbale strutturato). Un esito simulato deve essere etichettato `PROTOTYPE/MOCK`; non può essere presentato come prova di comportamento backend.

## 2. Tracciabilità requisiti → evidenze

| ID QA | Fonte | Requisito verificato | Evidenza richiesta | Metodo | Gate |
|---|---|---|---|---|---|
| TR-01 | US-0003 | Token e componenti coerenti; stati applicabili completi | inventory componenti + state board | review visuale | Bloccante UX |
| TR-02 | US-0003 | Touch target adeguati | overlay/misurazione ≥44×44 px | DevTools/manuale | Bloccante UX |
| TR-03 | US-0003, WCAG | Contrasto verificabile | contrast report AA | axe + contrast checker | Bloccante UX |
| TR-04 | US-1301 | Nav mobile a una mano, desktop coerente, senza duplicazioni | esecuzione nav a 320/390/768/1024/1440 | manuale | Bloccante UX |
| TR-05 | US-1302 | Day/competition, top pick, metriche distinte, NO_BET, add immediato | percorso Home con dataset mock | manuale + screenshot | Bloccante UX |
| TR-06 | US-1303 | Progressive disclosure e prima viewport non sovraccarica | dettaglio a tutti i viewport | review + task test | Bloccante UX |
| TR-07 | US-1304, US-0702…0705 | Automatico/Assistito/Manuale; budget/costo sempre visibili | tre percorsi builder | manuale + video | Bloccante UX |
| TR-08 | US-0602, FR-COMP | Incompatibilità bloccata e spiegata | tentativo add conflittuale | manuale + video | Bloccante UX; solo comportamento UI |
| TR-09 | US-0603, FR-CORR | Correlazione distinta e non bloccata automaticamente | add correlato + warning | manuale + video | Bloccante UX; solo comportamento UI |
| TR-10 | US-0802/0806 | Reale/Paper/Non giocata distinti; storico mobile leggibile | mark played + storico mock | manuale + screenshot | Bloccante UX |
| TR-11 | US-0901/0902 | Model/Betting/Paper separati; scope, N, freshness | dashboard mock | manuale + screenshot | Bloccante UX |
| TR-12 | SRS 32, UX exit | Responsive, reflow, keyboard, screen reader, axe | suite viewport/a11y | automatizzato + manuale | Bloccante Gate 0 |
| TR-13 | UX exit | ≥80% completion senza aiuto, ≥5 utenti, zero severe | protocollo moderato + verbali | utenti reali | Bloccante Gate 0 |

## 3. Flussi critici e acceptance criteria

### CP-01 — Pronostico → selezione compatibile → review

**Precondizione mock:** almeno due MatchCard, una prediction `ACTIVE`, quota valida e tray vuoto.

1. Aprire Pronostici e identificare un top pick.
2. Distinguere Probability, Confidence, Data Quality e Value senza aprire il glossario.
3. Aggiungere il pick con `+ Sistema`.
4. Verificare feedback immediato e aggiornamento del tray.
5. Aprire la review e rimuovere/ripristinare la selezione.

**Pass:** eventi raggruppati giorno/competizione; metriche nominate e non fuse; tray mostra N e costo; add/remove preservano contesto; review mostra selezioni, struttura, combinazioni, stake, costo totale, budget e rischio/copertura. Il Value è presente solo con quota valida.

### CP-02 — Incompatibilità → blocco comprensibile

**Precondizione mock:** `Over 3.5` già nel tray e `Under 2.5` della stessa fixture/periodo disponibile.

1. Tentare l'aggiunta della selezione conflittuale.
2. Leggere il blocker e identificare quale selezione è in conflitto.
3. Rimuovere o sostituire una delle due tramite il rimedio proposto.

**Pass:** la nuova selezione non entra nel tray; il blocker usa testo/icona oltre al colore; nomina entrambe le selezioni e la ragione; offre un rimedio raggiungibile da tastiera; la conferma resta disabilitata con motivo. Questo prova soltanto il contratto UX, non la completezza del rule engine/backend.

### CP-03 — Correlazione → warning senza falso blocco

**Precondizione mock:** `Team vince` nel tray e `attaccante della squadra segna` disponibile.

1. Aggiungere la selezione correlata.
2. Esaminare classe/score e impatto sul rischio.
3. Proseguire consapevolmente o rimuovere la selezione.

**Pass:** entrambe le selezioni restano nel tray; compare `CORRELATED` con spiegazione; non è presentato come errore/incompatibilità; il profilo prudente segnala l'esclusione/penalizzazione simulata; il warning è annunciato agli screen reader. Lo score mostrato è marcato demo se non calcolato da un engine reale.

### CP-04 — Builder Automatico → review oppure NO_BET

1. Impostare budget, rischio, competizioni e periodo.
2. Generare una proposta con opportunità disponibili.
3. Verificare costo ≤ budget e assenza di incompatibilità nella UI.
4. Ripetere con scenario senza opportunità valide.

**Pass:** non richiede conoscenza combinatoria; non forza pick; lo scenario vuoto produce `NO_BET/opportunità insufficienti`, non errore; non abbassa soglie in silenzio; review contiene i sette elementi obbligatori. I calcoli mostrati restano mock finché non sono collegati ai motori.

### CP-05 — Builder Assistito/Manuale → validazione in tempo reale

1. In Assistito selezionare pick e accettare/personalizzare la struttura proposta.
2. In Manuale impostare N/K, fisse e stake.
3. Provocare budget superato, input invalido e incompatibilità.

**Pass:** dettaglio combinatorio appare solo su richiesta; `6 di 3` mostra 20 combinazioni nel caso demo; costo e combinazioni si aggiornano; conferma è bloccata per i tre errori e ogni disabled ha motivo; back conserva selezioni e configurazione. La precisione generale di `C(N,K)` richiede test del dominio, non il solo prototipo.

### CP-06 — Sistema salvato → Reale/Paper → storico/esito

1. Da sistema mock salvato scegliere `L'ho giocato`.
2. Inserire bookmaker opzionale, quota effettiva, stake, data/ora e note.
3. Verificare validazione, conferma e stato PENDING.
4. Eseguire variante Paper separata.
5. Aprire Storico, filtrare e consultare un record mock Settled.

**Pass:** Reale/Paper/Non giocata sono inequivocabili; nessun default trasforma una simulazione in reale; storico usa card su mobile, mantiene filtri/scroll al back e mostra prediction originaria, quota, stake, outcome, payout e stato/timeline. Il pass non prova salvataggio, verifica automatica o idempotenza.

### CP-07 — Statistiche → separazione dei perimetri

1. Aprire Statistiche.
2. Passare tra Model, Betting e Paper.
3. Aprire un breakdown e lo stato campione insufficiente.

**Pass:** nessun KPI aggrega perimetri; ogni metrica mostra scope, periodo, N, freshness e definizione; `INSUFFICIENT_SAMPLE` non usa giudizi verdi/rossi né claim di performance; dettagli avanzati sono progressivi.

### CP-08 — Dettaglio partita e unavailable/stale/error

1. Aprire dettaglio e navigare Overview/Mercati/Statistiche/Giocatori/Analisi.
2. Verificare fonte/as-of e model version.
3. Attivare fixture mock `stale`, `unavailable`, errore localizzato e retry.

**Pass:** prima viewport contiene header, insight e navigazione senza overload; tab e categorie sono keyboard-operable; `UNAVAILABLE` non equivale a zero; stale mostra timestamp; errore è locale e non cancella i dati validi; retry non duplica feedback/azioni; banner non copre CTA.

## 4. Matrice stati dominio

| Stato | Rappresentazione obbligatoria | Azioni consentite | Azioni vietate | Controllo QA |
|---|---|---|---|---|
| `NO_BET` | Titolo esplicito, motivo, DQ/confidence e input mancanti | Analisi/dettaglio | `+ Sistema`, claim di certezza, abbassamento silenzioso soglie | distinto da error/empty/unavailable; annunciato semanticamente |
| `UNAVAILABLE` | Campo/capability non disponibile + motivo/as-of | refresh/dettaglio quando sensato | mostrare `0`, quota/value inventati, CTA dipendente dal dato | Value assente o `UNAVAILABLE`, layout stabile |
| `INCOMPATIBLE` | blocker con due selezioni, conflitto e rimedio | rimuovi/sostituisci/chiudi | aggiunta/conferma/generazione combinazione | tray invariato; focus nel blocker e ritorno corretto |
| `CORRELATED` | warning, classe/score demo, rischio spiegato | continua consapevolmente/rimuovi | trattare come impossibile; occultare impatto | selezione resta; warning non è solo colore |
| `STALE` | ultimo aggiornamento e qualità ridotta | usa con avviso/refresh secondo policy | presentare come fresco | timestamp leggibile, banner non occlude |
| `ERROR` | messaggio locale, causa comprensibile, retry | retry/back | perdere input validi, loop o duplicazione | focus/annuncio live; retry singolo/idempotente lato UI |
| `INSUFFICIENT_SAMPLE` | N, soglia e spiegazione | cambia periodo/scope | semaforo performance o conclusione statistica | compare in Model/Betting/Paper separatamente |
| `LOADING` | skeleton isomorfo, nome stato accessibile | annulla/back se applicabile | layout shift grave, controlli fantasma attivi | no flash di dati falsi; reduced motion rispettato |
| `DISABLED` | motivo adiacente o associato programmaticamente | correzione input | bottone muto/non spiegato | non affidarsi a tooltip hover-only |

## 5. Responsive e viewport matrix

Eseguire ogni CP almeno a 390 e 1440 px; CP-01/02/04/06 a tutti i viewport.

| Viewport | Layout atteso | Controlli obbligatori |
|---|---|---|
| 320×568 | bottom nav 5 voci, tray sopra nav, card singola colonna | zero scroll orizzontale; CTA/labels non troncate; tastiera virtuale non copre submit |
| 390×844 | layout mobile principale | uso a una mano; sticky non sovrapposti; safe-area; 44×44 px |
| 768×1024 | tablet/reflow intermedio | nessun ibrido incoerente; filtri e sheet utilizzabili in portrait/landscape |
| 1024×768 | desktop compatto/tablet landscape | sidebar/tray senza comprimere contenuto; tab e review leggibili |
| 1440×900 | desktop | sidebar 6 destinazioni, tray sticky separato; line length e densità controllate |

Controlli comuni: zoom browser 200%; text spacing WCAG; nessun contenuto/azione perso; scroll orizzontale ammesso solo per visualizzazione dati intenzionale con alternativa testuale; back preserva filtri, scroll, tab e bozza; light/dark e `prefers-reduced-motion` senza perdita semantica.

## 6. Keyboard, screen reader e accessibilità

| ID | Controllo | Criterio PASS |
|---|---|---|
| A11Y-01 | Tab order | segue ordine visuale/logico; nessun focus trap salvo modal con escape/close |
| A11Y-02 | Focus | sempre visibile ≥3:1 e non coperto da sticky header/tray/nav |
| A11Y-03 | Azionabilità | Enter/Space attivano button/chip; frecce gestiscono tab/segmented control secondo pattern ARIA |
| A11Y-04 | Dialog/sheet | nome accessibile, focus iniziale sensato, inert background, focus restituito al trigger |
| A11Y-05 | Status/error | add tray, blocker, correlation warning, validation e retry annunciati senza spostamenti inutili |
| A11Y-06 | Nomi/ruoli | CTA, badge, metriche, filtri e icon button hanno accessible name univoco |
| A11Y-07 | Colore | stato/esito/rischio usa testo o icona oltre al colore |
| A11Y-08 | Contrasto | testo normale ≥4.5:1; large/UI/focus ≥3:1 in light/dark |
| A11Y-09 | Screen reader smoke | VoiceOver/TalkBack o NVDA legge gerarchia, label metriche, stato tray, NO_BET, blocker e warning |
| A11Y-10 | Automazione | zero axe `critical`/`serious` su Home, Dettaglio, Builder, Storico e Statistiche |

La verifica automatica non sostituisce il test manuale keyboard/screen reader. Il prototipo statico può provare semantica e operabilità, ma non l'accessibilità dei messaggi provenienti da API/backend reali.

## 7. Protocollo usability richiesto per Gate 0

Campione minimo: 5 utenti rappresentativi, su mobile reale o emulazione realistica. Task core senza suggerimenti: (1) add→review; (2) Automatic Builder; (3) mark played; (4) ricerca esito nello storico. Raccogliere successo/fallimento, tempo, errori, richieste d'aiuto, punti di esitazione e severity.

**Exit:** ≥80% completion senza aiuto per ciascun task aggregato; zero issue severe; problemi moderate con owner e piano. Un test interno del team o una walkthrough guidata non conta come test utenti.

## 8. Evidenze possibili e limiti

| Evidenza | Senza API key | Senza utenti reali | Note |
|---|---:|---:|---|
| IA, navigazione, contenuto prima viewport, progressive disclosure | Sì | Sì | dataset mock dichiarato |
| Stati visuali/interaction, NO_BET/unavailable/incompatible/correlated | Sì | Sì | prova UX, non motori dominio |
| Viewport, reflow 200%, touch target, contrasto, axe | Sì | Sì | serve prototipo eseguibile |
| Keyboard e screen-reader smoke | Sì | Sì | manuale tecnico sufficiente come smoke |
| Task completion ≥80% e zero severe | Sì | **No** | richiede ≥5 utenti rappresentativi |
| Completezza/freshness/ID/rate limit/licenza provider | **No** | Sì | richiede key, trial e verifica contrattuale |
| Prediction, DQ/confidence/value reali e riproducibili | **No** | Sì | mock non è evidenza algoritmica |
| Compatibility/Correlation Engine completo | **No** | Sì | il prototipo prova solo feedback e blocco UI sui casi fixture |
| Combinatoria generale, budget e optimizer corretti | **No** | Sì | richiede unit/integration test dei motori |
| Salvataggio Reale/Paper e ownership | **No** | Sì | richiede backend/database/auth |
| Eligibility, verifica automatica, idempotenza e settlement | **No** | Sì | richiede provider mock/versionati + backend; live provider per trial end-to-end |
| Metriche Model/Betting/Paper corrette | **No** | Sì | prototipo prova solo separazione e comprensibilità |

## 9. Report di esecuzione

Per ogni test registrare: build/commit, browser/device, viewport/zoom, tema, dataset mock/versione, prerequisiti, passi, expected/actual, `PASS|FAIL|BLOCKED`, severity, evidenza e issue ID. Non chiudere `US-0003` finché TR-01…TR-13 non sono PASS; i test marcati come prova UI non chiudono le rispettive story backend.

### Disposition Gate 0

- **Verificabile sul prototipo:** TR-01…TR-12, eccetto ciò che dipende da engine/backend.
- **Richiede utenti:** TR-13.
- **Richiede API key/licenze:** US-0001 e ogni claim sui dati reali.
- **Stato corretto fino alle evidenze:** `US-0003 = SPEC COMPLETE / VALIDATION PENDING`; `Gate 0 = OPEN`.
