# FOOTBALL PREDICTION SYSTEM — TECHNICAL DESIGN

## 1. Scopo
Questo documento definisce l'architettura tecnica, i moduli applicativi, i flussi dati, il modello informativo, la strategia di prediction, il motore sistemi, il settlement automatico, la UI/UX e la roadmap di implementazione del Football Prediction System.

Il documento completa l'SRS e deve essere usato dagli agenti come riferimento tecnico vincolante per l'implementazione.

---

## 2. Principi architetturali

- Architettura modulare e sostituibile.
- Separazione netta tra provider esterni, dominio applicativo e UI.
- Nessun lock-in verso un singolo provider dati.
- Prediction Engine indipendente dalla UI.
- Settlement Engine idempotente: una scommessa verificata non deve essere riprocessata.
- Ogni prediction deve essere versionata e immutabile dopo la generazione.
- Ogni dato usato per prediction e backtesting deve essere storicizzato con timestamp.
- Mobile-first obbligatorio.
- UX semplice anche in presenza di elevata complessità algoritmica.
- No Bet è un risultato valido.
- Il sistema deve impedire combinazioni incompatibili e gestire separatamente le correlazioni.

---

## 3. Scope MVP

### MUST
- Caricamento automatico fixture.
- Classifiche e forma recente.
- Statistiche casa/trasferta.
- Infortuni e squalifiche, se disponibili dal provider.
- Probabili formazioni / lineup quando disponibili.
- Mercati 1X2.
- Doppia chance.
- Over/Under principali.
- Goal / No Goal.
- Team goals.
- Risultato esatto.
- Multigol base.
- Mercati marcatore.
- Storico prediction.
- Marcatura manuale "giocata realmente".
- Settlement automatico per eventi passati.
- Distinzione tra performance modello e performance scommesse reali.
- Sistema integrale.
- Sistema assistito.
- Sistema automatico base.
- Compatibility Engine.
- Correlation Engine base.
- UI mobile-first professionale.
- Dashboard storico.
- Backtesting base.
- Paper trading.

### SHOULD
- Corner.
- Cartellini.
- Tiri e tiri in porta.
- Assist.
- Value Engine con quote bookmaker.
- Monte Carlo System Simulation.
- Last Minute Recheck.
- Alert intelligenti.
- AI Analyst.

### COULD
- ML ensemble avanzato.
- Ottimizzazione del timing della quota.
- CLV.
- Modelli specifici per campionato.
- Modelli specifici per mercato.
- Auto-retraining controllato.

---

## 4. Architettura logica

```text
External Football Providers
        |
        v
Provider Adapter Layer
        |
        v
Data Ingestion & Normalization
        |
        v
Domain Database / Event Store
        |
        +----------------------+
        |                      |
        v                      v
Prediction Engine        Settlement Engine
        |                      |
        v                      v
Market Engine          Bet / System History
        |
        v
Compatibility & Correlation Engine
        |
        v
Value Engine
        |
        v
System Builder / Optimizer
        |
        v
API Backend
        |
        v
Mobile-first Web UI
```

---

## 5. Stack raccomandato

### Frontend
- Next.js.
- React.
- TypeScript.
- Tailwind CSS o design system equivalente.
- Component library controllata internamente.
- PWA-ready.

### Backend
- Node.js + TypeScript.
- Framework raccomandato: NestJS o Fastify.
- API REST iniziale.
- Eventuali WebSocket solo per live update futuri.

### Database
- PostgreSQL.
- JSONB solo per dati provider/raw payload controllati.
- Relazioni normalizzate per dominio core.

### Data / Modeling
- Python opzionale per modelli statistici avanzati.
- MVP: possibilità di implementare Poisson e rating direttamente nel backend TypeScript.
- Modulo Python separato solo se introduce valore reale.

### Scheduler
- Cron applicativo o job queue.
- Raccomandato: BullMQ + Redis se aumentano i job asincroni.

### Cache
- Redis opzionale per fixture, standings, odds e response frequenti.

---

## 6. Provider Abstraction Layer

Definire un'interfaccia indipendente dal provider:

```ts
interface FootballDataProvider {
  getFixtures(params): Promise<Fixture[]>;
  getFixture(id): Promise<Fixture>;
  getStandings(params): Promise<Standing[]>;
  getTeamStats(params): Promise<TeamStats>;
  getPlayerStats(params): Promise<PlayerStats[]>;
  getInjuries(params): Promise<Injury[]>;
  getLineups(params): Promise<Lineup[]>;
  getMatchEvents(params): Promise<MatchEvent[]>;
  getOdds(params): Promise<Odds[]>;
}
```

Ogni provider deve avere un adapter dedicato.

### Regola
Il resto dell'applicazione non deve conoscere endpoint, naming o formati proprietari del provider.

---

## 7. Data Ingestion

### Job principali

#### Fixture Sync
- Carica gli eventi futuri dei campionati supportati.
- Orizzonte iniziale consigliato: 7-14 giorni.
- Upsert tramite provider fixture id.

#### Standings Sync
- Aggiornamento periodico.
- Snapshot storico opzionale.

#### Team Stats Sync
- Forma recente.
- Casa/trasferta.
- Gol fatti/subiti.
- xG/xGA se disponibili.

#### Player Availability Sync
- Infortuni.
- Squalifiche.
- Probabili formazioni.

#### Odds Sync
- Se disponibile.
- Timestamp obbligatorio.
- Mai sovrascrivere la quota usata in una prediction già generata.

---

## 8. Modello dati principale

### competitions
- id
- provider_id
- name
- country
- season
- active

### teams
- id
- provider_id
- name
- short_name
- logo_url

### players
- id
- provider_id
- team_id
- name
- role
- active

### fixtures
- id
- provider_fixture_id
- competition_id
- home_team_id
- away_team_id
- scheduled_at
- status
- home_score
- away_score
- result_verified
- verified_at

### standings_snapshots
- id
- competition_id
- team_id
- fixture_date_ref
- position
- points
- played
- won
- drawn
- lost
- goals_for
- goals_against

### team_form_snapshots
- id
- team_id
- captured_at
- last_n
- points_per_game
- goals_for_avg
- goals_against_avg
- home_away_context

### injuries
- id
- fixture_id
- player_id
- status
- reason
- expected_return
- captured_at

### lineups
- id
- fixture_id
- player_id
- team_id
- probable
- confirmed
- starter
- expected_minutes
- captured_at

### predictions
- id
- fixture_id
- model_version_id
- generated_at
- market_type
- market_key
- selection_key
- probability
- confidence
- data_quality
- fair_odds
- provider_odds
- value_score
- pick_score
- rationale_json
- immutable_snapshot_json

### bets
- id
- prediction_id
- system_id nullable
- is_real_play
- bookmaker nullable
- stake nullable
- odds_taken nullable
- played_at nullable
- settlement_status
- settlement_result
- payout nullable
- settled_at nullable

### betting_systems
- id
- created_at
- mode
- budget
- profile
- status
- total_combinations
- total_stake

### system_selections
- id
- system_id
- prediction_id
- is_fixed
- weight

### system_combinations
- id
- system_id
- combination_index
- combined_odds
- stake
- result
- payout

### model_versions
- id
- name
- version
- created_at
- params_json
- active

### backtest_runs
- id
- model_version_id
- competition_id
- date_from
- date_to
- generated_at
- metrics_json

---

## 9. Prediction Engine v1

### Componenti
- Team Strength Rating.
- Recent Form Score.
- Home/Away Score.
- Offensive Strength.
- Defensive Strength.
- Availability Impact.
- Rest / schedule impact.
- Optional H2H low-weight component.

### Pesi iniziali indicativi
- Forma recente: 30%.
- Forza complessiva: 20%.
- Casa/trasferta: 15%.
- Attacco/difesa: 15%.
- Infortuni/squalifiche: 10%.
- H2H: 5%.
- Altri fattori: 5%.

I pesi devono essere configurabili e versionati.

---

## 10. Goal Model

Stimare:

```text
expected_goals_home
expected_goals_away
```

Usare inizialmente distribuzione Poisson o variante calibrata.

Generare matrice scoreline, ad esempio 0-0 fino a 6-6.

Da tale matrice derivare:
- 1X2.
- Double chance.
- Over/Under.
- Goal/No Goal.
- Team goals.
- Correct score.
- Multigol.
- Win to nil.
- Clean sheet.
- Margin of victory.

---

## 11. Player / Scorer Engine

Per ogni giocatore offensivo stimare:
- Probabilità titolarità.
- Minuti attesi.
- Goal share.
- xG/90.
- Tiri/90.
- Tiri in porta/90.
- Rigori.
- Calci piazzati.
- Stato forma.
- Forza difensiva avversaria.

Output minimo:
- Player to score anytime.
- Player 2+ goals.
- Shots on target, se disponibile.
- Assist, se disponibile.

Il totale delle probabilità individuali deve essere coerente con gli expected goals di squadra.

---

## 12. Market Engine

Il Market Engine trasforma output statistici in mercati scommessa normalizzati.

Ogni mercato deve avere:
- market_type.
- market_key.
- selection_key.
- probability.
- fair_odds.
- confidence.
- data_quality.

---

## 13. Compatibility Engine

### Stati
- COMPATIBLE.
- CORRELATED.
- INCOMPATIBLE.

### Regola fondamentale
Le selezioni INCOMPATIBLE non devono mai essere incluse nella stessa combinazione.

### Esempi
- Over 3.5 + Under 2.5 → INCOMPATIBLE.
- Goal + No Goal → INCOMPATIBLE.
- Correct score 1-0 + Goal → INCOMPATIBLE.
- Correct score 1-0 + Over 2.5 → INCOMPATIBLE.
- Player scores + Team scores 0 → INCOMPATIBLE.
- Player scores + Team over 1.5 → CORRELATED.
- Team wins + main striker scores → CORRELATED.

### Implementazione
Usare una rule engine centralizzata.
Non distribuire regole in if/else sparsi.

---

## 14. Correlation Engine

Calcolare un correlation score tra selezioni.

Categorie:
- Same fixture.
- Same team.
- Same player.
- Logical correlation.
- Market dependency.

Il System Optimizer deve penalizzare combinazioni troppo correlate.

---

## 15. Value Engine

Input:
- Probability model.
- Fair odds.
- Bookmaker odds.

Formula base:

```text
fair_odds = 1 / probability
expected_value = probability * bookmaker_odds - 1
```

Output:
- Negative value.
- Neutral.
- Positive value.

Il Value Engine non sostituisce il Confidence Score.

---

## 16. Pick Score

Indice sintetico 0-100.

Componenti consigliati:
- Probability.
- Confidence.
- Data quality.
- Expected value.
- Model consensus.
- Market reliability.
- Correlation penalty.

Il Pick Score serve a ordinare le opportunità, non deve nascondere le metriche sottostanti.

---

## 17. No Bet Engine

Il sistema deve poter rifiutare una prediction operativa quando:
- confidence troppo bassa;
- dati insufficienti;
- modelli discordanti;
- value insufficiente;
- mercato storicamente poco affidabile;
- lineup troppo incerta.

Output:

```text
NO_BET
reason_code
reason_text
```

---

## 18. System Builder

### Modalità
- Automatico.
- Assistito.
- Manuale.

### Integrale
Esempio:

```text
6 selezioni
sistema 3/6
C(6,3) = 20 combinazioni
```

### Ridotto
Genera un sottoinsieme di combinazioni entro budget.

### Ponderato
Attribuisce maggior peso alle combinazioni migliori.

### Con fisse
Consente selezioni obbligatorie in ogni combinazione.

---

## 19. System Optimizer

Input:
- Selezioni.
- Budget.
- Profilo rischio.
- Numero massimo combinazioni.
- Eventuali fisse.
- Vincoli di esposizione.

Profili:
- Prudente.
- Bilanciato.
- Aggressivo.

Vincoli:
- Incompatibilità zero.
- Correlazione massima configurabile.
- Esposizione massima per fixture.
- Esposizione massima per campionato.
- Esposizione massima per mercato.

---

## 20. Monte Carlo Simulation

Simulare migliaia di scenari usando probabilità calibrate.

Output:
- Probability of return.
- Probability of profit.
- Expected return.
- Median return.
- Max loss.
- Drawdown stimato.
- Distribution percentile.

Non presentare la simulazione come garanzia.

---

## 21. Storico scommesse

Ogni prediction può essere:
- non giocata;
- giocata realmente;
- usata in paper trading.

Ogni scommessa reale deve poter contenere:
- bookmaker;
- quota effettiva;
- stake;
- timestamp;
- note opzionali.

### Stati settlement
- PENDING.
- SETTLED.
- VOID.
- PARTIAL_WIN.
- PARTIAL_LOSS.

---

## 22. Settlement automatico

### Regola trigger
Un evento è candidato alla verifica quando:

```text
scheduled_at + expected_duration + safety_margin < now
AND result_verified = false
```

### Processo
1. Recupera solo fixture passate non verificate.
2. Interroga provider.
3. Se evento concluso, salva risultato.
4. Imposta result_verified = true.
5. Esegue settlement delle bet PENDING collegate.
6. Imposta settled_at.
7. Non riprocessa eventi già verificati.

### Caso evento non concluso
Rimane non verificato e verrà ricontrollato in seguito.

### Idempotenza
Ogni job deve poter essere rieseguito senza duplicare settlement o modificare bet già settled.

---

## 23. Performance Analytics

Separare sempre:

### Model Performance
Su tutte le prediction generate.

Metriche:
- Accuracy.
- Brier score.
- Log loss.
- Calibration error.
- Performance per mercato.
- Performance per campionato.
- Performance per confidence bucket.

### Betting Performance
Solo scommesse realmente giocate.

Metriche:
- Profit/Loss.
- ROI.
- Yield.
- Win rate.
- Average odds.
- Max drawdown.
- Profit by market.
- Profit by competition.
- Profit by strategy.

---

## 24. Backtesting

### Regola critica
No data leakage.

Per una prediction storica il modello deve vedere solo dati disponibili prima dell'evento.

### Output
- Performance per versione modello.
- Performance per mercato.
- Performance per campionato.
- Calibration curve.
- ROI virtuale.
- Drawdown.

---

## 25. Paper Trading

Modalità obbligatoria prima dell'uso reale del motore.

Funzioni:
- Bankroll virtuale.
- Bet virtuali.
- Settlement automatico.
- ROI.
- Yield.
- Drawdown.
- CLV futuro.

---

## 26. Model Versioning

Ogni prediction deve puntare a una model_version.

Le modifiche a:
- pesi;
- formule;
- feature;
- calibration;

devono produrre nuova versione.

Una prediction storica non deve essere ricalcolata con una versione nuova.

---

## 27. Last Minute Recheck

Prima dell'inizio partita:
- conferma lineup;
- aggiorna infortuni;
- aggiorna quote;
- ricalcola prediction;
- confronta delta.

Se cambia significativamente:
- segnala il delta;
- aggiorna solo la nuova prediction;
- conserva lo snapshot precedente.

---

## 28. Alert Engine

Esempi:
- titolare assente;
- quota cambia significativamente;
- prediction cambia oltre soglia;
- scommessa in sistema diventa NO_BET;
- evento settled.

---

## 29. AI Analyst

L'AI non deve inventare pronostici.

Deve spiegare esclusivamente output e dati del motore.

Prompt grounding obbligatorio su:
- statistiche fixture;
- prediction;
- injuries;
- lineups;
- model rationale;
- odds;
- performance storica.

---

## 30. UX/UI — requisiti vincolanti

La UI deve avere qualità percepita pari a una moderna app professionale sportsbook / fintech.

### Principi
- Mobile-first.
- Navigazione a una mano.
- Information hierarchy rigorosa.
- Nessuna schermata sovraccarica.
- Progressive disclosure.
- Componenti coerenti.
- Stati loading/error/empty progettati.
- Dark e light mode predisposti.
- Accessibilità.
- Responsive desktop/tablet.

### Menu principale suggerito
- Pronostici.
- Partite.
- Crea Sistema.
- Storico.
- Statistiche.
- Impostazioni.

### Home / Pronostici
Card partita con:
- squadre;
- orario;
- top pick;
- probability;
- confidence;
- value;
- CTA Aggiungi al sistema.

### Dettaglio partita
Tab:
- Overview.
- Esiti.
- Gol.
- Giocatori.
- Corner.
- Cartellini.
- Analisi.

### System Slip
Sempre accessibile.

Mostrare:
- numero selezioni;
- incompatibilità;
- correlazioni;
- budget;
- sistemi suggeriti.

### System Builder
Due entry point:

#### Automatico
- budget;
- rischio;
- campionati;
- genera.

#### Avanzato
- selezioni;
- fisse;
- doppie/triple/quadruple;
- budget;
- copertura;

### Storico
Filtri:
- tutte;
- giocate;
- simulate;
- vinte;
- perse;
- pending.

Ogni card deve mostrare chiaramente:
- mercato;
- quota;
- stake;
- risultato;
- payout;
- stato.

---

## 31. Design System

Definire prima dell'implementazione:
- color tokens;
- typography scale;
- spacing scale;
- radius;
- elevation;
- iconography;
- buttons;
- chips;
- cards;
- tabs;
- filters;
- bottom navigation;
- modal / bottom sheet;
- toast;
- empty state;
- error state;
- skeleton.

Ogni stato interactive deve essere progettato:
- default;
- hover;
- pressed;
- focus;
- disabled;
- selected;
- error.

---

## 32. Sicurezza e robustezza

- Segreti provider solo server-side.
- Rate limiting.
- Input validation.
- Audit log per operazioni critiche.
- Job idempotenti.
- DB migration versionate.
- Retry con backoff sui provider.
- Circuit breaker se provider indisponibile.
- Logging strutturato.

---

## 33. Test strategy

### Unit
- prediction formulas;
- market derivation;
- compatibility rules;
- settlement rules;
- system combinations.

### Integration
- provider adapters;
- database;
- scheduler;
- settlement flow.

### E2E
- fixture load;
- prediction;
- add to system;
- mark played;
- settlement;
- history.

### Statistical tests
- calibration;
- stability;
- data leakage checks;
- regression model version.

---

## 34. Roadmap tecnica

### Phase 0 — Foundation
- repo;
- CI;
- coding standards;
- environment;
- database;
- provider interface.

### Phase 1 — Data Platform
- fixture ingestion;
- standings;
- teams;
- players;
- stats.

### Phase 2 — Prediction MVP
- rating engine;
- Poisson;
- base markets;
- confidence;
- no bet.

### Phase 3 — UI MVP
- home;
- fixture detail;
- market selection;
- system slip;
- responsive.

### Phase 4 — Systems
- integral;
- fixed selections;
- compatibility;
- correlation;
- budget optimization.

### Phase 5 — History & Settlement
- real-play flag;
- paper trading;
- automated settlement;
- analytics.

### Phase 6 — Player Markets
- scorer;
- shots;
- assist;
- player availability.

### Phase 7 — Validation
- backtesting;
- calibration;
- model comparison;
- statistical dashboard.

### Phase 8 — Advanced
- value engine;
- Monte Carlo;
- last-minute recheck;
- alerts;
- AI Analyst.

---

## 35. Istruzioni per gli agenti

1. L'SRS e questo Technical Design sono vincolanti.
2. Non rimuovere requisiti per semplificare l'implementazione.
3. Eventuali variazioni architetturali devono essere motivate.
4. Prima di implementare un modulo, verificare dipendenze e acceptance criteria.
5. La UI non deve essere improvvisata durante lo sviluppo.
6. Prima del frontend definitivo devono esistere wireframe e design system.
7. Nessuna prediction deve essere presentata come certezza.
8. Nessuna combinazione incompatibile deve poter essere generata.
9. Gli eventi verificati non devono essere riprocessati.
10. Le prediction storiche devono essere immutabili.
11. Evitare data leakage in ogni forma.
12. Ogni algoritmo deve essere versionato.
13. I test statistici fanno parte della Definition of Done.
14. Ogni feature deve funzionare correttamente su mobile prima di essere considerata completa.

---

## 36. Definition of Done MVP

L'MVP è considerato pronto quando:

- gli eventi vengono caricati automaticamente;
- vengono generate prediction coerenti e versionate;
- sono disponibili almeno i mercati core;
- l'utente può aggiungere selezioni a un sistema;
- incompatibilità sono bloccate;
- correlazioni sono segnalate;
- il sistema può generare combinazioni integrali;
- l'utente può indicare se ha realmente giocato;
- gli eventi passati vengono verificati automaticamente;
- gli eventi già verificati non vengono riprocessati;
- le giocate vengono settled automaticamente;
- lo storico mostra esiti e performance;
- il modello è backtestabile;
- esiste paper trading;
- la UI è mobile-first e conforme al design system;
- test unit, integration ed E2E critici sono verdi.

---

## 37. Decisioni da chiudere prima del coding completo

- Provider dati primario.
- Provider quote.
- Campionati iniziali.
- Mercati MVP esatti.
- Strategia auth utente.
- Hosting.
- Strategia notifiche.
- Design system definitivo.
- Frequenza scheduler.
- Soglie NO_BET.
- Soglie correlation penalty.
- Metriche minime di accettazione del modello.

