# E5.4 — safe isolated database preflight

New script: `scripts/evaluation-v2/e5-migration-preflight.ps1`.

This script **does not apply migrations, create tables, create users, seed test data, or generate SQL**. It checks the target hostname, credentials, `_e5_test` database naming convention, and refuses a connection matching the current `DATABASE_URL`. It temporarily sets `DATABASE_URL` only within the PowerShell process while running `prisma validate` and `prisma migrate status`, then restores the previous value.

## Run only after manually creating a disposable database

```powershell
$env:E5_TEST_DATABASE_URL = "postgresql://test_user:REDACTED@localhost:5432/northpark_e5_test"
./scripts/evaluation-v2/e5-migration-preflight.ps1 -ConfirmDisposableDatabase
```

Check that the hostname and database are truly disposable, and that test credentials cannot reach production. Prisma migration status may fail against an empty database with no migration history; if it does, inspect the output manually and do not proceed automatically.

After this preflight, **separately** review an additive migration generated from the repo's existing Prisma migration history against a disposable DB. Never issue `prisma db push`, `migrate reset`, or `migrate dev` against production. Do not commit a hand-written production migration before comparing against Prisma's generated SQL and verifying any existing PostgreSQL extensions.

Once the migration has been independently reviewed and applied to a disposable DB, enable the existing opt-in test:
```powershell
$env:RUN_E5_PG_INTEGRATION = "1"
npx vitest run tests/integration/evaluation-v2/e5-postgres.integration.test.ts
Remove-Item Env:RUN_E5_PG_INTEGRATION
Remove-Item Env:E5_TEST_DATABASE_URL
```

**Pending release gates:** inspected SQL migration, actual PostgreSQL integration results (including concurrent approvals), reviewer authority administration, DB-level audit immutability, actual source curation, real-world data accuracy and score-consumer integration. V1 and Chatbot V2 unchanged.
