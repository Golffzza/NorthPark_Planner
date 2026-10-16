import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { normalizeEvaluationRoute, buildRouteSamplingPlan } from "@/lib/evaluation-v2/route-sampling";
import { evaluateWeatherWithReviewedEntranceCandidate } from "@/lib/evaluation-v2/reviewed-destination-weather";
import type { EvidenceRepository } from "@/lib/evaluation-v2/evidence-data-contract";
import type { HourlyBatchPoint } from "@/lib/integrations/open-meteo/open-meteo-hourly-service";

const parkId = "fixture-park";
const entranceId = "fixture-gate";
const route = normalizeEvaluationRoute({
  code: "Ok", waypoints: [
    { location: [98, 18], distance: 0 },
    { location: [98.05, 18.05], distance: 0 },
  ],
  routes: [{
    distance: 11_000, duration: 5_400,
    geometry: { type: "LineString", coordinates: [[98, 18], [98.05, 18], [98.05, 18.05]] },
    legs: [{ annotation: { duration: [2_700, 2_700], distance: [5_500, 5_500] } }],
  }],
}, { origin: { lat: 18, lng: 98 }, destination: { lat: 18.05, lng: 98.05 } });
const plan = buildRouteSamplingPlan(route, new Date("2026-10-17T08:00:00Z"));

function repository(options: { approved?: boolean; latitude?: number } = {}): EvidenceRepository {
  const revision = {
    revisionId: "fixture-revision", parkId, recordedAt: new Date("2026-10-16T08:00:00Z"),
    supersedesRevisionId: null,
    evidence: {
      kind: "ENTRANCE" as const, parkId, entranceId,
      latitude: options.latitude ?? 18.05, longitude: 98.05,
      review: {
        evidenceId: "fixture-evidence", sourceId: "FIXTURE_NOT_REAL",
        sourceUrl: "https://example.org/fixture", reviewedBy: "forged",
        reviewedAt: new Date("2026-10-16T08:00:00Z"),
        effectiveFrom: new Date("2026-10-01T00:00:00Z"),
        effectiveTo: new Date("2026-11-01T00:00:00Z"), status: "PENDING" as const,
      },
    },
  };
  const events = options.approved === false ? [] : [{
      eventId: "fixture-approval", revisionId: revision.revisionId,
      actorUserId: "fixture-reviewer", action: "APPROVED" as const,
      occurredAt: new Date("2026-10-16T09:00:00Z"), note: "fixture only",
    }];
  return {
    loadRevisions: async () => [revision],
    loadAuditEvents: async () => events,
    loadConsistentSnapshot: async () => ({ revisions: [revision], events }),
  };
}

const fetchBatch = vi.fn(async (points: readonly HourlyBatchPoint[]) => ({
  httpRequests: points.length, uniqueCoordinates: points.length,
  results: points.map((point, index) => {
    const hour = Math.floor(point.at.getTime() / 3_600_000) * 3_600_000;
    return {
      index, point, status: "OK" as const, forecast: {
        rows: [-1, 0, 1, 2].map((n) => ({
          endAt: new Date(hour + n * 3_600_000), precipitationMm: 0,
          windGustKmh: 0, weatherCode: 0,
        })),
        coverage: {
          firstAccumulationStartAt: new Date(hour - 2 * 3_600_000),
          lastTimestampAt: new Date(hour + 2 * 3_600_000),
          requestedFrom: null, requestedTo: null,
        },
        provenance: {
          provider: "OPEN_METEO" as const, timezone: "GMT" as const,
          modelRunAt: null, fetchedAt: new Date("2026-10-17T07:00:00Z"),
          gridLatitude: point.latitude, gridLongitude: point.longitude,
          requestedLatitude: point.latitude, requestedLongitude: point.longitude,
        },
      },
    };
  }),
}));

describe("E6 candidate reviewed destination WP/W adapter", () => {
  it("unlocks WP and W only for audited current entrance and aligned destination forecast", async () => {
    fetchBatch.mockClear();
    const result = await evaluateWeatherWithReviewedEntranceCandidate({
      route, plan, parkId, entranceId, repository: repository(),
      registryVersion: "fixture-only", now: new Date("2026-10-17T07:00:00Z"),
      fetchBatch,
    });
    expect(result.status).toBe("KNOWN");
    expect(result).toMatchObject({ WR: 100, WP: 100, W: 100 });
    expect(result.destinationEvidenceAudit.verificationStatus).toBe("VERIFIED");
    expect(fetchBatch).toHaveBeenCalledTimes(2);
  });

  it("refuses unapproved evidence and does not request destination forecast", async () => {
    fetchBatch.mockClear();
    const result = await evaluateWeatherWithReviewedEntranceCandidate({
      route, plan, parkId, entranceId, repository: repository({ approved: false }),
      registryVersion: "fixture-only", now: new Date("2026-10-17T07:00:00Z"),
      fetchBatch,
    });
    expect(result).toMatchObject({ status: "UNKNOWN", WP: null, W: null });
    expect(fetchBatch).toHaveBeenCalledTimes(1);
  });

  it("refuses a reviewed entrance that is too far from the routed destination", async () => {
    fetchBatch.mockClear();
    const result = await evaluateWeatherWithReviewedEntranceCandidate({
      route, plan, parkId, entranceId, repository: repository({ latitude: 19 }),
      registryVersion: "fixture-only", now: new Date("2026-10-17T07:00:00Z"),
      fetchBatch,
    });
    expect(result).toMatchObject({ status: "UNKNOWN", WP: null, W: null });
    expect(result.destinationMissingReasons).toContain("ENTRANCE_ROUTE_ENDPOINT_MISMATCH");
    expect(fetchBatch).toHaveBeenCalledTimes(1);
  });
});
