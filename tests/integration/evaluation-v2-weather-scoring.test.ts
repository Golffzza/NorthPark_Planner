import { afterEach, describe, expect, it, vi } from "vitest";

import { buildRouteSamplingPlan, normalizeEvaluationRoute } from "@/lib/evaluation-v2/route-sampling";
import { evaluateWeatherV2Candidate } from "@/lib/evaluation-v2/weather-scoring";

const route = normalizeEvaluationRoute({ code: "Ok", waypoints: [
  { location: [98, 18], distance: 0 }, { location: [98.05, 18.05], distance: 0 },
], routes: [{ distance: 11_000, duration: 5_400,
  geometry: { type: "LineString", coordinates: [[98, 18], [98.05, 18], [98.05, 18.05]] },
  legs: [{ annotation: { duration: [2_700, 2_700], distance: [5_500, 5_500] } }] }] },
{ origin: { lat: 18, lng: 98 }, destination: { lat: 18.05, lng: 98.05 } });
const verifiedDestination = { latitude: 18.05, longitude: 98.05,
  sourceId: "verified-park-entrance", verifiedAt: new Date("2026-10-01T00:00:00Z") };

function payload(latitude: number, longitude: number, code: number, overnight = false) {
  return { latitude, longitude, timezone: "GMT", utc_offset_seconds: 0,
    hourly_units: { precipitation: "mm", wind_gusts_10m: "km/h", weather_code: "wmo code" },
    hourly: { time: overnight
      ? ["2026-10-17T23:00", "2026-10-18T00:00", "2026-10-18T01:00", "2026-10-18T02:00"]
      : ["2026-10-17T08:00", "2026-10-17T09:00", "2026-10-17T10:00"],
    precipitation: [0, 0, 0, 0].slice(0, overnight ? 4 : 3),
    wind_gusts_10m: [0, 0, 0, 0].slice(0, overnight ? 4 : 3),
    weather_code: [code, code, code, code].slice(0, overnight ? 4 : 3) } };
}

describe("Evaluation V2 candidate weather pipeline", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("scores route intervals with isolated requests without mutating V1 or ETA", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const params = new URL(url).searchParams;
      return new Response(JSON.stringify(payload(Number(params.get("latitude")),
        Number(params.get("longitude")), [0, 61, 63][fetchMock.mock.calls.length - 1])), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const plan = buildRouteSamplingPlan(route, new Date("2026-10-17T08:00:00Z"));
    const result = await evaluateWeatherV2Candidate({ route, plan, destinationEvidence: verifiedDestination,
      now: new Date("2026-10-17T08:00:00Z") });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.requestProvenance).toMatchObject({ httpRequests: 3, uniqueCoordinates: 3,
      batches: 1, maxCoordinatesPerBatch: 5, coordinatesPerHttpRequest: 1, maxHttpRequests: 12 });
    expect(result).toMatchObject({ status: "UNKNOWN", samplingStatus: "SUFFICIENT" });
    expect(result.WR).toBeCloseTo((2_700 * 100 + 900 * (200 / 3) + 1_800 * (100 / 3)) / 5_400);
    expect(result.WP).toBeNull();
    expect(result.W).toBeNull();
    expect(result.destinationEvidenceAudit).toMatchObject({
      claimSourceId: "verified-park-entrance", claimMatchesSnappedEndpoint: true,
      verificationStatus: "UNVERIFIED", effectiveFrom: null,
      trustedSource: null, reason: "NO_TRUSTED_ENTRANCE_REGISTRY" });
    expect(route.durationSeconds).toBe(5_400);
    expect(result).not.toHaveProperty("totalScore");
    expect(result).not.toHaveProperty("D");
    expect(result).not.toHaveProperty("T");
    expect(result).not.toHaveProperty("A");
  });

  it("keeps partial provider data and 429 as UNKNOWN rather than good weather", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const params = new URL(url).searchParams;
      const item = payload(Number(params.get("latitude")), Number(params.get("longitude")), 0);
      if (fetchMock.mock.calls.length === 2) {
        item.hourly.wind_gusts_10m[1] = null as never;
        item.hourly.precipitation[1] = 50.1;
      }
      return new Response(JSON.stringify(item), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const plan = buildRouteSamplingPlan(route, new Date("2026-10-17T08:00:00Z"));
    const partial = await evaluateWeatherV2Candidate({ route, plan, destinationEvidence: verifiedDestination,
      now: new Date("2026-10-17T08:00:00Z") });
    expect(partial).toMatchObject({ status: "UNKNOWN", WR: null, W: null });
    expect(partial.hazards.map((hazard) => hazard.kind)).toContain("VERY_HEAVY_HOURLY_RAIN");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 })));
    const limited = await evaluateWeatherV2Candidate({ route, plan, destinationEvidence: verifiedDestination,
      now: new Date("2026-10-17T08:00:00Z") });
    expect(limited).toMatchObject({ status: "UNKNOWN", WR: null, WP: null, W: null });
    expect(limited.routeMissingReasons).toContain("INTERVAL_0_RATE_LIMITED");
  });

  it("keeps a cross-midnight forecast window aligned without adding travel time", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const params = new URL(url).searchParams;
      return new Response(JSON.stringify(payload(Number(params.get("latitude")),
        Number(params.get("longitude")), 0, true)), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const plan = buildRouteSamplingPlan(route, new Date("2026-10-17T23:30:00Z"));
    const result = await evaluateWeatherV2Candidate({ route, plan, destinationEvidence: verifiedDestination,
      now: new Date("2026-10-17T23:00:00Z") });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("start_date")).toBe("2026-10-17");
    expect(url.searchParams.get("end_date")).toBe("2026-10-18");
    expect(result).toMatchObject({ status: "UNKNOWN", WR: 100, WP: null, W: null });
    expect(plan.samples.at(-1)?.passageAt.toISOString()).toBe("2026-10-18T01:00:00.000Z");
  });

  it("returns UNKNOWN outside the supported forecast window without calling the provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const plan = buildRouteSamplingPlan(route, new Date("2026-11-03T08:00:00Z"));
    const result = await evaluateWeatherV2Candidate({ route, plan, destinationEvidence: verifiedDestination,
      now: new Date("2026-10-17T08:00:00Z") });
    expect(result).toMatchObject({ status: "UNKNOWN", WR: null, WP: null, W: null });
    expect(result.routeMissingReasons).toContain("INTERVAL_0_OUTSIDE_FORECAST_WINDOW");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses two bounded batches for more than four intervals and keeps second-batch failure UNKNOWN", async () => {
    const longRoute = normalizeEvaluationRoute({ code: "Ok", waypoints: [
      { location: [98, 18], distance: 0 }, { location: [98.05, 18.05], distance: 0 },
    ], routes: [{ distance: 11_000, duration: 10_800,
      geometry: { type: "LineString", coordinates: [[98, 18], [98.05, 18], [98.05, 18.05]] },
      legs: [{ annotation: { duration: [5_400, 5_400], distance: [5_500, 5_500] } }] }] },
    { origin: { lat: 18, lng: 98 }, destination: { lat: 18.05, lng: 98.05 } });
    const plan = buildRouteSamplingPlan(longRoute, new Date("2026-10-17T08:30:00Z"));
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (fetchMock.mock.calls.length === 6) return new Response("unavailable", { status: 503 });
      const query = new URL(url).searchParams;
      const item = payload(Number(query.get("latitude")), Number(query.get("longitude")), 0);
      item.hourly.time = Array.from({ length: 7 }, (_, index) =>
        `2026-10-17T${String(index + 8).padStart(2, "0")}:00`);
      item.hourly.precipitation = Array(7).fill(0);
      item.hourly.wind_gusts_10m = Array(7).fill(0);
      item.hourly.weather_code = Array(7).fill(0);
      if (fetchMock.mock.calls.length === 5) item.hourly.wind_gusts_10m = Array(7).fill(null) as never;
      return new Response(JSON.stringify(item), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await evaluateWeatherV2Candidate({ route: longRoute, plan,
      destinationEvidence: verifiedDestination, now: new Date("2026-10-17T08:00:00Z") });
    expect(plan.status).toBe("SUFFICIENT");
    expect(result.intervals.length).toBeGreaterThan(4);
    expect(result.requestProvenance).toMatchObject({ batches: 2, httpRequests: 6,
      maxCoordinatesPerBatch: 5, coordinatesPerHttpRequest: 1, maxHttpRequests: 12 });
    expect(result).toMatchObject({ status: "UNKNOWN", WR: null, WP: null, W: null });
    expect(result.routeMissingReasons).toContain("INTERVAL_4_UNKNOWN");
    expect(result.routeMissingReasons).toContain("INTERVAL_5_UPSTREAM_UNAVAILABLE");
  });
});
