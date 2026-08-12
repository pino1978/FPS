# ADR-0007 — Free/Open Data Only

**Status:** Accepted  
**Date:** 2026-08-12

## Problem
The project must operate without paid APIs, paid SaaS data products, or recurring data subscriptions.

## Alternatives considered
1. Sportmonks paid plan/add-ons.
2. API-Football free tier as primary operational provider.
3. football-data.org free tier as complementary provider.
4. StatsBomb Open Data and other open datasets for research/backtesting where licensing permits.

## Decision
Use only zero-cost or open-data sources for the project baseline. API-Football Free is the primary operational provider. football-data.org Free is a complementary core-data source. StatsBomb Open Data may be used for research/backtesting when coverage and licence permit.

The application domain MUST remain provider-independent through adapters. Paid provider code paths are not introduced unless this ADR is explicitly superseded.

## Consequences
- Missing advanced data is represented as unavailable; it is never fabricated or silently imputed.
- Data Quality and Confidence must decrease when required inputs are stale, incomplete or unavailable.
- `NO_BET` remains a valid result.
- Market capabilities are runtime-gated by both predictive inputs and settlement data availability.
- Rate limits are treated as a first-class engineering constraint; ingestion uses caching, deduplication and request budgets.
- Value calculations require valid odds. If free odds are unavailable/stale, Value is `UNAVAILABLE` rather than zero.

## Security
Provider keys/tokens are server-side secrets only. They must never be committed. Local development uses environment variables; CI/deployment uses secret stores.
