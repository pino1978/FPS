# Football Prediction System — Phase 0 Decision Pack

**Versione:** 0.2  
**Data:** 12/08/2026  
**Stato:** Phase 0 unificata approvata — Gate 0 ancora aperto

## 1. Fonti vincolanti

1. `FOOTBALL-PREDICTION-SYSTEM-SRS.md`
2. `FOOTBALL-PREDICTION-SYSTEM-TECHNICAL-DESIGN.md`
3. `FOOTBALL-PREDICTION-SYSTEM-MVP-BACKLOG.md`

I MUST dell'SRS prevalgono. Nessun conflitto rilevato in questo documento costituisce una modifica implicita delle baseline.

## 2. Stato Phase 0

| Work item | Stato | Esito |
|---|---|---|
| US-0001 Provider comparison | Condizionato | API-Football primario provvisorio; Sportmonks fallback progettuale; trial obbligatorio |
| US-0002 UX/UI benchmark | Completato | Pattern, anti-pattern e principi misurabili definiti per mobile e desktop |
| IA e user flow | Draft completato | Specifica disponibile; decisioni PO residue |
| Wireframe responsive | Specifica completata | Prototipo e test responsive ancora necessari |
| US-0003 Design System v1 | In progress | Token/componenti/stati specificati; palette, prototipo e test mancanti |
| ADR provider | Proposed | Approvabile solo dopo trial tecnico e verifica licenze |
| Gate 0 | Non superato | Restano decisioni di prodotto, dati, architettura e UX |

## 3. Phase 0 unificata

Le roadmap delle tre baseline usano definizioni differenti di Phase 0. Si propone la seguente sequenza unificata, senza indebolire alcun MUST:

1. **P0-A — Requisiti e scope:** matrice MUST, catalogo mercati MVP, decisioni aperte.
2. **P0-B — Provider:** confronto, trial, copertura, licensing, provider quote.
3. **P0-C — Architettura e dati:** ADR, data model logico, state machine, snapshot/as-of, contratti normalizzati.
4. **P0-D — Specifiche motori:** prediction, confidence/DQ, NO_BET, player, compatibility/correlation, systems, settlement e backtest.
5. **P0-E — UX foundation:** benchmark, IA, user flow, wireframe, Design System, prototipo responsive.
6. **Gate 0 — Decision Ready:** solo dopo il suo superamento iniziano repository, CI e migrazioni.

## 4. Provider comparison — US-0001

### 4.1 Sintesi

| Criterio | API-Football | Sportmonks | football-data.org |
|---|---|---|---|
| Aderenza complessiva MVP | Alta, da provare | Alta, costo maggiore | Bassa-media |
| Fixture/risultati/standings | Sì | Sì | Sì |
| Team/player stats | Ampie, variabili per lega | Ampie e strutturate | Limitate/add-on |
| Injuries/suspensions | Da verificare semanticamente | Disponibili, da provare | Non sufficienti |
| Lineup | Disponibili, qualità da provare | Disponibili | Solo piani avanzati |
| Corner/cards/shots | Disponibili, variabili | Disponibili | Parziali/add-on |
| Odds | Incluse; storico da provare | Add-on/feed | Prevalentemente 1X2 add-on |
| Storico | Dipende dalla lega | 3 stagioni, estendibile | Fino a 10 stagioni su piani dedicati |
| Prezzo iniziale indicativo | da $19/mese | da €29/mese + add-on | da €29/mese + add-on |
| Lock-in | Medio | Medio-alto | Medio |

### 4.2 Decisione proposta

- **Primario provvisorio:** API-Football.
- **Fallback/upgrade progettuale:** Sportmonks.
- **Fallback parziale:** football-data.org solo per fixture, risultati e classifiche.
- Nessun failover automatico nell'MVP finché non esiste entity matching testato.
- Il dominio usa esclusivamente DTO normalizzati e identificativi interni.
- I riferimenti esterni usano una chiave composta `(provider, entity_type, provider_external_id)`.
- Raw payload separati e versionati.

### 4.3 Trial obbligatorio

Testare le stesse 3–5 competizioni su:

- almeno 30 fixture future e 100 concluse;
- 2–3 stagioni storiche;
- almeno 20 casi di assenze e 20 lineup;
- almeno 20 fixture con quote multi-bookmaker.

Misurare completezza, freshness, coerenza, stabilità ID, profondità storico, quote/timestamp, error rate, 429, latency p50/p95 e casi settlement complessi.

### 4.4 Gap da non mascherare

- squalifiche distinte da generici sidelined;
- player shots/assists completi;
- tempestività lineup;
- profondità reale dello storico e delle quote;
- SLA contrattuale;
- diritti commerciali su nomi, stemmi e immagini.

Un dato assente riduce Data Quality e Confidence. Il mercato viene disabilitato se prediction o settlement non sono affidabili; non si inventano valori.

### 4.5 Fonti ufficiali

- [API-Football pricing](https://www.api-football.com/pricing), [rate limits](https://www.api-football.com/news/post/how-ratelimit-works), [terms](https://www.api-football.com/terms)
- [Sportmonks pricing](https://www.sportmonks.com/football-api/plans-pricing/), [documentation](https://docs.sportmonks.com/v3/), [rate limits](https://docs.sportmonks.com/v3/api/rate-limit), [terms](https://www.sportmonks.com/terms-of-service/)
- [football-data.org pricing](https://www.football-data.org/pricing), [documentation](https://www.football-data.org/documentation/quickstart), [terms](https://www.football-data.org/about)

## 5. UX/UI benchmark — US-0002

### 5.1 Pattern da adottare

- Home cronologica con date rail sticky, sezioni per competizione comprimibili e MatchCard compatte.
- Dettaglio match a livelli: overview immediata, categorie mercato, statistiche e rationale on demand.
- System Tray persistente: bottom sheet/bar su mobile, rail sticky su desktop.
- Incompatibilità bloccante con spiegazione e risoluzione; correlazione come avviso classificato e quantificato.
- Storico con distinzione esplicita tra prediction, paper trading e giocate reali.
- Dashboard separate: Model Performance, Betting Performance e Paper Trading.
- Metriche avanzate con definizione, periodo, sample size, freshness e copertura dati.

### 5.2 Regole misurabili

| Area | Regola iniziale |
|---|---|
| Spacing | base 4 px; scala 4/8/12/16/24/32/48 |
| Typography | body almeno 16 px mobile; secondary 14 px; numeri tabulari |
| Touch | target prodotto almeno 44×44 CSS px; gap critici almeno 8 px |
| Accessibility | WCAG 2.2 AA; testo normale almeno 4.5:1; focus visibile |
| Navigazione mobile | massimo 5 destinazioni primarie |
| MatchCard | un solo top pick e una CTA primaria above the fold |
| Feedback locale | risposta visiva entro 100 ms; skeleton dopo circa 300 ms |
| Responsive QA | 320, 375/390, 768, 1024 e 1440 px |
| Dati | timestamp/freshness e sample N per gli insight; DQ degradata sempre visibile |

Probability, Confidence, Data Quality, Value e Pick Score devono avere label, semantica e rappresentazione distinte.

### 5.3 Stati obbligatori

- Loading con skeleton isomorfo.
- Empty differenziato per first use, nessun evento, filtri, slip e storico.
- Error localizzato con ultimo aggiornamento e retry idempotente.
- Stale data distinto da zero dati.
- Disabled sempre accompagnato da motivazione.
- NO_BET come stato reale, motivato e senza CTA ingannevole.

### 5.4 Anti-pattern

- Dark neon, gamification aggressiva o microcopy promozionale da bookmaker.
- Quote più prominenti della Probability del modello.
- Un unico score che mescola Probability, Confidence, Value, DQ e Pick Score.
- Liste mercato infinite senza categorie e navigazione sticky.
- Slip non persistente o costo/combinazioni rivelati solo al termine.
- Correlazione trattata come incompatibilità o viceversa.
- Tabelle dense su mobile e grafici senza periodo, N, baseline o alternativa testuale.

### 5.5 Prerequisiti US-0003

Prima del Design System definitivo produrre:

1. IA e decisione sulla navigazione, inclusa collocazione di “I miei sistemi” e “Impostazioni”.
2. User flow: browse→match→add→warning→configure→review; mark played; settlement; dashboard.
3. Wireframe mobile/desktop con casi realistici e stati degradati.
4. Inventario componenti e matrice degli stati.
5. Glossario delle cinque metriche distinte.
6. Prototipo responsive e test di usabilità sui flussi critici.

Fonti di benchmark: [FotMob](https://www.fotmob.com/faq), [Sofascore Rating](https://www.sofascore.com/news/sofascore-rating), [DraftKings betting flow](https://support.draftkings.com/dk/en-us/how-do-i-place-a-bet-on-draftkings-sports-betting?id=kb_article_view&sysparm_article=KB0010423), [FanDuel Round Robin](https://support.fanduel.com/s/article/What-is-a-Round-Robin), [bet365 Bet Builder](https://help.bet365.com/s/en-us/sports/bet-builder), [WCAG target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).

## 6. Conflitti da risolvere

| ID | Tema | Decisione proposta |
|---|---|---|
| C-01 | Phase 0 diversa nelle tre baseline | Adottare Phase 0 unificata; repo/CI in Phase 1 |
| C-02 | Backlog omette IA, flow, wireframe e prototipo | Aggiungere story Phase 0 UX |
| C-03 | Value MUST nell'SRS, SHOULD altrove | Mantenerlo MUST; capability disabilitabile solo per indisponibilità quote documentata |
| C-04 | Fisse MUST nell'SRS, SHOULD nel Backlog | Elevare US-0705 a MUST |
| C-05 | Automatic Builder non presente in tutti i gate | Mantenerlo MUST e inserirlo nel gate MVP |
| C-06 | Elenco mercati core divergente | Approvare una matrice mercato-per-mercato |
| C-07 | Player 2+ goals ambiguo | Anytime scorer MUST; 2+ richiede decisione Product Owner |
| C-08 | Snapshot standings “opzionali” nel TD | Snapshot obbligatori per ogni feature usata dal modello |
| C-09 | Settlement solo per `played=true` nel Backlog | Separare fixture verification da economic settlement |
| C-10 | Trigger temporale non uniforme | Introdurre `settlement_eligible_at` |
| C-11 | Stato e outcome settlement mescolati | Separare `verification_status` e `settlement_outcome` |
| C-12 | Singolo provider ID | Introdurre mapping multi-provider |
| C-13 | Data model divergente | Approvare modello logico/data dictionary prima delle migrazioni |
| C-14 | Provider quote non deciso | Distinguere provider football e odds |
| C-15 | Metriche minime modello assenti | Definire baseline, sample size e tolleranze |
| C-16 | Auth/resilienza/audit incompleti nel backlog | ADR e story esplicite |
| C-17 | Uso responsabile e vincoli legali assenti | Aprire verifica Product/Legal prima del rilascio reale |

## 7. ADR-0002 — Provider iniziale e fallback

**Stato:** Proposed — condizionato al trial.

**Problema:** scegliere una sorgente adatta all'MVP senza accoppiare il dominio a formati proprietari.

**Alternative:** API-Football; Sportmonks; football-data.org; doppia ingestion attiva dall'inizio.

**Decisione proposta:** API-Football primario provvisorio tramite adapter; Sportmonks fallback progettuale; niente doppia ingestion o failover automatico finché mapping e riconciliazione non sono testati.

**Motivazione:** miglior rapporto tra copertura dichiarata, endpoint, quota API e costo. Sportmonks resta l'alternativa qualitativa se il trial evidenzia vantaggi rilevanti.

**Conseguenze:** adapter sostituibile; raw payload versionati; mapping degli ID; mercati player/odds attivati solo dopo validazione; verifica licenze obbligatoria.

## 8. Gate 0 — exit criteria

Gate 0 è superato soltanto quando:

- ogni MUST ha una disposition tracciata;
- conflitti C-01…C-17 hanno decisione e owner;
- provider e quote hanno trial/decisione documentati;
- catalogo mercati MVP e semantiche settlement sono approvati;
- data model logico, state machine e strategia snapshot/as-of sono approvati;
- contratti dei provider e dei motori sono definiti;
- metriche e soglie iniziali sono configurabili/versionate;
- IA, user flow, wireframe, Design System e prototipo responsive sono validati;
- backlog e gate MVP sono riconciliati con l'SRS.

## 9. Prossime attività autorizzabili

1. Phase 0 unificata approvata; formalizzare singolarmente le decisioni C-02…C-17 ancora aperte.
2. Definire campionato e mercati MVP esatti.
3. Procurare le API key trial di API-Football e Sportmonks.
4. Eseguire il trial e misurare i risultati.
5. Produrre IA, user flow e wireframe.
6. Produrre Design System v1 e prototipo responsive.
7. Approvare ADR e superare Gate 0.
8. Solo allora avviare Phase 1: repository, CI, schema fisico e adapter.
