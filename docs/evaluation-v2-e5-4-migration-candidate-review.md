# E5.4 — Candidate SQL review before isolated test apply

Migration file: `prisma/migrations/20261017050000_e5_registry_candidate/migration.sql`.

This SQL was **manually drafted** from the E5 Prisma models and prior migration conventions, and has NOT been diff-verified or executed. It creates only two enum types, three new tables, their indexes and foreign keys referencing pre-existing User/Park tables. It is not a release-approved migration. In particular, it does not enforce append-only audit immutability or guarantee trust of submitted park evidence.

The previous 11 migrations, including `20260913120000_add_assistant_knowledge` which installs pgvector, MUST be present and compatible in the disposable database before E5 application. Docker image `pgvector/pgvector:pg16` supports that extension. The test DB will be destroyed when its tmpfs-backed container is recreated.

Safe steps:
1. `git pull --ff-only origin review/chat-v2-conversation-flow`
2. `npx vitest run tests/unit/evaluation-v2/e5-migration-safety.test.ts`; `npx prisma validate`; `npm run typecheck`.
3. Manually inspect the new SQL: check allowed table names, enums, foreign keys and prior migration compatibility. Compare to Prisma-generated `migrate diff` output in a scratch environment, and check any drift or migration errors before applying.
4. Only after explicit review, set `DATABASE_URL` to `postgresql://e5_fixture:e5_local_fixture_only@127.0.0.1:55439/northpark_e5_test` for the CURRENT PowerShell process, and verify the target manually. **Do not use your production/development DATABASE_URL**.
5. With target verified and isolated database only, run `npx prisma migrate deploy` to apply the 11 historical migrations and the new candidate SQL in order. If any failure occurs, stop and report the exact error. This is not an authorization to migrate your primary database.
6. Verify `npx prisma migrate status` and run opt-in PostgreSQL integration tests by setting `E5_TEST_DATABASE_URL` to the same local fixture URL and `RUN_E5_PG_INTEGRATION=1`.

Never issue `docker compose --remove-orphans` or `prisma migrate reset` against your project setup. Restore the previous DATABASE_URL after test operations.

**Status:** no migration has been applied by the assistant; no PostgreSQL integration tests have run in this step. A passing static SQL safety test does NOT replace a real Prisma diff or DB schema review. V1 and Chatbot V2 unchanged.
