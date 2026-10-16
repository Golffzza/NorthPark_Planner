# E5.3 write-side hardening checkpoint

Changes:
- `authorizeEvidenceReview` now rejects historical audit sequences that fail the shared E5 audit state machine before accepting another action.
- `createPrismaEvidenceReviewStore` refuses review of revisions with a superseding revision.
- Regression test added for malformed historical event sequences.

**Limit:** These are additional fail-closed checks. They do not establish a production-certified source, complete authenticated approval workflow, immutable event enforcement at the database, or race-tested transactions.

## PostgreSQL integration tests: prerequisite

Do not connect integration tests to development/production data. Create an isolated disposable PostgreSQL database, apply *reviewed* additive migration SQL there, seed clearly marked synthetic park/user/reviewer/revisions only, then test:
1. Admin reviewer with active park authority can approve once; no authority or regular user cannot.
2. Two simultaneous approvals against the same revision: at most one commits; losing transaction gets a conflict/retry-required outcome.
3. Approved followed by revoked does not resolve as valid evidence.
4. Superseded revision cannot be approved; park scope cannot be crossed.
5. Consistent snapshot reads revisions/audit in one PostgreSQL `RepeatableRead` transaction.
6. Validation of stale or fabricated review source payload and mutation attempts on audit events.

Do not treat unit tests of a pure policy as database integration tests. A real migration file, test database and transaction integration harness are **not** created in this checkpoint.

After pull:
```powershell
npx prisma validate
npx prisma generate
npm run typecheck
npx vitest run tests/unit/evaluation-v2/e5-review-workflow.test.ts
npm test
```

The SQL migration is still pending independent schema review. Evaluation V1 and Chatbot V2 remain untouched; WP/T/A and S are not unlocked.
