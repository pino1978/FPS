# ADR-0011 — Venue Strength, Availability Impact and Confidence

**Status:** Accepted  
**Date:** 2026-08-13

## Problem
US-0401 and US-0402 require the prediction model to use recent form, overall strength, home/away context, attack/defence and unavailable players, with configurable/versioned weights. FR-PRED-004 and FR-DQ-001/002 require missing or uncertain data to reduce Confidence/Data Quality rather than being silently replaced.

The previous Poisson implementation used total standings and recent form but did not explicitly use HOME/AWAY standings splits or an availability impact in expected goals.

## Alternatives considered
1. Keep total standings only and model home advantage with a constant multiplier.
2. Replace the model with an external xG/ML source.
3. Extend the existing deterministic Poisson model with versioned venue blending, Team Strength components and an availability loss derived only from real provider data.

## Decision
Adopt option 3 for MVP model version `poisson-strength-availability-v3`.

- football-data.org `TOTAL`, `HOME` and `AWAY` standing tables are normalized by the provider adapter.
- Expected goals blend total attack/defence rates with the appropriate venue split through configurable `venueBlend`.
- Team Strength exposes deterministic home/away scores from versioned weighted components: recent form, overall PPG, venue PPG, attack/defence and availability.
- Availability loss is calculated only for provider-reported unavailable players that can be matched to real player statistics. Player importance reuses the versioned Player Impact model; unmatched players do not receive invented impact values.
- Availability is enriched only close to kickoff and for a bounded number of fixtures to respect the free API request budget. Outside that window the availability input is explicitly `UNAVAILABLE`.
- Missing form, venue splits, injury verification or confirmed lineup reduce Data Quality and consequently Confidence. Missing inputs never increase Confidence.
- Official lineups may improve the quality factor relative to missing/unconfirmed lineup data.
- All effective model configuration is included in immutable prediction input snapshots.

## Configuration
`MODEL_CONFIG_VERSION = poisson-strength-availability-config-v3`.

Versioned parameters include:
- `homeAdvantage`;
- `formWeight`;
- `venueBlend`;
- `availabilityWeight`;
- lambda bounds;
- Team Strength component weights.

The availability lookup budget is operationally bounded by `PREDICTION_AVAILABILITY_FIXTURE_LIMIT` (default 8, hard cap 10).

## Consequences
### Positive
- Meets the home/away and availability requirements without provider lock-in.
- Keeps the model deterministic, explainable, testable and backtestable.
- Missing free-tier data is represented explicitly and degrades quality.
- API-Football usage remains bounded.

### Negative / limitations
- Availability impact is only as complete as the player mapping available from free sources.
- Historical availability can only be backtested when timestamp-correct snapshots exist; otherwise the feature is absent and Data Quality is reduced.
- Confirmed lineup data is usually available only near kickoff, so earlier predictions intentionally carry lower confidence.

## Testing
Regression tests verify that:
- venue splits change expected goals compared with total-only inputs;
- an availability loss lowers only the affected team's expected goals;
- Team Strength is deterministic and bounded;
- missing availability and venue data reduce Data Quality/Confidence.
