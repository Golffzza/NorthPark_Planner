# E5.3 — Additive Prisma evidence schema and read repository

Status: **candidate code committed; no database migration, no live evidence approval, and no production use**.

## Files

- `prisma/schema.prisma`: additive `ParkEvidenceRevision`, `ParkEvidenceAuditEvent`, `ParkEvidenceAuthority`, and evidence enums. Existing `Park`, `User` receive back-relations only; `TripEvaluation` and V1 fields unchanged.
- `lib/evaluation-v2/prisma-evidence-repository.ts`: server-only read adapter for E5.1 `EvidenceRepository`. Runtime validates payload kind and park identity and hydrates review timestamps.

## Required validation before generating or applying a migration

1. Pull to a clean branch and run `npx prisma format --check` (or `npx prisma format` in a temporary copy), `npx prisma validate`, `npx prisma generate`, `npm run typecheck`, `npm test`, and `npm run lint`. Generated Prisma Client needs to reflect new models.
2. Review migration SQL in a disposable development database and confirm it changes ONLY additive evidence-related relations and enums. Back up the main DB. Do not run `prisma migrate dev` against production.
3. E5.3 does NOT provide a transactional write adapter. `evidence-review-workflow.ts` is still policy-only. Do not expose create/approve/revoke API or seed approved records yet.
4. Database review authority MUST be fetched from an authenticated server session + DB, never supplied as `ReviewActor` by a client. Enforce authorization and concurrency with transactions and serializable/retry or row-level locks.
5. PostgreSQL/Prisma relations alone do not guarantee immutable events, revision payloads, a unique active natural key, or reviewer legitimacy. Add DB permissions/constraints and concurrency tests before review workflow goes live.
6. Timestamped review in JSON is NOT external-world source validation. The E5.1 snapshot resolver is only a structural validator. Until approved real park/entrance/hours/mode evidence is curated, WP/T/A remain UNKNOWN.

## Known design limitations to address next

- Read adapter has no write path. An approved audit event must be bound to a server-owned review decision and cannot merely agree with arbitrary JSON review metadata.
- `ParkEvidenceAuthority` has effective windows but its granting/revocation and identity assurance are not yet implemented.
- `ParkEvidenceRevision.payload` is JSON for candidate design; strong kind-specific runtime schema validation, immutable revision policy, natural-key conflict detection and integrity constraints still needed.
- Read-side `loadRevisions` and `loadAuditEvents` are two queries; a consistent transactional snapshot should be introduced before real scoring.
- No fixtures in tests represent officially verified Thai park evidence.

No Prisma migration has been created or executed by this session; no existing data was changed.
