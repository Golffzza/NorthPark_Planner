import { describe, expect, it } from "vitest";
import { scoreDurationV2 } from "@/lib/evaluation-v2/duration-scoring";
import { calculateTimeFromScheduleFixture, scoreTimeV2 } from "@/lib/evaluation-v2/time-scoring";
import { calculateAccessibilityFromReviewedFixture, scoreAccessibilityV2,
  type AccessCheck } from "@/lib/evaluation-v2/accessibility-scoring";
import type { EvaluationRoute } from "@/lib/evaluation-v2/route-sampling";

const route = (seconds: number): EvaluationRoute => ({
  profile: "driving", geometry: [{ lat: 18, lng: 98 }, { lat: 18.1, lng: 98.1 }],
  distanceMeters: 1000, durationSeconds: seconds, segmentDurationsSeconds: [seconds],
  segmentDistancesMeters: [1000], timingMethod: "OSRM_ANNOTATION",
  snappedEndpoints: [], provenance: { provider: "OSRM", dataVersion: null,
    annotationStatus: "ALIGNED", geometryPointCount: 2, annotationDurationScale: 1,
    annotationDistanceScale: 1, annotationDiagnostics: { expectedSegments: 1, durationCount: 1,
      distanceCount: 1, durationDifferenceSeconds: 0, distanceDifferenceMeters: 0,
      durationRelativeError: 0, distanceRelativeError: 0 } },
});

describe("E4 duration candidate", () => {
  it.each([[0, 100], [90, 85], [300, 50], [600, 0], [601, 0]])(
    "%i minutes gives D=%i", (minutes, expected) => {
      expect(scoreDurationV2({ transportMode: "CAR", route: route(minutes * 60) }))
        .toMatchObject({ status: "KNOWN", D: expected, minutes });
    });
  it("fails closed for unsupported transport, missing route and invalid durations", () => {
    expect(scoreDurationV2({ transportMode: "MOTORCYCLE", route: route(3600) }).D).toBeNull();
    expect(scoreDurationV2({ transportMode: "PUBLIC_TRANSPORT", route: route(3600) }).D).toBeNull();
    expect(scoreDurationV2({ transportMode: "CAR", route: null }).D).toBeNull();
    for (const seconds of [-1, NaN, Infinity]) {
      expect(scoreDurationV2({ transportMode: "CAR", route: route(seconds) }).D).toBeNull();
    }
  });
  it("does not depend on segment annotations or weather", () => {
    const r = route(5400);
    r.timingMethod = "GEOMETRY_DISTANCE_ESTIMATE";
    r.provenance.annotationStatus = "MISSING_OR_MISMATCHED";
    expect(scoreDurationV2({ transportMode: "CAR", route: r }).D).toBe(85);
  });
});

describe("E4 time candidate", () => {
  const day = { serviceDate: "2026-10-17", sourceId: "TEST_FIXTURE_ONLY",
    intervals: [{ open: "08:00", close: "12:00" }, { open: "13:00", close: "17:00" }] };
  const at = (clock: string) => new Date(`2026-10-17T${clock}:00+07:00`);
  it("calculates sessions and lunch breaks from a fixture", () => {
    expect(calculateTimeFromScheduleFixture({ arrivalAt: at("07:00"), timeZone: "Asia/Bangkok",
      schedules: [day] })).toMatchObject({ status: "KNOWN", T: 100, advisory: "WAIT_FOR_OPENING" });
    expect(calculateTimeFromScheduleFixture({ arrivalAt: at("11:00"), timeZone: "Asia/Bangkok",
      schedules: [day] }).T).toBe(62.5);
    expect(calculateTimeFromScheduleFixture({ arrivalAt: at("12:30"), timeZone: "Asia/Bangkok",
      schedules: [day] }).T).toBe(50);
    expect(calculateTimeFromScheduleFixture({ arrivalAt: at("17:00"), timeZone: "Asia/Bangkok",
      schedules: [day] })).toMatchObject({ T: 0, advisory: "AFTER_FINAL_SESSION" });
  });
  it("handles overnight and missing schedules", () => {
    const overnight = { serviceDate: "2026-10-17", sourceId: "TEST_FIXTURE_ONLY",
      intervals: [{ open: "18:00", close: "02:00", closesNextDay: true }] };
    const atOne = new Date("2026-10-17T18:00:00Z");
    expect(calculateTimeFromScheduleFixture({ arrivalAt: atOne, timeZone: "Asia/Bangkok",
      schedules: [overnight] }).T).toBe(12.5);
    expect(calculateTimeFromScheduleFixture({ arrivalAt: atOne, timeZone: "Asia/Bangkok",
      schedules: [] }).T).toBeNull();
  });
  it("does not trust claimed schedule even if VERIFIED", () => {
    expect(scoreTimeV2({ arrivalAt: at("11:00"), timeZone: "Asia/Bangkok",
      claim: { schedules: [day], sourceId: "fake", reviewStatus: "VERIFIED" } }))
      .toMatchObject({ status: "UNKNOWN", T: null,
        missingReasons: ["NO_TRUSTED_SCHEDULE_REGISTRY"] });
  });
});

describe("E4 accessibility candidate", () => {
  const checks = (lastMile: AccessCheck["outcome"]): AccessCheck[] => [
    { id: "A1_ENTRANCE", outcome: "PASS", evidenceId: "test-e1", reason: null },
    { id: "A2_TRANSPORT_PERMISSION", outcome: "FAIL", evidenceId: "test-e2", reason: "prohibited" },
    { id: "A3_LAST_MILE", outcome: lastMile, evidenceId: "test-e3", reason: lastMile === "NOT_APPLICABLE"
      ? "verified no transfer needed" : null },
  ];
  it("uses only applicable reviewed fixture checks", () => {
    expect(calculateAccessibilityFromReviewedFixture(checks("PASS")).A).toBeCloseTo(200 / 3);
    expect(calculateAccessibilityFromReviewedFixture(checks("NOT_APPLICABLE")).A).toBe(50);
  });
  it("never removes unknown checks or unsupported N/A without evidence", () => {
    expect(calculateAccessibilityFromReviewedFixture(checks("UNKNOWN")).A).toBeNull();
    expect(calculateAccessibilityFromReviewedFixture(checks("NOT_APPLICABLE").map((c) =>
      c.id === "A3_LAST_MILE" ? { ...c, evidenceId: null } : c)).A).toBeNull();
  });
  it("rejects caller-forged VERIFIED regardless of reference metadata", () => {
    const result = scoreAccessibilityV2({ parkId: "test", entranceId: "caller-entrance",
      sourceId: "forged", reviewStatus: "VERIFIED", transportMode: "CAR",
      lastMileRequired: false });
    expect(result).toMatchObject({ status: "UNKNOWN", A: null,
      accessEvidenceStatus: "REFERENCE_NEEDS_REVIEW" });
    expect(result.checks.every((c) => c.outcome === "UNKNOWN")).toBe(true);
  });
});
