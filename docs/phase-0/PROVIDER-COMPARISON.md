# Phase 0 — Provider Comparison

**Data:** 2026-08-12  
**Stato:** Decisione iniziale approvata dall'Orchestratore

## Obiettivo
Selezionare un provider iniziale senza introdurre lock-in nel dominio. La decisione rispetta SRS/Technical Design: tutti i provider saranno accessibili esclusivamente tramite adapter.

## Provider valutati

| Criterio | API-Football | Sportmonks | football-data.org |
|---|---|---|---|
| Fixture / risultati / standings | Sì | Sì | Sì |
| Lineup | Sì | Sì | Sì nei piani deep/standard |
| Infortuni | Sì | Sì | Non evidenziati nell'offerta standard |
| Squalifiche | Sidelined/injuries disponibili | Sì | Non evidenziate |
| Player statistics | Sì | Sì, avanzate | Dati più limitati |
| Goal scorer / eventi | Sì | Sì | Sì nei piani deep/standard |
| Corner / cards / shots | Statistics | Advanced statistics | Statistic add-on |
| Odds | Pre-match + in-play | Add-on odds, 150+ mercati dichiarati | Odds add-on 1X2 pre-match |
| xG | Non assunto come copertura MVP finché non validato sul campionato | Add-on dedicato player/team xG | Non parte dell'offerta base verificata |
| Storico | Free limitato per stagioni; piani paid da validare per profondità effettiva | 3 stagioni incluse; storico più profondo come add-on | ML Pack Light: 10 stagioni |
| Entry price verificato | Free; Pro $19/mese, 7.500 req/day | Starter €29/mese, 5 leghe, 2.000 call/entity/hour | Free; €29 deep/ML; €49 Standard |
| Scala | Tutte competizioni/endpoints nei piani, quota richieste variabile | Leghe selezionabili, 2.300+ dichiarate | 12–100 competizioni secondo piano |

## Decisione

### Provider primario MVP: Sportmonks
Motivazioni:
1. copertura esplicita di injuries **e suspensions**;
2. statistiche squadra/giocatore e lineup integrate;
3. add-on xG esplicito e documentato;
4. modello di rate limit elevato per entity, utile per ingestion e recheck;
5. storico acquistabile separatamente, utile al backtesting;
6. odds disponibili come add-on senza contaminare il Prediction Engine con prediction proprietarie.

### Adapter fallback: API-Football
Motivazioni:
- costo di ingresso inferiore;
- endpoint ampi: fixture, events, lineups, injuries, odds, statistics;
- ottimo candidato per fallback operativo e confronto di copertura.

### Provider di supporto/backtest: football-data.org
Interessante per storico economico (ML Pack Light) e dataset tradizionali, ma non viene scelto come primario perché la copertura verificata di availability/injuries e player props è meno adatta al perimetro MVP.

## Vincolo importante
Le prediction proprietarie eventualmente offerte dai provider **non saranno usate come output del prodotto**. Potranno essere usate solo come benchmark separato. Le prediction FPS sono generate dal motore quantitativo interno.

## Strategia costi
Lo sviluppo deve funzionare con adapter mock/fixture versionate senza richiedere subito un abbonamento. Per integrazione reale Sportmonks servirà una API key dell'account; fino ad allora test e sviluppo procedono con contratti e dataset mock.

## Contratto dominio minimo
`FootballDataProvider` deve esporre almeno:
- `getCompetitions()`
- `getFixtures()` / `getFixture()`
- `getStandings()`
- `getTeams()` / `getPlayers()`
- `getTeamStatistics()` / `getPlayerStatistics()`
- `getLineups()`
- `getInjuries()` / `getSuspensions()`
- `getEvents()`
- `getOdds()`

Nessun tipo proprietario del provider può oltrepassare l'adapter.

## Rischi aperti da validare in integrazione
- copertura effettiva Serie A per ogni data-point e stagione;
- disponibilità temporale di lineup/injury;
- semantica settlement dei player props;
- profondità e granularità odds;
- licensing/ToS per persistenza degli snapshot.

## Fonti verificate
- API-Football pricing/documentation, consultata 2026-08-12.
- Sportmonks Football API plans/pricing e xG API, consultate 2026-08-12.
- football-data.org pricing, consultato 2026-08-12.
