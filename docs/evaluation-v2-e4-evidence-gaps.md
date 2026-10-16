# E4 Candidate — trusted-evidence gap and integration boundary

Status: **candidate modules only**. No new database tables, production endpoints, UI, or migration. E4 does not calculate overall S.

## Implemented

- `duration-scoring.ts`: D = 100 × clamp(1 - providerMinutes/600, 0, 1). Only CAR + OSRM driving route; uses route **summary** duration and does not depend on segment annotation/weather. 600 minutes is an experimental threshold.
- `time-scoring.ts`: pure fixture calculator uses the existing timezone-aware `resolveVisitSchedule` utility, multiple intervals, overnight service date, verified closed day, waiting and after-hours advisories. **Public candidate gateway `scoreTimeV2` always returns UNKNOWN** until a trustworthy registry is implemented.
- `accessibility-scoring.ts`: A1 entrance, A2 mode permission, A3 applicable last-mile check; fixture calculator implements the experimental formula when check evidence is complete. **Public candidate gateway `scoreAccessibilityV2` always returns UNKNOWN** until authoritative evidence is implemented. No routing success or park fees are treated as access proof.

Fixture calculators are exported for deterministic arithmetic tests only. They are **not** evidence authentication or safe endpoints to invoke with user-provided schedules/checks. Consumers must not expose fixture calculators as production evaluation routes.

## Trusted evidence needed before scoring T/A/WP

1. Park entrance registry: park ID, entrance ID, entrance coordinates (not park center), official source URL/document, collected/effective/reviewed timestamps, reviewer and review state, evidence version, conflict history.
2. Visiting-hours registry: entrance/park, service date and weekday/season rules, exceptional closures, each open interval, timezone, effective range, official source, last review. Unknown/stale/conflicting -> UNKNOWN, confirmed closed-day -> 0.
3. Mode permission registry: park/entrance, mode, constraints by date/time and vehicle class, document/URL, effective dates, review history. Fee tables alone are insufficient.
4. Last-mile registry: confirmed applicable vs inapplicable (with proof), stop/parking/transfer and destination linkage, schedules/restrictions, verified evidence.
5. Source-of-truth boundary: DB-managed, server-reviewed records only. Never promote `sourceId`, `verifiedAt`, `reviewStatus: VERIFIED` or `NOT_APPLICABLE` supplied by an API caller into trusted evidence.
6. The E3.1 destination WP currently remains UNKNOWN; its trusted entrance verification should ultimately consume the **same vetted entrance registry** as A1, not a parallel caller-controlled mechanism.

## Validation and integration gates

- Test representative northern-Thai parks and resolve known coordinate inconsistencies before marking entrances verified.
- Test expiration, conflicts, exceptional closures, cross-day openings, unsupported transport and evidence revocation.
- D cutoff/weights and A checks are candidate assumptions pending expert review and sensitivity analysis.
- Integrate a trusted registry only after reviewing its schema, authorization, auditable review workflow and backward compatibility.
- Preserve V1 history/manual scores and chatbot behavior. Keep E4 unmounted from production until the above gates pass.

Current state: no trustworthy entrance/hour/permission registry is connected. Therefore T/A and destination WP cannot legitimately unlock an overall V2 result in live use.
