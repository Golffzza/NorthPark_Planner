# E5.4 — migration history/schema drift gate

This checkpoint adds a *separate* disposable PostgreSQL 16 + pgvector shadow container at localhost:55440 named `northpark_e5_shadow_test`. The primary E5 fixture DB is still localhost:55439. Neither is the application database.

Run:
```powershell
git pull --ff-only origin review/chat-v2-conversation-flow
./scripts/evaluation-v2/e5-check-migration-diff.ps1
```

The script starts the disposable **shadow** PostgreSQL container, then asks Prisma to compare `prisma/migrations` with `prisma/schema.prisma` using `prisma migrate diff --from-migrations ... --to-schema ... --shadow-database-url ... --exit-code`. Exit 0 = no schema drift; exit 2 = drift; other exit = tool/error. It does **not** apply migrations to the fixture DB at port 55439. Do not use the shadow database for application connections or real data.

This is a migration-schema consistency check, not a full audit of the hand-written SQL or production readiness. Existing migrations must replay cleanly in shadow DB (including pgvector), and the connector must have required privileges.

After a clean diff, separately inspect the E5 SQL, then apply to the already-isolated fixture database only after review. PostgreSQL integration tests are the next gate. Never use `--remove-orphans` or target your original project DB.

No migration has been applied and no integration tests have been executed by the assistant in this checkpoint.
