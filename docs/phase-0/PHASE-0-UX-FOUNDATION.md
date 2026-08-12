# Football Prediction System — UX Foundation

**Versione:** 0.1  
**Data:** 12/08/2026  
**Stato:** Draft validated by orchestration — prototipo e test ancora necessari

## 1. Tracciabilità

Questa specifica attua `UX-001`, `US-0003`, `US-1301…US-1306`, `US-0701…US-0705`, `US-0802/0806`, `US-0901/0902` e i principi UI/UX delle baseline. Probability, Confidence, Data Quality, Value e Pick Score restano metriche distinte.

## 2. Information Architecture v1

### Mobile

Bottom navigation, massimo cinque destinazioni:

1. Pronostici
2. Partite
3. Sistemi
4. Storico
5. Statistiche

`Sistemi` contiene le viste `Crea` e `I miei sistemi`. Impostazioni, glossario, stato dati e note legali sono secondari nel profilo/header. Il System Tray è persistente sopra la bottom navigation quando contiene selezioni e non è una destinazione primaria.

### Desktop

Sidebar con le sei destinazioni della baseline: Pronostici, Partite, Crea Sistema, I miei sistemi, Storico e Statistiche. System Tray sticky a destra; Impostazioni nel footer della sidebar.

### Gerarchia

- Pronostici → giorno → competizione → MatchCard → top pick.
- Partite → data/competizione/stato → fixture → dettaglio.
- Dettaglio → Overview, Mercati, Statistiche, Giocatori, Analisi.
- Sistemi → Crea: Automatico/Assistito/Manuale; I miei sistemi: Bozze/Aperti/Conclusi.
- Storico → Prediction/Paper/Reale/Non giocata + filtri ed esiti.
- Statistiche → Model Performance/Betting Performance/Paper Trading, senza KPI aggregati tra perimetri.

## 3. Flussi critici

### Browse → sistema

MatchCard/dettaglio → `+ Sistema` → controllo immediato. `INCOMPATIBLE` rifiuta l'aggiunta e spiega conflitto e rimedio. `CORRELATED` consente l'aggiunta con warning. Il review mostra sempre selezioni, struttura, combinazioni, stake, costo, budget e rischio/copertura prima del salvataggio.

### Automatico

Budget + rischio + competizioni/periodo → genera → review. Se mancano opportunità valide, restituisce `NO_BET`/opportunità insufficienti senza ridurre le soglie.

### Assistito e Manuale

Assistito propone struttura e copertura sui pick scelti. Manuale espone K/N, fisse e stake solo in modalità avanzata, aggiornando costo e combinazioni in tempo reale. Conferma bloccata per incompatibilità, budget superato o input invalido.

### Giocata reale, paper e settlement

Da un sistema salvato, `L'ho giocato` acquisisce bookmaker, quota effettiva, stake, data/ora e note. Paper e reale sono azioni separate. Lo storico visualizza PENDING fino a verifica e poi outcome/payout. Force refresh è solo amministrativo.

### Analytics e NO_BET

Le dashboard richiedono scelta esplicita Model/Betting/Paper e mostrano periodo, N, freshness e definizione. `NO_BET` mostra motivazione, DQ/confidence e dati mancanti, senza CTA ingannevole.

## 4. Wireframe funzionali

### App shell

Top bar con logo, freshness/stato dati e profilo; contenuto scrollabile; tray collassato `Sistema · N selezioni · € costo`; bottom nav mobile. Banner stale/offline non deve coprire le azioni.

### Pronostici e Partite

Data rail sticky, chip filtro, gruppi competizione comprimibili. MatchCard: ora/stato, squadre, un top pick, Probability primaria, Confidence e DQ etichettate, Value solo con quota valida, `+ Sistema`, Dettaglio. Card `NO_BET` con motivazione e Analisi, senza add. Partite usa FixtureCard compatte e empty state diversi per filtri e assenza eventi.

### Dettaglio partita

Header sticky; insight principale; tab Overview/Mercati/Statistiche/Giocatori/Analisi. Prima viewport limitata a header, insight e navigazione. Mercati per categorie sticky. Statistiche accessibili con fonte/as-of. Analisi espone rationale grounded, model version e feature/as-of.

### Crea e I miei sistemi

Segmented control Automatico/Assistito/Manuale. Summary sticky con N, combinazioni, stake, costo/budget e rischio/copertura. Review richiede zero incompatibilità. Le card sistema distinguono Reale, Paper e Non giocato; il back preserva filtri e scroll.

### Storico e Statistiche

Storico mobile a card, con dettaglio e timeline Created → Played → Verified → Settled. Statistiche: tab Model/Betting/Paper, KPI semplici e breakdown espandibili; ogni metrica riporta scope, N e freshness. Campione insufficiente non genera giudizi verdi/rossi.

## 5. Design System v1

Direzione: analytics premium sobria, senza neon, gamification o linguaggio promozionale da bookmaker. Font Inter/system; numeri tabulari.

- Spacing: 0/4/8/12/16/20/24/32/40/48/64.
- Radius: 8 controlli, 12 card, 16 sheet, 999 pill.
- Type mobile: 32/38 display; 28/34 H1; 22/28 H2; 18/24 H3; 16/24 body; 14/20 secondary; 12/16 solo non essenziale; 24/30 metric.
- Touch target: minimo 44×44 px, preferito 48; gap azioni critiche ≥8 px.
- Motion: 100/180/240 ms; rispetto di `prefers-reduced-motion`.
- WCAG 2.2 AA: testo 4.5:1; UI/large text 3:1; focus visibile, reflow 200%, keyboard e screen reader.

Color token semantici light/dark: background, surface, raised, text-primary/secondary, border, focus, brand, success, warning, danger, info e token separati per Probability, Confidence, DQ, Value e Pick Score. Colore mai unico veicolo semantico.

Componenti dominio minimi: MatchCard, FixtureCard, MarketRow, ProbabilityMetric, ConfidenceBadge, DataQualityBadge, ValueBadge, NoBetPanel, SystemTray, SystemSummary, CompatibilityBlocker, CorrelationWarning, HistoryCard, OutcomeBadge, MetricCard, FreshnessIndicator e ModelVersionTag.

Ogni componente prevede default, hover, pressed, focus-visible, disabled con motivo, selected/error/loading quando applicabili. Sono obbligatori skeleton isomorfi, empty differenziati, stale, error localizzato con retry idempotente e insufficient-sample.

## 6. Exit criteria UX

- Prototipo responsive verificato a 320, 390, 768, 1024 e 1440 px.
- Nessuno scroll orizzontale salvo data visualization intenzionale con alternativa testuale.
- Contrasti AA verificati e zero violazioni axe critical/serious sui flussi core.
- Test con almeno 5 utenti: ≥80% task completion senza aiuto per add→review, automatic builder, mark played e ricerca esito; zero problemi severe.
- Ogni review di sistema mostra i sette elementi obbligatori e blocca incompatibilità.
- Back navigation preserva il contesto.

## 7. Decisioni UX aperte

Nav aggregata `Sistemi`; auth/multiutente; provider quote; timezone/formato quota; glossario e soglie DQ/confidence; copy correlazione; 2+ goals; responsible-use/age gate; soglia campione insufficiente; brand/palette; persistenza bozze anonime.

