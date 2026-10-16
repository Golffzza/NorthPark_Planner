# E5.4 — isolated PostgreSQL integration gate

**Current status:** candidate guard and opt-in PostgreSQL integration test committed; **no migration SQL has been generated/reviewed or applied**. This repository currently has additive Prisma evidence models, not a verified deployed schema. No production API or score has changed.

## Test isolation is mandatory

`E5_TEST_DATABASE_URL` must identify a dedicated PostgreSQL database whose NAME ends in `_e5_test`, for example `northpark_e5_test`. The guard rejects missing, obviously non-test names, and a target matching `DATABASE_URL`. This check is a precaution, not a substitute for checking credentials, backup policy, network targets, database access and test-data destruction. **Never supply production credentials or connection details to the test variable.**

## Migration preparation (DO NOT run against the main DB)

1. Create a disposable PostgreSQL database with an isolated user and permissions. Set `DATABASE_URL` for your terminal session **only** to that disposable database while preparing it; verify the target manually. Use an explicit, private environment file outside Git.
2. First run `npx prisma validate` and `npx prisma generate`.
3. On that disposable database only, use `npx prisma migrate dev --create-only --name e5_registry_candidate` to generate SQL without applying a newly created migration. Inspect the generated SQL. Compare to the previous schema and existing migration history; flag destructive SQL, all changes to V1 tables and enum incompatibilities. In Prisma 7 the datasource URL comes from `prisma.config.ts`.
4. Review the SQL and table constraints, especially immutable audit/revision rows, PK/FK, revision chains and unique active evidence keys. Only after sign-off, apply migrations to the **disposable test database** via the team's standard safe migration procedure.
5. Re-generate Prisma Client and run the opt-in test with `RUN_E5_PG_INTEGRATION=1` and `E5_TEST_DATABASE_URL` pointed exclusively to the prepared disposable database. The test inserts and deletes synthetic data in that database.
6. Keep the tests skipped in default `npm test`, and do not use them for production health checks.

Example PowerShell after verifying both URLs and applying the reviewed migration to the isolated test DB:

```powershell
$env:E5_TEST_DATABASE_URL = "postgresql://test_user:REDACTED@localhost:5432/northpark_e5_test"
$env:RUN_E5_PG_INTEGRATION = "1"
npx vitest run tests/integration/evaluation-v2/e5-postgres.integration.test.ts
Remove-Item Env:RUN_E5_PG_INTEGRATION
Remove-Item Env:E5_TEST_DATABASE_URL
```

## Test scope / remaining work

The opt-in test verifies the Prisma review-store path, persisted APPROVED and REVOKED decisions, and transactionally consistent read snapshot using synthetic fixtures. It does not independently verify a real national-park source. It also does not test a true two-writer race yet: add parallel approvals and PostgreSQL concurrency assertions after confirming transaction policy and serializable retries against the isolated test DB. Do not infer production readiness from unit tests alone.

**Known limitations:** server-supplied review metadata still needs source curation; audit immutability is not DB-enforced; authority granting is not wired to authenticated sessions; revision payload runtime validation is incomplete; no reviewed evidence source available. Keep WP/T/A UNKNOWN and S INCOMPLETE. V1 and Chatbot V2 must remain untouched.
