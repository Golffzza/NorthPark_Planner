# E5.2 — Persistence and Review Workflow: design gate

Status: **review policy and atomic persistence contract added**. No Prisma migration was applied and no real approval process is live.

## Current work

- `lib/evaluation-v2/evidence-review-workflow.ts`: pure role/action/state guards; a transaction adapter contract which must re-check authenticated roles, lock revision state, and append an immutable event. It is *not* a production authorization boundary until wired to verified server sessions and database transactions.
- `tests/unit/evaluation-v2/e5-review-workflow.test.ts`: policy, transition and adapter-contract tests.
- E5.1 `EvidenceRepository` still supplies read-side revision/event views for candidate resolution.

## Proposed additive schema — not applied

- `ParkEvidenceRevision`: id, parkId FK Park, kind (ENTRANCE, SCHEDULE, PERMISSION, LAST_MILE), stable natural entity key, evidence JSON validated against type-specific rules, supersedesId self-FK, recordedById FK User, recordedAt. Revision rows immutable.
- `ParkEvidenceAuditEvent`: id, revisionId FK, actorUserId FK User, action, occurredAt, note, immutable. Index revisionId+occurredAt+id.
- `ParkEvidenceReviewAuthority`: userId FK User, parkId FK Park or explicit scope, canReview, effective window, grantedById; alternatively implement equivalent server-only permission checks. `UserRole.ADMIN` alone is insufficient for evidence review.
- `ParkEvidenceRegistryVersion`: version/id, producedAt, input revision checksums, review policy version; snapshot references immutable active evidence IDs.

Prefer typed tables/columns over unvalidated JSON for coordinates/date/transport permissions if DBA and domain audit supports migration cost. Prohibit accidental cascade deletion of evidence and audit when a park/user is deleted; require restrict/retention policy.

## Security requirements before persistence implementation

1. Only server-authenticated actors may request review. Ignore actorUserId, role and canReviewParkEvidence from request body; derive roles from verified session + DB.
2. For write transaction: check permission for park, lock evidence revision, validate expected version, verify source document and factual claims via organizational review, perform action transition, append audit with DB-generated IDs, commit atomically.
3. Retain superseded/revoked revisions and audit events. Reject stale approval attempts, duplicate IDs, double approvals and conflicting active records.
4. Use DB constraints: FK Park/User, unique immutable revision IDs/event IDs, safe uniqueness for active natural key and no concurrent double-approved revisions; test with concurrent transactions.
5. The current `reviewedAt` and `status` in evidence JSON are structurally checked against approval events but cannot prove the external source or reviewer trust without DB authorization and review workflow.
6. Never allow client-supplied `origin: SERVER_REVIEWED_REGISTRY` to confer authority. Only a server-owned read-side adapter may generate the snapshot, and downstream resolvers remain fail-closed.
7. Revocation/expiry must invalidate score inputs on refresh; V1 history stays unchanged; no historical V2 overwrite.
8. A verified entrance registry is a prerequisite shared by WP and A1; verified visiting hours, mode permission, and last mile are prerequisites for T/A.

## Release gate

Pending: finalized Prisma migration approval, real server-side store, authorization integration, reviewed park data, database-backed integration/concurrency tests, E3/E4 integration and expert validation. Production remains V1; V2 still incomplete.
