# E5.3 Hardening — transactional review candidate

Status: server-only Prisma transaction adapter is implemented but **NOT wired to API, deployment, or scoring**.

## Implemented
- `lib/evaluation-v2/prisma-evidence-review-store.ts` implements the existing E5.2 review store interface using Prisma interactive transactions at `Serializable` isolation.
- Authentication identity MUST be supplied from a verified server-side session by the eventual server wiring. Any caller-provided role/permission flag is overwritten with DB-derived role and park-scoped authority. A mismatched actor user ID is denied.
- Each transaction verifies the revision and park scope, queries DB authority and audit history, applies policy, and appends an audit event atomically. Concurrent serialization failures return a retry-required denial. Other failures fail closed.
- This adapter is deliberately not registered in any route, admin UI or public service.

## Important unresolved limitations (do not enable)
1. The current JSON `EvidenceReview` is immutable-looking metadata, but there is no approved, server-controlled **new revision** carrying matching `reviewedAt/reviewedBy/status` after approval. Simply appending an APPROVED audit event does NOT certify external evidence nor unlock E5 snapshot scores. Review workflow needs a canonical, server-authored decision record and projection reconciled with immutable revision semantics. Never trust caller JSON to set approval.
2. `ParkEvidenceAuthority` creation/revocation and provenance of administrator identity are not implemented; the adapter assumes existing server-curated authority rows. Roles must come from verified sessions, not HTTP request bodies.
3. Prisma `Serializable` can detect concurrent writes; database-backed tests must verify race behavior and duplicate decision prevention. No DB integration test was run here.
4. Evidence payload parsing uses casts and only partial runtime validation. Add full schema validation by kind, trusted source confirmation, freshness and cross-park/entrance checks.
5. No migration file or production database table exists until separately generated/reviewed and deployed. Prisma generate and validation are required after updating the schema.
6. Audit immutability is a database privilege and schema concern. Current application-layer code alone does not enforce it against arbitrary DB writers.
7. Inactive/superseded/revoked records require consistent read snapshots and verified projection across events, including historical evaluations.

## Local quality gate

Run after pull:
```powershell
npx prisma validate
npx prisma generate
npm run typecheck
npx vitest run tests/unit/evaluation-v2/e5-review-workflow.test.ts
npm test
npm run lint
```

Do NOT run migration against the production database yet. Do NOT expose review endpoints or make WP/T/A KNOWN based on this candidate store.
