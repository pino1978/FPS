# ADR-0008 — MVP implementation boundary

**Status:** Accepted

## Problem
Deliver a runnable vertical slice without weakening SRS MUST requirements or pretending unavailable free data exists.

## Decision
Implement the approved Next.js + NestJS/Fastify + PostgreSQL architecture as a monorepo. The initial quantitative engine is a deterministic Poisson bootstrap fed only by provider-derived standings metrics. Missing advanced data reduces Data Quality/Confidence or yields `NO_BET`. API-Football and football-data.org remain behind adapters; football-data.org supplies the first live fixture/standings path because its free quota is suitable for core ingestion. API-Football remains the enrichment adapter for capabilities validated by the free tier.

System generation is deterministic and blocks `INCOMPATIBLE` pairs before combinations are created. Correlation remains a distinct later scoring layer and is never treated as logical incompatibility.

Persistence uses PostgreSQL/Prisma for real/paper history and audit. Settlement eligibility is idempotent-by-design: verified rows are excluded from normal processing. Full market settlement rules remain versioned work; no unsupported market is silently settled.

## Consequences
The application is runnable end-to-end for core fixtures, bootstrap predictions, systems and history. Advanced player markets, injury-weighting, odds/value and automatic settlement become active only after free-source capability validation; until then they remain explicitly `UNAVAILABLE`/`NO_BET`, preserving SRS semantics.
