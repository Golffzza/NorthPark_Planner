import { describe, expect, it } from "vitest";
import { resolveEntrance, resolveSchedule, resolvePermission, resolveLastMile,
  type TrustedEvidenceSnapshot, type EvidenceReview, type EntranceRecord } from
  "@/lib/evaluation-v2/trusted-evidence";

const now = new Date("2026-10-17T08:00:00Z");
const review: EvidenceReview = {
  evidenceId: "example-only", sourceId: "fixture", sourceUrl: "https://example.org/park",
  reviewedBy: "test-reviewer", reviewedAt: new Date("2026-10-01T00:00:00Z"),
  effectiveFrom: new Date("2026-10-01T00:00:00Z"), effectiveTo: new Date("2026-11-01T00:00:00Z"),
  status: "APPROVED",
};
const entrance: EntranceRecord = { kind: "ENTRANCE", parkId: "park-a", entranceId: "gate-a",
  latitude: 18, longitude: 98, review };
const snapshot = (records: TrustedEvidenceSnapshot["records"]): TrustedEvidenceSnapshot =>
  ({ origin: "SERVER_REVIEWED_REGISTRY", registryVersion: "TEST_FIXTURE_ONLY",
    evaluatedAt: now, records });

describe("E5 server-reviewed evidence candidate resolver (fixtures only)", () => {
  it("requires current, uniquely identified, valid records", () => {
    expect(resolveEntrance(snapshot([entrance]), "park-a", "gate-a"))
      .toMatchObject({ status: "VERIFIED", evidenceId: "example-only" });
    expect(resolveEntrance(snapshot([entrance]), "another-park", "gate-a"))
      .toMatchObject({ status: "UNKNOWN", missingReasons: ["EVIDENCE_NOT_FOUND"] });
    expect(resolveEntrance(snapshot([entrance, { ...entrance }]), "park-a", "gate-a"))
      .toMatchObject({ status: "UNKNOWN", missingReasons: ["EVIDENCE_CONFLICT"] });
  });
  it("rejects revoked, expired, future and malformed records", () => {
    for (const patch of [
      { status: "REVOKED" as const }, { status: "PENDING" as const },
      { effectiveTo: new Date("2026-10-17T08:00:00Z") },
      { reviewedAt: new Date("2026-10-18T00:00:00Z") },
      { sourceUrl: "http://example.org" }, { sourceUrl: "not-a-url" },
    ]) {
      expect(resolveEntrance(snapshot([{ ...entrance, review: { ...review, ...patch } }]),
        "park-a", "gate-a").status).toBe("UNKNOWN");
    }
    expect(resolveEntrance(snapshot([{ ...entrance, latitude: 999 }]), "park-a", "gate-a")
      .status).toBe("UNKNOWN");
  });
  it("resolves dated schedules and exact mode-specific permissions separately", () => {
    const s = { kind: "SCHEDULE" as const, parkId: "park-a",
      serviceDate: "2026-10-17", timeZone: "Asia/Bangkok",
      intervals: [{ open: "08:00", close: "17:00" }], review };
    const permission = { kind: "PERMISSION" as const, parkId: "park-a", entranceId: "gate-a",
      transportMode: "CAR", permitted: false, review };
    const lastMile = { kind: "LAST_MILE" as const, parkId: "park-a", entranceId: "gate-a",
      transportMode: "CAR", applicability: "NOT_REQUIRED" as const,
      accessible: null, rationale: "test direct entry", review };
    const data = snapshot([s, permission, lastMile]);
    expect(resolveSchedule(data, "park-a", "2026-10-17").status).toBe("VERIFIED");
    expect(resolvePermission(data, "park-a", "gate-a", "CAR").record?.permitted).toBe(false);
    expect(resolvePermission(data, "park-a", "gate-a", "MOTORCYCLE").status).toBe("UNKNOWN");
    expect(resolveLastMile(data, "park-a", "gate-a", "CAR").record?.applicability)
      .toBe("NOT_REQUIRED");
  });
});
