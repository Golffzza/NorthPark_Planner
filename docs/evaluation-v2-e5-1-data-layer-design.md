# E5.1 — Evidence Data Layer Design (not migrated)

Status: **candidate repository contract implemented, migration NOT applied**. Existing Prisma `Park.openTime/closeTime`, Park.latitude/longitude and TripEvaluation stay untouched and must not be treated as proof of actual hours/entrance.

## Proposed additive PostgreSQL entities (design only)

1. `ParkEntranceEvidence`: record/revision ID, parkId FK, entranceId stable key, latitude/longitude decimal, source reference, effectiveFrom/effectiveTo, review state, evidence version; immutable revision rows.
2. `ParkVisitingScheduleEvidence`: parkId FK, serviceDate, timezone, opening intervals as validated JSON or normalized child intervals, exceptional closed-day, source, review/effective windows, revision history. Include previous service day for overnight arrivals.
3. `ParkTransportPermissionEvidence`: parkId, entranceId, mode, allowed/restricted status, conditions, source, effective/review dates, immutable revisions.
4. `ParkLastMileEvidence`: parkId, entranceId, mode, applicability (required/not required), proof, stop/parking/transfer segment details and effective/review fields.
5. `ParkEvidenceAuditEvent`: eventId, evidenceRevisionId, reviewer user FK, action (submitted/approved/rejected/revoked), timestamp, note, previousRevision reference and actor attribution; append only.

No table above exists in the database today. Do not run `prisma migrate` based on this design alone.

## Authorization and review

- Viewer: may read only approved, effective evidence via a server-side repository; raw/draft approvals not exposed.
- Reviewer: authenticated admin with explicit evidence review permission, not merely a caller-provided `reviewedBy`; review actions append events, never overwrite history.
- Strong DB constraints and transactional reviewer writes: prevent duplicate live keys, enforce unique revision chains, park FK integrity and audit ownership; approval event and record revision must commit atomically. Preserve revocations and supersessions.
- Repository must produce a trusted snapshot from authenticated DB reads and validated audit events; client cannot choose origin/version or provide records.
- As implemented, `loadReviewedEvidenceSnapshot` checks the structural relationship between record revisions and audit. It **does not itself authenticate the repository**, check official-source claims or provide actual DB storage.
- Validate real-world evidence with a documented, manually auditable workflow before marking approved. A plausible HTTPS URL is not official verification.

## Integration order

1. Authorize additive schema review, migration plan, indices, authorization boundaries and rollback.
2. Implement server-only Prisma repository behind the current `EvidenceRepository` interface (no public mutation route initially), test with seeded **clearly marked fixtures** in an isolated test database.
3. Build admin review and audit workflow with real permission checks; source and park ID verification; expiration/revocation tests.
4. Resolve entrance and schedule evidence based on verified service day, exceptions and park IDs; share entrance with WP and A1.
5. Validate real northern national-park records, coordinate discrepancies, dates, supported travel modes, exceptional closures and completeness rates.
6. Add V2 persistence/consumer only after factoring UNKNOWN safely; preserve V1 history and API compatibility.

## Gates and limitations

- No new data has been authenticated or collected.
- `resolveEvidence` is a deterministic fixture-quality validator, not a stand-alone security boundary.
- No current trusted provider unlocks WP/T/A; S remains INCOMPLETE.
- Existing Chatbot V2 typecheck errors are outside E5.1 and must remain isolated.
- Unit tests can verify transformations, not permissions or production data accuracy. Full TS checks and regression must run in repository after checkout.
