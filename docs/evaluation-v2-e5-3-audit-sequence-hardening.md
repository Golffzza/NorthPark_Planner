# E5.3 Audit Sequence Hardening

Implementation: `lib/evaluation-v2/evidence-audit-sequence.ts` validates event transitions for each evidence revision before snapshot projection. `loadReviewedEvidenceSnapshot` now returns UNKNOWN if any revision has an impossible transition, even if that revision is superseded.

Transitions: initial -> SUBMITTED/APPROVED/REJECTED; SUBMITTED -> APPROVED/REJECTED; APPROVED -> REVOKED. Terminal REJECTED and REVOKED. Events before revision creation are rejected. Tests use synthetic examples only.

**Not sufficient for real approval:** A sequence of audit records only proves internal structural consistency. Current `ParkEvidenceRevision.payload.review` must still be redesigned so a server-authored, authenticated approval creates a canonically verifiable revision/decision. The existing write-side candidate appends Audit Events but does not author a canonical matching approved payload, so the full workflow is not functional yet. The read-side project has no guaranteed atomic two-query snapshot, and the database schema has not been migrated.

Do not auto-promote source URLs or metadata to VERIFIED. No real park source was reviewed, no API was enabled, and no WP/T/A or score S is unlocked.

Quality gate on user machine:
```powershell
git pull --ff-only origin review/chat-v2-conversation-flow
npx vitest run tests/unit/evaluation-v2/e5-audit-sequence.test.ts tests/unit/evaluation-v2/e5-evidence-data-contract.test.ts
npm run typecheck
npm test
```
