import { describe, expect, it } from "vitest";
import { validateEvidenceAuditSequence } from "@/lib/evaluation-v2/evidence-audit-sequence";
import { loadReviewedEvidenceSnapshot, type EvidenceRevision, type EvidenceAuditEvent } from "@/lib/evaluation-v2/evidence-data-contract";
const recordedAt = new Date("2026-10-01T00:00:00Z");
const t = (day: number) => new Date(`2026-10-${String(day).padStart(2, "0")}T00:00:00Z`);
const event = (action: EvidenceAuditEvent["action"], day: number): EvidenceAuditEvent =>
  ({ eventId: action + day, revisionId: "r1", actorUserId: "reviewer", action,
    occurredAt: t(day), note: "test" });
const revision: EvidenceRevision = {
  revisionId: "r1", parkId: "p1", recordedAt, supersedesRevisionId: null,
  evidence: { kind: "ENTRANCE", parkId: "p1", entranceId: "e1", latitude: 18, longitude: 99,
    review: { evidenceId: "evidence", sourceId: "test", sourceUrl: "https://example.org",
      reviewedBy: "reviewer", reviewedAt: t(3),
      effectiveFrom: t(1), effectiveTo: t(25), status: "APPROVED" } },
};
describe("E5.3 audit ordering hardening", () => {
  it("accepts permitted approval, rejection and revocation transitions", () => {
    for (const history of [
      [event("SUBMITTED", 2), event("APPROVED", 3)],
      [event("SUBMITTED", 2), event("REJECTED", 3)],
      [event("SUBMITTED", 2), event("APPROVED", 3), event("REVOKED", 4)],
      [event("APPROVED", 3)],
    ]) expect(validateEvidenceAuditSequence(recordedAt, history).status).toBe("VALID");
  });
  it("rejects impossible transitions", () => {
    for (const history of [
      [event("REVOKED", 3)],
      [event("APPROVED", 3), event("APPROVED", 4)],
      [event("APPROVED", 3), event("REJECTED", 4)],
      [event("SUBMITTED", 2), event("SUBMITTED", 3)],
      [event("REJECTED", 3), event("APPROVED", 4)],
      [event("APPROVED", 3), event("REVOKED", 4), event("APPROVED", 5)],
      [event("APPROVED", 0)],
    ]) expect(validateEvidenceAuditSequence(recordedAt, history).status).toBe("INVALID");
  });
  it("rejects an invalid sequence before publishing a snapshot", async () => {
    const result = await loadReviewedEvidenceSnapshot({
      repository: { loadRevisions: async () => [revision],
        loadAuditEvents: async () => [event("REVOKED", 3)] },
      parkId: "p1", evaluatedAt: t(10), registryVersion: "TEST_ONLY",
    });
    expect(result).toMatchObject({ status: "UNKNOWN",
      reasons: ["REGISTRY_INVALID_AUDIT_SEQUENCE"] });
  });
  it("never publishes revoked evidence", async () => {
    const result = await loadReviewedEvidenceSnapshot({
      repository: { loadRevisions: async () => [revision],
        loadAuditEvents: async () => [event("APPROVED", 3), event("REVOKED", 4)] },
      parkId: "p1", evaluatedAt: t(10), registryVersion: "TEST_ONLY",
    });
    expect(result.status).toBe("READY");
    if (result.status === "READY") expect(result.snapshot.records).toHaveLength(0);
  });
});
