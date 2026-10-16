import { describe, expect, it } from "vitest";
import { loadReviewedEvidenceSnapshot, type EvidenceRepository } from "@/lib/evaluation-v2/evidence-data-contract";

describe("E5.3 atomic evidence snapshot preference", () => {
  it("uses the atomic method when supplied without independently reading revisions or events", async () => {
    let reads = 0;
    const repository: EvidenceRepository = {
      loadRevisions: async () => { throw Error("non-atomic revision read"); },
      loadAuditEvents: async () => { throw Error("non-atomic event read"); },
      loadConsistentSnapshot: async () => { reads += 1; return { revisions: [], events: [] }; },
    };
    const result = await loadReviewedEvidenceSnapshot({
      repository, parkId: "park", registryVersion: "TEST_ONLY",
      evaluatedAt: new Date("2026-10-17T08:00:00Z"),
    });
    expect(reads).toBe(1);
    expect(result).toMatchObject({ status: "READY", revisionIds: [] });
  });
  it("fails closed when the atomic snapshot read fails", async () => {
    const repository: EvidenceRepository = {
      loadRevisions: async () => [],
      loadAuditEvents: async () => [],
      loadConsistentSnapshot: async () => { throw Error("db disconnected"); },
    };
    const result = await loadReviewedEvidenceSnapshot({
      repository, parkId: "park", registryVersion: "TEST_ONLY",
      evaluatedAt: new Date("2026-10-17T08:00:00Z"),
    });
    expect(result).toMatchObject({ status: "UNKNOWN", reasons: ["REGISTRY_UNAVAILABLE"] });
  });
});
