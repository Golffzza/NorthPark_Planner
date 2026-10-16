import { describe, expect, it } from "vitest";

import { buildRouteSamplingPlan, normalizeEvaluationRoute } from "@/lib/evaluation-v2/route-sampling";
import { buildRouteWeatherScoringIntervals, scoreEvaluationWeatherV2 }
  from "@/lib/evaluation-v2/weather-scoring";
import type { AlignedHourlyWeather } from "@/lib/integrations/open-meteo/open-meteo-hourly-service";

const origin = { lat: 18, lng: 98 };
const destination = { lat: 18.05, lng: 98.05 };
const verifiedDestination = { latitude: destination.lat, longitude: destination.lng,
  sourceId: "verified-park-entrance", verifiedAt: new Date("2026-10-01T00:00:00Z") };
const provider = { code: "Ok", waypoints: [
  { location: [98, 18], distance: 0 }, { location: [98.05, 18.05], distance: 0 },
], routes: [{ distance: 11_000, duration: 5_400,
  geometry: { type: "LineString", coordinates: [[98, 18], [98.05, 18], [98.05, 18.05]] },
  legs: [{ annotation: { duration: [2_700, 2_700], distance: [5_500, 5_500] } }] }] };
const route = normalizeEvaluationRoute(provider, { origin, destination });

function weather(at: Date, latitude: number, longitude: number, code: number,
  precipitationMm = 0): AlignedHourlyWeather {
  const floor = Math.floor(at.getTime() / 3_600_000) * 3_600_000;
  const endAt = new Date(floor + 3_600_000);
  const codeAt = new Date(at.getTime() - floor < 30 * 60_000 ? floor : floor + 3_600_000);
  return { status: "OK", precipitationMm, windGustKmh: 0, weatherCode: code,
    accumulationEndAt: endAt, weatherCodeAt: codeAt, missingReasons: [],
    provenance: { provider: "OPEN_METEO", timezone: "GMT", modelRunAt: null,
      fetchedAt: new Date("2026-10-17T07:00:00Z"), gridLatitude: latitude, gridLongitude: longitude,
      requestedLatitude: latitude, requestedLongitude: longitude } };
}

describe("Evaluation V2 route and destination weather scores", () => {
  it("partitions at forecast hours and weights unequal non-overlapping route durations", () => {
    const plan = buildRouteSamplingPlan(route, new Date("2026-10-17T08:00:00Z"));
    const intervals = buildRouteWeatherScoringIntervals(route, plan);
    expect(intervals.map((item) => item.durationSeconds)).toEqual([2_700, 900, 1_800]);
    expect(intervals.reduce((sum, item) => sum + item.durationSeconds, 0)).toBe(route.durationSeconds);
    const codes = [0, 61, 63];
    const intervalWeather = intervals.map((item, index) => weather(item.representative.passageAt,
      item.representative.lat, item.representative.lng, codes[index]));
    const arrival = plan.samples.at(-1)!;
    const result = scoreEvaluationWeatherV2({ route, plan, intervals, intervalWeather,
      destinationWeather: weather(arrival.passageAt, arrival.lat, arrival.lng, 61),
      destinationEvidence: verifiedDestination });
    expect(result.status).toBe("UNKNOWN");
    expect(result.WR).toBeCloseTo((2_700 * 100 + 900 * (200 / 3) + 1_800 * (100 / 3)) / 5_400);
    expect(result.WP).toBeNull();
    expect(result.W).toBeNull();
    expect(result).not.toHaveProperty("S");
    expect(result).not.toHaveProperty("D");
  });

  it("does not average only complete intervals and preserves hazards from partial data", () => {
    const plan = buildRouteSamplingPlan(route, new Date("2026-10-17T08:00:00Z"));
    const intervals = buildRouteWeatherScoringIntervals(route, plan);
    const intervalWeather = intervals.map((item) => weather(item.representative.passageAt,
      item.representative.lat, item.representative.lng, 0));
    intervalWeather[1] = { ...intervalWeather[1], windGustKmh: null, status: "MISSING_DATA",
      precipitationMm: 50.1, missingReasons: ["WIND_GUST_MISSING"] };
    const arrival = plan.samples.at(-1)!;
    const result = scoreEvaluationWeatherV2({ route, plan, intervals, intervalWeather,
      destinationWeather: weather(arrival.passageAt, arrival.lat, arrival.lng, 0),
      destinationEvidence: verifiedDestination });
    expect(result).toMatchObject({ status: "UNKNOWN", WR: null, WP: null, W: null });
    expect(result.hazards.map((hazard) => hazard.kind)).toContain("VERY_HEAVY_HOURLY_RAIN");
  });

  it("refuses coarse coverage, estimated timing and unverified destination for complete weather", () => {
    const long = normalizeEvaluationRoute({ ...provider, routes: [{ ...provider.routes[0],
      duration: 7 * 3_600, legs: [{ annotation: { duration: [7 * 1_800, 7 * 1_800],
        distance: [5_500, 5_500] } }] }] }, { origin, destination });
    const plan = buildRouteSamplingPlan(long, new Date("2026-10-17T08:00:00Z"));
    const intervals = buildRouteWeatherScoringIntervals(long, plan);
    const result = scoreEvaluationWeatherV2({ route: long, plan, intervals,
      intervalWeather: intervals.map(() => null), destinationWeather: null, destinationEvidence: null });
    expect(result).toMatchObject({ status: "UNKNOWN", WR: null, WP: null, W: null });
    expect(result.routeMissingReasons).toContain("ROUTE_INSUFFICIENT_COVERAGE");
    expect(result.destinationMissingReasons).toContain("DESTINATION_COORDINATE_UNVERIFIED");
    const mismatched = scoreEvaluationWeatherV2({ route: long, plan, intervals,
      intervalWeather: intervals.map(() => null), destinationWeather: null,
      destinationEvidence: { ...verifiedDestination, latitude: 19 } });
    expect(mismatched.WP).toBeNull();
    expect(mismatched.destinationMissingReasons).toContain("DESTINATION_COORDINATE_UNVERIFIED");
    const estimated = normalizeEvaluationRoute({ ...provider, routes: [{ ...provider.routes[0],
      legs: [{ annotation: { duration: [5_400], distance: [11_000] } }] }] }, { origin, destination });
    const estimatedPlan = buildRouteSamplingPlan(estimated, new Date("2026-10-17T08:00:00Z"),
      { allowEstimatedPassageTime: true });
    const estimatedIntervals = buildRouteWeatherScoringIntervals(estimated, estimatedPlan);
    const estimatedResult = scoreEvaluationWeatherV2({ route: estimated, plan: estimatedPlan,
      intervals: estimatedIntervals, intervalWeather: estimatedIntervals.map(() => null),
      destinationWeather: null, destinationEvidence: verifiedDestination });
    expect(estimatedResult.routeMissingReasons).toContain("ESTIMATED_PASSAGE_TIME");
    const unapproved = buildRouteSamplingPlan(estimated, new Date("2026-10-17T08:00:00Z"));
    const wpOnly = scoreEvaluationWeatherV2({ route: estimated, plan: unapproved,
      intervals: [], intervalWeather: [],
      destinationWeather: weather(unapproved.arrivalAt, verifiedDestination.latitude,
        verifiedDestination.longitude, 0), destinationEvidence: verifiedDestination });
    expect(wpOnly).toMatchObject({ status: "UNKNOWN", WR: null, WP: null, W: null });
  });

  it("does not treat caller-provided source and timestamp as verified entrance evidence", () => {
    const plan = buildRouteSamplingPlan(route, new Date("2026-10-17T08:00:00Z"));
    const intervals = buildRouteWeatherScoringIntervals(route, plan);
    const result = scoreEvaluationWeatherV2({ route, plan, intervals,
      intervalWeather: intervals.map((item) => weather(item.representative.passageAt,
        item.representative.lat, item.representative.lng, 0)),
      destinationWeather: weather(plan.arrivalAt, destination.lat, destination.lng, 0),
      destinationEvidence: { ...verifiedDestination, effectiveFrom: new Date("2026-10-01T00:00:00Z"),
        reviewStatus: "VERIFIED" } });
    expect(result).toMatchObject({ status: "UNKNOWN", WR: 100, WP: null, W: null,
      destinationEvidence: null });
    expect(result.destinationMissingReasons).toContain("DESTINATION_ENTRANCE_SOURCE_UNVERIFIED");
    expect(result.destinationEvidenceAudit).toMatchObject({ claimReviewStatus: "VERIFIED",
      claimEffectiveFrom: new Date("2026-10-01T00:00:00Z"), verificationStatus: "UNVERIFIED",
      effectiveFrom: null, trustedSource: null });
  });

  it("splits forecast periods across UTC midnight without changing route duration", () => {
    const plan = buildRouteSamplingPlan(route, new Date("2026-10-17T23:30:00Z"));
    const intervals = buildRouteWeatherScoringIntervals(route, plan);
    expect(intervals.map((item) => item.durationSeconds)).toEqual([1_800, 900, 2_700]);
    expect(intervals[1].startAt.toISOString()).toBe("2026-10-18T00:00:00.000Z");
    expect(intervals.at(-1)?.endAt.toISOString()).toBe("2026-10-18T01:00:00.000Z");
  });
});
