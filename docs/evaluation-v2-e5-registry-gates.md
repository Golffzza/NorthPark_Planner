# E5 — Trusted Evidence Registry (candidate resolver)

This phase defines **record contracts and deterministic resolution only**, not a trusted data source. No park entrance was independently verified; no production score can be unlocked.

## Current implementation

`lib/evaluation-v2/trusted-evidence.ts` defines evidence types for entrance, visiting schedule, transport permission and last-mile linkage; source URL, reviewer, effective period and evidence status are required. The resolver fails closed on missing, duplicates/conflicts, invalid coordinates, expired, revoked, future/unreviewed or malformed evidence.

**Critical security boundary:** A TypeScript value labelled `origin: "SERVER_REVIEWED_REGISTRY"` can be fabricated by any caller. This field is a descriptive marker, **not proof of origin**. `resolveEvidence` is for server-controlled, internally supplied snapshots only. It MUST NOT be connected to public requests as an evidence authentication boundary. Do not allow API payloads to provide records, review fields, evidence IDs or origin. Tests use invented `example.org` records **only for calculations and rejection behavior**.

## Before enabling E5 to unlock scores

1. Create an actual server-owned, authorized and persistent review workflow. Fetch snapshot from server-owned DB/repository, never request JSON. Validate permissions on create, approve, revoke and modify; record immutable audit events and versioned changes. Determine valid source URLs and review standards.
2. Establish official or otherwise independently verifiable source of truth for each national-park **entrance**, its GPS coordinate, service dates/opening sessions, mode-specific permissions and applicable last-mile transfer.
3. Bind park/entrance IDs, reviewed evidence, provider destination coordinates and trip dates; detect spatial mismatch. Never promote park-center coordinates or fee tables to entrance/permission evidence.
4. Schedule resolution must account for the **previous service day** on overnight arrivals; selecting only arrival calendar date is insufficient. Resolve source conflicts and documented exceptional closures.
5. Record freshness/re-review policies; effective dates do not by themselves mean information was actively re-checked recently.
6. Use trusted entrance evidence for both E3.1 WP and E4 A1, avoiding duplicated or contradictory verification pathways. Keep unknown when source missing, stale, in conflict, not applicable without evidence, or provider does not support the travel mode.
7. Add authorized integration tests (forged caller claims, reviewer permissions, revocation, conflict, historical snapshot consistency, timezone, arrival mode, false N/A) and real-data verification. Preserve V1/Chatbot/Prisma/API contracts until migration design approved.

## Not done in E5 candidate

No Prisma migration, admin UI, review endpoints, production API integration, real-world park records, overall S, WP unlock, T/A production unlock, or verified closures. No deployment or main merge.
