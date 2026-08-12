# Phase 0 — Design System v1

## Direzione
Professional sports analytics / fintech. Interfaccia sobria, premium, veloce e data-driven. Nessun look da gestionale e nessuna imitazione visiva di bookmaker esistenti.

## Token semantici
I token devono essere implementati via CSS variables e supportare light/dark.

### Color roles
- `surface/base`, `surface/raised`, `surface/interactive`
- `text/primary`, `text/secondary`, `text/inverse`
- `border/default`, `border/strong`
- `accent/primary`
- `status/positive`, `status/warning`, `status/negative`, `status/info`
- `data/probability`, `data/confidence`, `data/value`, `data/quality`

Colori status non devono essere l'unico segnale semantico.

## Typography
- Font sans-serif UI ad alta leggibilità.
- Scala: 12 / 14 / 16 / 20 / 24 / 32.
- Body mobile: 16 px dove possibile; secondary 14 px.
- Numeri tabulari per odds, probability, stake e KPI.
- Gerarchia tramite dimensione/peso, non uppercase esteso.

## Spacing
Base 4 px: 4 / 8 / 12 / 16 / 24 / 32 / 48.

## Radius
- controls: 10–12 px
- cards: 16 px
- sheets/modals: 20–24 px
- pills: full radius

## Elevation
Massimo 3 livelli. Preferire border/surface separation alle ombre pesanti.

## Componenti obbligatori
- AppShell
- TopBar
- BottomNav
- FixtureCard
- PickCard / MarketSelection
- ProbabilityBadge
- ConfidenceIndicator
- DataQualityIndicator
- ValueIndicator
- MarketTabs
- FilterChips
- SystemSlipBar
- SystemSelectionRow
- CompatibilityAlert
- CorrelationNotice
- BudgetSummary
- RiskSelector
- EmptyState
- ErrorState
- Skeleton
- Toast
- BottomSheet
- Dialog
- KPI card

## Stati interattivi
Ogni controllo: default, hover (desktop), pressed, focus-visible, selected, disabled, error, loading dove pertinente.

## FixtureCard hierarchy
1. competition/time/status
2. teams
3. top pick
4. probability
5. confidence/data quality compact
6. value solo se quota disponibile
7. CTA `+ Sistema`

## Regole metriche
- Probability: percentuale stimata dell'evento.
- Confidence: affidabilità della prediction.
- Data Quality: completezza/freschezza input.
- Value: differenza economica rispetto alla quota/fair odds.
- Pick Score: ranking interno; non sostituisce le metriche precedenti.

## Responsive
- 320–479: single column, bottom nav, system slip bottom.
- 480–767: mobile wide.
- 768–1023: tablet, possibile master/detail.
- >=1024: navigation rail/sidebar, content max-width leggibile, slip laterale opzionale.

## Motion
- 120–220ms per feedback comuni.
- niente animazioni decorative che ritardino la selezione.
- rispettare `prefers-reduced-motion`.

## Copy
Breve e operativo. `NO_BET` viene spiegato con motivazione (confidence bassa, dati insufficienti, value assente), mai presentato come errore.
