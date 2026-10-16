# E5.3 — Consistent Evidence Snapshot Gate

The E5.1 repository interface now optionally supports `loadConsistentSnapshot(parkId)`. The snapshot projector prefers this single call and fails closed on failure; it does **not** fall back to independent reads if this call throws.

`createPrismaConsistentEvidenceRepository` in `lib/evaluation-v2/prisma-evidence-repository.ts` reads both revisions and audit events within the same PostgreSQL `RepeatableRead` transaction. This prevents reading a revision and its audit state at different committed points in time. The older `createPrismaEvidenceRepository` two-call interface remains only for backwards-compatible candidate fixtures and non-production unit tests.

**Still pending:** Schema migration review, source authentication, server-controlled proposal creation, permissioned review lifecycle, immutable audit enforcement, concurrency tests against a real PostgreSQL instance, end-to-end verification and safely enabling E3/E4. No actual park entrance, opening hours or mode restriction has been approved. No score factor is unlocked.

After pull:
```powershell
npx prisma generate
npm run typecheck
npx vitest run tests/unit/evaluation-v2/e5-consistent-snapshot.test.ts
npm test
```

Do not run migrations against the primary database or enable public review APIs yet.
