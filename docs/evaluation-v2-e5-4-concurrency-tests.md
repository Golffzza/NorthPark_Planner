# E5.4 concurrency and authorization PostgreSQL test extension

This checkpoint extends the existing **opt-in** isolated database suite:
- Two simultaneous transactions attempt APPROVED on one new revision; exactly one may return ACCEPTED and exactly one approved audit event must persist.
- A USER supplies a forged ADMIN actor flag and a callback claiming approval; the server-side Prisma review store must reject because actual database role/park authority is absent, and no APPROVED event may be stored.
- The existing sequential approve -> consistent snapshot -> revoke test remains.

The tests are skipped by default and require an **already migrated, isolated PostgreSQL database** with test-only credentials. No migration is generated or executed here. The same fixture/test safety and cleanup rules in `docs/evaluation-v2-e5-4-postgres-gate.md` apply.

Run on a *disposable* database only, after reviewing schema and migration:
```powershell
$env:E5_TEST_DATABASE_URL = "postgresql://test_user:REDACTED@localhost:5432/northpark_e5_test"
$env:RUN_E5_PG_INTEGRATION = "1"
npx vitest run tests/integration/evaluation-v2/e5-postgres.integration.test.ts
Remove-Item Env:RUN_E5_PG_INTEGRATION
Remove-Item Env:E5_TEST_DATABASE_URL
```

**Caveat:** A one-off concurrency success is not proof against every race. The permission revocation policy, database-level audit immutability, multi-worker concurrency, and canonical reviewed-source verification still require separate work. Test failures may reveal whether serializable retries or database constraints need changes; do not weaken the assertions to get a green run.

No user-supplied source has been independently approved and no WP/T/A or S factors have been unlocked. V1 and Chatbot V2 remain unchanged.
