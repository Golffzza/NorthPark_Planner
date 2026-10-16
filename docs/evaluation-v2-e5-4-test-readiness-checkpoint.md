# E5.4 checkpoint — prepared for isolated database verification

Last changes:
- The isolated PowerShell preflight reports `prisma migrate status` problems as warnings after successful schema validation, because an empty disposable test DB is expected to have unapplied migrations. A warning is **not permission to apply migrations without review**.
- The opt-in PostgreSQL test also disables the park-scoped `ParkEvidenceAuthority` of a DB admin and checks that approval is rejected. Authority is restored in a `finally` block.
- Existing tests cover competing approvals, forged request actor flags, approve → consistent read → revoke.

**Nothing has been executed against an actual PostgreSQL test database in this checkpoint.** No SQL migration has been generated, applied or reviewed here. The Prisma client and TypeScript have not been validated by the assistant in a local checkout.

Operator steps, **only after independently creating a disposable database** and verifying test credentials:
1. Pull the branch and run `npx prisma validate`, `npx prisma generate`, `npm run typecheck` and `npm test`.
2. Populate `E5_TEST_DATABASE_URL` to a DB ending in `_e5_test`. Run `./scripts/evaluation-v2/e5-migration-preflight.ps1 -ConfirmDisposableDatabase`.
3. Independently generate and review migration SQL; DO NOT run `migrate dev` or `db push` on your primary DB. Test the reviewed SQL on the disposable DB and back up as needed.
4. Only after migrations exist on the disposable DB, run `RUN_E5_PG_INTEGRATION=1 npx vitest run tests/integration/evaluation-v2/e5-postgres.integration.test.ts` (PowerShell: set env variable on a separate line). Remove test env vars afterwards.
5. Inspect real DB results. If a race test fails, investigate PostgreSQL serialization behavior and constraints rather than loosening assertions.

Release blockers: no externally validated park records, database immutability constraints, authenticated authority grant/revoke workflow, comprehensive runtime payload checks, or V2 scoring integration. No WP/T/A unlocked.
