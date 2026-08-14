# ADR-0005 — Provider cache, request deduplication and manual refresh

## Stato
Accepted — 2026-08-14

## Problema
Il client standalone interroga direttamente i provider configurati. In sviluppo React StrictMode e più moduli applicativi possono richiedere la stessa risorsa quasi contemporaneamente. Sul piano free football-data.org il limite è 10 richieste/minuto; richieste duplicate hanno prodotto HTTP 429. SRS NFR-008 richiede caching/deduplicazione e il backlog US-1502 richiede gestione dei rate limit provider.

## Alternative considerate
1. Nessuna cache, solo retry/backoff: semplice ma spreca quota e peggiora UX.
2. Cache solo delle prediction finali: riduce alcuni reload ma non protegge richieste condivise a standings, fixtures, scorers e intelligence.
3. Cache/dedup al confine provider: protegge tutti i consumer e preserva il dominio indipendente dal provider.

## Decisione
Adottare un guard sul traffico provider con:
- cache persistente per endpoint, senza includere token nella cache key;
- TTL differenziato per natura del dato;
- deduplicazione delle richieste concorrenti;
- finestra prudenziale per football-data.org sotto il limite nominale;
- lettura degli header di reset quando disponibile;
- fallback a cache stale su 429 o errore di rete;
- refresh manuale esplicito che bypassa temporaneamente la cache;
- indicatore UI di ultima sincronizzazione e origine NETWORK/CACHE/STALE_CACHE.

TTL iniziali:
- odds: 2 minuti;
- lineup/injuries/match detail: 5 minuti;
- fixtures/matches: 10 minuti;
- standings/scorers: 30 minuti;
- default: 10 minuti.

## Impatti
### Vantaggi
- drastica riduzione delle chiamate duplicate;
- migliore resilienza a 429 e problemi temporanei;
- UX trasparente sulla freschezza del dato;
- nessun dato inventato: lo stale cache è esplicitamente identificato.

### Svantaggi
- dati non sempre al secondo;
- maggiore complessità del client standalone;
- il refresh forzato può consumare quota e va usato consapevolmente.

## Vincoli
- Nessun refresh deve modificare snapshot storici già prodotti.
- La cache non modifica Probability/Confidence/Data Quality: conserva solo payload provider.
- In caso di dati stale la UI deve dichiararlo; non può presentarli come live.
- La strategia resta dietro il confine provider e non introduce dipendenze del dominio da football-data.org/API-Football.
