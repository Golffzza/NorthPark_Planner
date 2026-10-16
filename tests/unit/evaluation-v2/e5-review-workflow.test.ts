import { describe, expect, it } from "vitest";
import { authorizeEvidenceReview, submitEvidenceReview, type ReviewActor } from
  "@/lib/evaluation-v2/evidence-review-workflow";
import type { EvidenceRevision, EvidenceAuditEvent } from "@/lib/evaluation-v2/evidence-data-contract";

const at = new Date("2026-10-17T10:00:00Z");
const admin: ReviewActor = { userId: "admin-1", role: "ADMIN", canReviewParkEvidence: true };
const revision: EvidenceRevision = {
  revisionId: "r1", parkId: "park-1", recordedAt: new Date("2026-10-16T00:00:00Z"),
  supersedesRevisionId: null,
  evidence: { kind: "ENTRANCE", parkId: "park-1", entranceId: "e1",
    latitude: 18, longitude: 98, review: { evidenceId: "evid1", sourceId: "test",
      sourceUrl: "https://example.org", reviewedBy: "admin-1", reviewedAt: at,
      effectiveFrom: new Date("2026-10-16T00:00:00Z"),
      effectiveTo: new Date("2026-11-16T00:00:00Z"), status: "APPROVED" } },
};
const cmd = (action: "APPROVED" | "REJECTED" | "REVOKED", actor = admin) =>
  ({ action, actor, revisionId: "r1", occurredAt: at, note: "test only" });
const event = (action: EvidenceAuditEvent["action"]): EvidenceAuditEvent =>
  ({ eventId: "ev1", revisionId: "r1", actorUserId: "admin-1",
    action, occurredAt: at, note: "test only" });

describe("E5.2 review policy", () => {
  it("rejects user and unprivileged admin regardless of caller claims", () => {
    expect(authorizeEvidenceReview(cmd("APPROVED",
      { userId: "u", role: "USER", canReviewParkEvidence: true }), revision, []))
      .toMatchObject({ status: "DENIED", reason: "REVIEWER_UNAUTHORIZED" });
    expect(authorizeEvidenceReview(cmd("APPROVED",
      { ...admin, canReviewParkEvidence: false }), revision, []))
      .toMatchObject({ status: "DENIED", reason: "REVIEWER_UNAUTHORIZED" });
  });
  it("requires current revision, time and note", () => {
    expect(authorizeEvidenceReview(cmd("APPROVED"), null, []).status).toBe("DENIED");
    expect(authorizeEvidenceReview({ ...cmd("APPROVED"), note: "" }, revision, []).status).toBe("DENIED");
    expect(authorizeEvidenceReview({ ...cmd("APPROVED"),
      occurredAt: new Date("2026-10-15T00:00:00Z") }, revision, []).status).toBe("DENIED");
  });
  it("only permits permitted state transitions", () => {
    expect(authorizeEvidenceReview(cmd("APPROVED"), revision, [])).toMatchObject({ status: "ACCEPTED" });
    expect(authorizeEvidenceReview(cmd("REVOKED"), revision, [])).toMatchObject({
      status: "DENIED", reason: "NOT_APPROVED" });
    expect(authorizeEvidenceReview(cmd("APPROVED"), revision, [event("APPROVED")]).status).toBe("DENIED");
    expect(authorizeEvidenceReview(cmd("REVOKED"), revision, [event("APPROVED")]).status).toBe("ACCEPTED");
    expect(authorizeEvidenceReview(cmd("APPROVED"), revision, [event("REVOKED")]).status).toBe("DENIED");
  });
  it("passes policy validation to store transaction rather than writing directly", async () => {
    const result = await submitEvidenceReview({
      store: { transactionReview: async ({command,validate}) =>
        validate(revision, [event("APPROVED")]) },
      ...cmd("REVOKED") });
    expect(result.status).toBe("ACCEPTED");
  });
});
