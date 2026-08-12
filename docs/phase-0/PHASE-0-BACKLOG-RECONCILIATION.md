# Football Prediction System — Phase 0 Backlog Reconciliation

**Versione:** 0.1  
**Data:** 12/08/2026  
**Stato:** In progress

## 1. Stato formale

| Item | Stato | Evidenza/condizione |
|---|---|---|
| Phase 0 unificata | Approved | Approvazione Product Owner del 12/08/2026 |
| API-Football primario | Provisionally accepted | Trial e licensing mancanti |
| US-0001 | In validation | AC documentali coperti; verifica concreta mancante |
| US-0002 | Done | Benchmark, pattern, anti-pattern e regole misurabili disponibili |
| IA/user flow/wireframe spec | Draft complete | Richiede decisioni PO e prototipo |
| US-0003 | In progress | DS spec disponibile; mancano palette verificata, prototipo e usability/accessibility test |
| ADR-0001 stack | Proposed | Approvazione richiesta |
| ADR-0002 provider | Conditional | Trial richiesto |
| Gate 0 | Not passed | Blocchi elencati sotto |

## 2. Riconciliazioni vincolanti

- Value resta MUST: elevare US-1201/1202 a MUST/MVP; se quote non affidabili la capability è esplicitamente unavailable, non eliminata.
- Selezioni fisse restano MUST: elevare US-0705.
- Automatic Builder base resta MUST: inserire US-0704 nel gate MVP.
- Snapshot/as-of obbligatori per ogni feature utilizzata.
- Fixture verification è indipendente da `played`; settlement economico opera su REAL e PAPER. Correggere US-0803.
- Separare `verification_status` da `settlement_outcome` in US-0202/0804/0805.
- Usare mapping esterno multi-provider e provider football/odds separabili.
- Aggiungere owner, dependency, evidence, status e decision reference ai conflitti C-01…C-17.

## 3. Story Phase 0 da aggiungere

1. Requirements traceability e catalogo mercati MVP.
2. IA e navigazione.
3. Critical user flows.
4. Responsive wireframes e state matrix.
5. Prototype/usability/accessibility validation.
6. Logical data model e data dictionary.
7. Domain state machine e settlement semantics.
8. Normalized provider/module contracts.
9. Prediction, Confidence, DQ e NO_BET specification.
10. Security/Auth/Resilience/Observability ADR.
11. Product/Legal responsible-use review.

## 4. Decision register C-01…C-17

| ID | Stato | Disposition/owner |
|---|---|---|
| C-01 | Approved | Phase 0 unificata; Orchestrator |
| C-02 | In progress | Story UX P0; UX/PO |
| C-03 | Mandated | Value MUST; PO/Backend |
| C-04 | Mandated | Fisse MUST; PO/Systems |
| C-05 | Mandated | Automatic Builder MUST; PO/Systems |
| C-06 | Open/blocking | Catalogo mercato-per-mercato; PO/Quant/Provider |
| C-07 | Open | Anytime scorer MUST; decisione 2+ goals; PO |
| C-08 | Draft resolved | Snapshot per feature; Architecture/Quant/QA |
| C-09 | Draft resolved | Verification separata dal settlement; Architecture/QA |
| C-10 | Draft resolved | settlement_eligible_at; Architecture/PO |
| C-11 | Draft resolved | Status separato da outcome; Architecture/QA |
| C-12 | Draft resolved | Mapping multi-provider; Architecture/Data |
| C-13 | In progress/blocking | Data model/data dictionary; Architecture/Data |
| C-14 | Open/blocking | Provider quote e diritti; Provider/PO/Legal |
| C-15 | Open/blocking | Metriche, sample size e soglie; Quant/PO |
| C-16 | Open/blocking | Auth, resilienza, audit e hosting; Architecture/Security/DevOps |
| C-17 | Open before release | Responsible use, età, giurisdizione, privacy/licenze; PO/Legal |

`Draft resolved` significa che esiste una soluzione coerente da approvare, non che la baseline sia già modificata.

## 5. Gate 0 — blocchi residui

- API key e trial API-Football/Sportmonks su competizioni approvate.
- Provider quote, licensing, retention, SLA e diritti commerciali.
- Catalogo mercati MVP e semantiche settlement.
- Soglie trial e go/no-go.
- Soglie/versioni Prediction, Confidence, DQ, NO_BET e correlazione.
- Metriche statistiche, sample size e tolleranze.
- Decisioni auth, hosting, backup, RPO/RTO, scheduler, audit e secret manager.
- Prototipo responsive, palette/contrasti e test usability/accessibility.
- Reconciliation effettiva delle tre baseline.

## 6. Lavoro autorizzato ora

Prototipo UX, requirements traceability, data dictionary/state-machine draft, contracts draft e trial plan. Repository bootstrap, schema fisico e coding definitivo restano bloccati finché Gate 0 non è passato.

## 7. Prossime decisioni del Product Owner

1. Competition iniziale e stagioni del trial/MVP.
2. Catalogo mercati: inclusione o posticipo di `2+ goals`.
3. Approvazione ADR-0001 stack.
4. Approvazione navigation mobile aggregata `Sistemi`.
5. Soglie di accettazione trial, metriche e campione minimo.
6. Strategia auth/multiutente e responsible-use/legal.

