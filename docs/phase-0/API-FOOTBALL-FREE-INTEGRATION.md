# API-Football Free — Integration Contract

**Base URL:** `https://v3.football.api-sports.io`  
**Credential:** server-side environment variable `API_FOOTBALL_KEY`  
**Budget:** free-tier request budget must be enforced by the adapter and scheduler.

## Authentication
Requests use the provider-required API key header. The key must never be logged, returned to clients or persisted in source-controlled files.

## MVP capabilities to validate
- Leagues/seasons
- Fixtures and fixture status
- Standings
- Teams
- Team statistics
- Players and player statistics
- Lineups
- Injuries/availability when exposed by the free plan
- Match events
- Odds when exposed by the free plan

A capability is enabled only after measured validation. Missing coverage maps to `UNSUPPORTED_CAPABILITY` or `UNAVAILABLE`, never to invented values.

## Request-budget policy
1. Cache normalized responses and raw payload references.
2. Never fetch the same immutable historical object repeatedly.
3. Prioritize current/future fixtures and unsettled past fixtures.
4. Do not poll completed, `FINAL_VERIFIED` fixtures unless an administrative force refresh is requested.
5. Track daily requests and reserve headroom for settlement.
6. Backtesting must prefer persisted/open historical datasets rather than consuming live free-tier calls.

## Settlement eligibility
The scheduler may inspect only fixtures whose event time is before the current time plus the configured completion margin and whose verification state is not final. A previously verified event is not reprocessed in normal operation.

## Security checklist
- `.env*` ignored except `.env.example`.
- Real key stored in local secret/environment or CI secret store.
- Authorization headers redacted in logs/traces.
- Provider payload logging excludes request headers.
- Integration tests fail closed when no secret exists.

## Live validation gate
The following evidence is required before the provider portion of Gate 0 is closed:
- successful authenticated request;
- observed rate-limit headers/behaviour;
- Serie A league/season identification;
- sample current/future fixture;
- sample completed fixture and result;
- standings coverage;
- team/player data sample;
- lineup, injury and odds capability outcome documented as AVAILABLE or UNAVAILABLE;
- raw payload mapped through provider-neutral DTOs without exposing provider IDs as domain identity.

No paid upgrade is permitted to satisfy a failed capability. The application must degrade gracefully or use an approved free/open complementary source.
