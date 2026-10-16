# E5.4 — Local isolated PostgreSQL setup

This adds a disposable **local-only** Postgres 16+pgvector instance. Container port 5432 is mapped ONLY to 127.0.0.1:55439; the database name is `northpark_e5_test`. It uses a known fixture-only username/password and must never be exposed to a network or reused for deployment. PostgreSQL stores its database on tmpfs, so stopping/recreating the container **loses all test data** by design.

### Step 1: start disposable database

Requires Docker Desktop + Compose available on Windows.

```powershell
git pull --ff-only origin review/chat-v2-conversation-flow
./scripts/evaluation-v2/e5-start-local-postgres.ps1
```

The script starts Docker and runs Prisma schema validation and migration status on the isolated DB. It does NOT apply a migration and does NOT run integration tests. A warning about missing/unapplied migrations on an empty database is expected.

### Step 2: review and apply test-only migration

**IMPORTANT:** Existing migrations, PostgreSQL extensions, Prisma history and the additive E5 models must be reviewed first. Never run `migrate dev`, `db push` or `migrate reset` against the main database. The assistant has NOT generated migration SQL from the actual checked-out repository yet.

In a PowerShell terminal, with an explicitly verified temporary local target, manually set:

```powershell
$env:DATABASE_URL = "postgresql://e5_fixture:e5_local_fixture_only@127.0.0.1:55439/northpark_e5_test"
npx prisma migrate status
```

Do not apply migrations until their SQL is inspected and any pgvector prerequisites checked. For this setup, compare the migration history against the existing test DB and produce/review the E5 additive migration in a scratch environment. A fresh DB has no tables, so Prisma integration tests cannot run until the historical migrations and new E5 migration are applied safely.

### Step 3: only after test migration is approved and applied

```powershell
$env:E5_TEST_DATABASE_URL = "postgresql://e5_fixture:e5_local_fixture_only@127.0.0.1:55439/northpark_e5_test"
$env:RUN_E5_PG_INTEGRATION = "1"
npx vitest run tests/integration/evaluation-v2/e5-postgres.integration.test.ts
Remove-Item Env:RUN_E5_PG_INTEGRATION
Remove-Item Env:E5_TEST_DATABASE_URL
Remove-Item Env:DATABASE_URL
```

Only remove DATABASE_URL if it was specifically set for the disposable DB in the current shell; otherwise restore its previous value. To stop the test database: `docker compose -f docker-compose.e5-test.yml down`.

### Remaining gates

Tests have not been executed against this container by the assistant. SQL migration review, actual integration results, immutable audit restrictions, server-side evidence authorization lifecycle and verified park data are still pending. WP/T/A still UNKNOWN; no V1 or Chatbot V2 changes.
