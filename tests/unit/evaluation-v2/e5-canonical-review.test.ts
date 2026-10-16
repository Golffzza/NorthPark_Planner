import { describe, expect, it } from "vitest";
import { loadReviewedEvidenceSnapshot, type EvidenceRevision, type EvidenceAuditEvent } from "@/lib/evaluation-v2/evidence-data-contract";

const approvedAt = new Date("2026-10-03T00:00:00Z");
const record: EvidenceRevision = {
  revisionId: "rev", parkId: "p", recordedAt: new Date("2026-10-01T00:00:00Z"), supersedesRevisionId: null,
  evidence: { kind: "ENTRANCE", parkId: "p", entranceId: "gate", latitude: 18, longitude: 98,
    review: { evidenceId: "test", sourceId: "fixture", sourceUrl: "https://example.org",
      reviewedBy: "untrusted-value", reviewedAt: new Date("2026-10-02T00:00:00Z"),
      effectiveFrom: new Date("2026-10-01T00:00:00Z"), effectiveTo: new Date("2026-11-01T00:00:00Z"),
      status: "PENDING" } },
};
const approval: EvidenceAuditEvent = {
  eventId: "evt", revisionId: "rev", actorUserId: "actual-reviewer", action: "APPROVED",
  occurredAt: approvedAt, note: "test",
};
const evaluate = (events: EvidenceAuditEvent[]) =>
  loadReviewedEvidenceSnapshot({ parkId: "p", evaluatedAt: new Date("2026-10-10T00:00:00Z"),
    registryVersion: "FIXTURE", repository: {
      loadRevisions: async () => [record], loadAuditEvents: async () => events,
    } });

describe("E5.3 canonical review projection", () => {
  it("takes reviewer, timestamp and approval state from audit rather than payload", async () => {
    const result = await evaluate([approval]);
    expect(result.status).toBe("READY");
    if (result.status === "READY") {
      expect(result.snapshot.records[0].review).toMatchObject({
        status: "APPROVED", reviewedBy: "actual-reviewer", reviewedAt: approvedAt,
      });
    }
  });
  it("does not accept a pending record without an approval audit", async () => {
    const result = await evaluate([]);
    expect(result.status).toBe("READY");
    if (result.status === "READY") expect(result.snapshot.records).toHaveLength(0);
  });
  it("does not include records after revocation", async () => {
    const result = await evaluate([approval, { ...approval, eventId: "revocation",
      action: "REVOKED", occurredAt: new Date("2026-10-04T00:00:00Z") }]);
    expect(result.status).toBe("READY");
    if (result.status === "READY") expect(result.snapshot.records).toHaveLength(0);
  });
});
