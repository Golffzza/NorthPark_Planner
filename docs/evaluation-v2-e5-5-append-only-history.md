# E5.5 — Append-only evidence history (candidate)

New migration: `prisma/migrations/20261017053000_e5_history_immutability/migration.sql`. This is **separate from** the already-applied E5.4 schema migration. It creates one PostgreSQL trigger function and four triggers to reject UPDATE, DELETE, and TRUNCATE on `ParkEvidenceAuditEvent` and `ParkEvidenceRevision`. Corrections must use a newly recorded revision or append REVOKED as an audit event. It does not alter V1 or Chatbot schemas.

The integration suite now checks update/delete/truncate rejection and retains its synthetic history rather than deleting audit or revision rows. Since this is a disposable tmpfs-backed PostgreSQL container, fixture history is cleared by **recreating that isolated container only**; do not remove the application's existing database container. Existing integration tests remain opt-in and use new unique fixture identifiers.

**Important limitations:** A database owner/superuser can disable/drop triggers or change rows; use restricted runtime credentials before any production release. These triggers also block test teardown; leave test-only rows in the disposable database. Authority grants are still mutable; review role lifecycle, trusted source curation, data structure validation, and production authentication are pending.

## Test locally (isolated DB only)

1. Pull branch; run `npm run typecheck` and `npm test`. The PostgreSQL suite stays skipped by default.
2. Check that `prisma.e5-diff.config.ts` still targets `127.0.0.1:55439/northpark_e5_test` and the shadow host uses `127.0.0.1:55440/northpark_e5_shadow_test`.
3. Run `./scripts/evaluation-v2/e5-check-migration-diff.ps1` to verify schema parity (Prisma schema diffs do not validate trigger behavior).
4. Review E5.5 SQL; only after confirming the **disposable fixture database**, run `npx prisma migrate deploy --config prisma.e5-diff.config.ts`. Confirm `npx prisma migrate status --config prisma.e5-diff.config.ts`.
5. Set `E5_TEST_DATABASE_URL` to the disposable URL, `RUN_E5_PG_INTEGRATION=1`, and run `npx vitest run tests/integration/evaluation-v2/e5-postgres.integration.test.ts`. Remove env vars afterwards.

No migrations or PostgreSQL tests were run by the assistant. The result of the new immutable-history test must be confirmed on your isolated DB before E5.5 can pass. Never use `--remove-orphans`.
