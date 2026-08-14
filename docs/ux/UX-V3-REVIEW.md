# FPS UX/UI V3 — Simplified Consumer Experience

## Goal
Make the primary flow self-explanatory for a first-time user: open app → understand recommendations → inspect a match → add/remove a prediction → open the system.

## Baseline alignment
- Mobile-first and one-hand navigation.
- Progressive disclosure.
- Advanced statistics are available on demand, not in the first viewport.
- Probability, Confidence and Data Quality remain distinct in the domain; UI translates Confidence to human labels and exposes technical detail only in advanced views.
- Add/remove selection must be immediate and reversible.
- NO_BET remains a valid result and is presented as “Nessun pronostico consigliato”.

## Benchmark patterns
Patterns reviewed from modern sportsbook/mobile experiences: calendar/competition navigation, compact event cards, simplified event pages, grouped markets, persistent bet/system slip, explicit selected states, reduced clutter.

## Decisions
1. Home is task-oriented, not analytics-oriented.
2. Primary navigation: Home, Partite, Sistema, Storico. Secondary functions stay in the drawer.
3. Match list uses compact cards. Market expansion happens in match detail, not inside every list card.
4. Filters expose only common concepts; Probability/Confidence/Data Quality thresholds are under “filtri avanzati”.
5. Technical wording is translated: Confidence → Affidabilità; Data Quality → Qualità dati; NO_BET → Nessun pronostico consigliato.
6. Preseason is automatic context. Technical switching is hidden under advanced data options.
7. Selection is a toggle: the same control adds and removes. Selected state always explains the next click.
8. Every primary CTA uses an action/result label: “Aggiungi al sistema”, “Selezionato · tocca per rimuovere”, “Vedi pronostici e analisi”, “Apri sistema”.
9. System slip is persistent when selections exist and always shows the count.
10. Advanced analysis is collapsed by default.

## Visual system
- Light consumer-first surface with strong contrast and blue primary action.
- Green reserved for positive/selected/healthy states; amber for medium caution; red for errors/low reliability.
- 44px+ primary touch targets.
- 16–20px card radius and low elevation.
- Compact typography hierarchy with technical labels de-emphasized.

## Validation checklist
- 320px, common mobile, tablet, desktop.
- Add then remove the same selection from card and match detail.
- System count updates immediately.
- Empty/loading/error states explain what happened and what the user can do next.
- NO_BET does not expose a misleading actionable probability.
- Advanced information does not block the basic journey.
