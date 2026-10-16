# E5.3 canonical approval projection — candidate

The read-side projector now derives review status, reviewer identity, and review timestamp from the most recent valid APPROVED audit event, not from the proposal payload's review labels. If a revision has no approval event or has been revoked, it is not projected as approved. Invalid audit transition sequences fail closed.

Tests cover payload review fields that disagree with the audit event, absence of approval, and revocation.

**Important trust boundary:** This is a consistency improvement, NOT an authorization proof. The audit store is not yet tied to a fully implemented server-controlled proposal/review revision lifecycle, and no authenticated external source review has been verified. The reviewer identity written into an audit event is reliable only if the write-side transaction is permissioned correctly and the database cannot be modified directly by an untrusted actor. The read-side repository still needs an atomic consistent snapshot for all revisions and events.

Current `EvidenceReview` source/effective-date metadata is still supplied with stored evidence and must be checked/curated server-side. The projection cannot prove an HTTPS source belongs to a Thai national-park authority.

No migration applied, no official data imported, no production API enabled, no WP/T/A unblocked, and no V1/Chatbot modifications.

After pulling:
```powershell
npx vitest run tests/unit/evaluation-v2/e5-evidence-data-contract.test.ts tests/unit/evaluation-v2/e5-canonical-review.test.ts tests/unit/evaluation-v2/e5-audit-sequence.test.ts
npm run typecheck
npm test
```
