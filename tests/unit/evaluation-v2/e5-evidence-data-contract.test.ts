import { describe, expect, it } from "vitest";
import { loadReviewedEvidenceSnapshot, type EvidenceRevision, type EvidenceAuditEvent,
  type EvidenceRepository } from "@/lib/evaluation-v2/evidence-data-contract";
import { resolveEntrance } from "@/lib/evaluation-v2/trusted-evidence";
const now = new Date("2026-10-17T08:00:00Z");
const reviewedAt = new Date("2026-10-02T08:00:00Z");
const revision: EvidenceRevision = {
  revisionId: "r1", parkId: "p1", recordedAt: new Date("2026-10-01T00:00:00Z"),
  supersedesRevisionId: null,
  evidence: { kind: "ENTRANCE", parkId: "p1", entranceId: "a", latitude: 18, longitude: 98,
    review: { evidenceId: "e1", sourceId: "official-fixture", sourceUrl: "https://example.org",
      reviewedBy: "u1", reviewedAt, effectiveFrom: new Date("2026-10-01T00:00:00Z"),
      effectiveTo: new Date("2026-11-01T00:00:00Z"), status: "APPROVED" } },
};
const event: EvidenceAuditEvent = { eventId: "ev1", revisionId: "r1", actorUserId: "u1",
  action: "APPROVED", occurredAt: reviewedAt, note: "fixture" };
const repository = (revs: EvidenceRevision[], events: EvidenceAuditEvent[]): EvidenceRepository =>
  ({ loadRevisions: async () => revs, loadAuditEvents: async () => events });
const load = (revs: EvidenceRevision[], events: EvidenceAuditEvent[]) =>
  loadReviewedEvidenceSnapshot({ repository: repository(revs, events), parkId: "p1",
    evaluatedAt: now, registryVersion: "TEST_ONLY" });

describe("E5.1 audited repository projection", () => {
  it("requires matching audit approval and provides a resolvable fixture snapshot", async () => {
    const result = await load([revision], [event]);
    expect(result.status).toBe("READY");
    if (result.status === "READY") {
      expect(resolveEntrance(result.snapshot, "p1", "a").status).toBe("VERIFIED");
    }
  });
  it("does not accept reviewStatus APPROVED without matching independent audit", async () => {
    const result = await load([revision], []);
    expect(result.status).toBe("READY");
    if (result.status === "READY") expect(result.snapshot.records).toHaveLength(0);
  });
  it("does not promote revoked or expired evidence", async () => {
    for (const events of [
      [event, { ...event, eventId: "ev2", action: "REVOKED" as const,
        occurredAt: new Date("2026-10-03T08:00:00Z") }],
    ]) {
      const result = await load([revision], events);
      expect(result.status).toBe("READY");
      if (result.status === "READY") expect(result.snapshot.records).toHaveLength(0);
    }
    const expired = { ...revision, evidence: { ...revision.evidence,
      review: { ...revision.evidence.review, effectiveTo: new Date("2026-10-16T00:00:00Z") } } } as EvidenceRevision;
    const result = await load([expired], [event]);
    expect(result.status).toBe("READY");
    if (result.status === "READY") expect(resolveEntrance(result.snapshot, "p1", "a").status).toBe("UNKNOWN");
  });
  it("rejects duplicate ids, broken revisions, malformed audit and unavailable repository", async () => {
    expect((await load([revision, revision], [event])).status).toBe("UNKNOWN");
    expect((await load([{ ...revision, supersedesRevisionId: "missing" }], [event])).status).toBe("UNKNOWN");
    expect((await load([revision], [{ ...event, revisionId: "other" }])).status).toBe("UNKNOWN");
    const result = await loadReviewedEvidenceSnapshot({ repository: {
      loadRevisions: async () => { throw Error("offline"); },
      loadAuditEvents: async () => [],
    }, parkId: "p1", evaluatedAt: now, registryVersion: "TEST_ONLY" });
    expect(result).toMatchObject({ status: "UNKNOWN", reasons: ["REGISTRY_UNAVAILABLE"] });
  });
});
