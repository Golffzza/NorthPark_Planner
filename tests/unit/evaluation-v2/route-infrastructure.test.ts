import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchOsrmEvaluationRoute } from "@/lib/integrations/osrm/osrm-evaluation-route";
import { buildRoutePassageSamples, buildRouteSamplingPlan, normalizeEvaluationRoute } from "@/lib/evaluation-v2/route-sampling";

const requested = { origin: { lat: 18, lng: 98 }, destination: { lat: 19, lng: 99 } };
const providerRoute = {
  code: "Ok", data_version: "2026-10-01T00:00:00Z",
  waypoints: [{ location: [98, 18], distance: 4 }, { location: [99, 19], distance: 9 }],
  routes: [{ distance: 200_000, duration: 10_000, geometry: {
    type: "LineString", coordinates: [[98, 18], [99, 18], [99, 19]],
  }, legs: [{ annotation: { duration: [2_500, 7_500], distance: [100_000, 100_000] } }] }],
};

describe("Evaluation V2 OSRM route infrastructure", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("samples passage times on the provider's bent geometry using segment durations", () => {
    const route = normalizeEvaluationRoute(providerRoute, requested);
    const samples = buildRoutePassageSamples(route, new Date("2026-10-17T01:00:00Z"), 3);
    expect(route.timingMethod).toBe("OSRM_ANNOTATION");
    expect(route.snappedEndpoints.map((point) => point.distanceMeters)).toEqual([4, 9]);
    expect(route.provenance.dataVersion).toBe("2026-10-01T00:00:00Z");
    expect(samples).toHaveLength(3);
    expect(samples[1]).toMatchObject({ lng: 99, elapsedSeconds: 5_000, timingMethod: "OSRM_ANNOTATION" });
    expect(samples[1].lat).toBeCloseTo(18 + 2_500 / 7_500);
    expect(samples[1].passageAt.toISOString()).toBe("2026-10-17T02:23:20.000Z");
  });

  it("labels geometry-distance timing as an estimate when annotations do not align", () => {
    const route = normalizeEvaluationRoute({ ...providerRoute, routes: [{
      ...providerRoute.routes[0], legs: [{ annotation: { duration: [10_000], distance: [200_000] } }],
    }] }, requested);
    expect(route.timingMethod).toBe("GEOMETRY_DISTANCE_ESTIMATE");
    expect(route.provenance.annotationStatus).toBe("MISSING_OR_MISMATCHED");
    expect(route.provenance.annotationDiagnostics).toMatchObject({ expectedSegments: 2, durationCount: 1 });
    expect(buildRouteSamplingPlan(route, new Date("2026-10-17T01:00:00Z")).status).toBe("TIMING_UNAVAILABLE");
    expect(buildRoutePassageSamples(route, new Date("2026-10-17T01:00:00Z"), 3,
      { allowEstimatedPassageTime: true })[1].timingMethod)
      .toBe("GEOMETRY_DISTANCE_ESTIMATE");
  });

  it("reports annotation deltas and rejects implausible route summaries", () => {
    const route = normalizeEvaluationRoute({ ...providerRoute, routes: [{ ...providerRoute.routes[0],
      legs: [{ annotation: { duration: [2_500, 6_000], distance: [100_000, 100_000] } }],
    }] }, requested);
    expect(route.provenance.annotationDiagnostics).toMatchObject({
      durationDifferenceSeconds: -1_500, durationRelativeError: 0.15,
    });
    expect(route.timingMethod).toBe("GEOMETRY_DISTANCE_ESTIMATE");
    expect(() => normalizeEvaluationRoute({ ...providerRoute, routes: [{
      ...providerRoute.routes[0], duration: 10,
    }] }, requested)).toThrow();
    expect(() => normalizeEvaluationRoute({ ...providerRoute, routes: [{
      ...providerRoute.routes[0], geometry: { type: "LineString", coordinates: Array(50_001).fill([98, 18]) },
    }] }, requested)).toThrow();
  });

  it("caps hourly requests and marks long-route sampling as coarse", () => {
    const route = normalizeEvaluationRoute({ ...providerRoute, routes: [{ ...providerRoute.routes[0],
      duration: 7 * 3_600, legs: [{ annotation: { duration: [7 * 900, 7 * 2_700],
        distance: [100_000, 100_000] } }],
    }] }, requested);
    const plan = buildRouteSamplingPlan(route, new Date("2026-10-17T01:00:00Z"));
    expect(plan.samples).toHaveLength(5);
    expect(plan.status).toBe("INSUFFICIENT_COVERAGE");
    expect(plan.samplingIntervalSeconds).toBe(6_300);
    expect(plan.coverage).toMatchObject({ requestLimit: 5, sampledSpanSeconds: 25_200,
      maxTemporalGapSeconds: 6_300 });
    expect(plan.coverage.maxSpatialGapMeters).toBeGreaterThan(50_000);
    expect(plan.policy).toEqual({ maxWeatherRequests: 5, maxTemporalGapSeconds: 3_600,
      maxSpatialGapMeters: 50_000 });
  });

  it("uses three bounded samples for a short real geometry and rejects invalid segment values", () => {
    const short = normalizeEvaluationRoute({ code: "Ok", waypoints: [
      { location: [98, 18], distance: 0 }, { location: [98.004, 18], distance: 0 },
    ], routes: [{ distance: 450, duration: 300,
      geometry: { type: "LineString", coordinates: [[98, 18], [98.002, 18], [98.004, 18]] },
      legs: [{ annotation: { duration: [150, 150], distance: [225, 225] } }] }] },
    { origin: { lat: 18, lng: 98 }, destination: { lat: 18, lng: 98.004 } });
    const plan = buildRouteSamplingPlan(short, new Date("2026-10-17T01:00:00Z"));
    expect(plan.status).toBe("SUFFICIENT");
    expect(plan.samples).toHaveLength(3);
    expect(plan.samplingIntervalSeconds).toBe(150);
    expect(() => buildRouteSamplingPlan({ ...short, segmentDurationsSeconds: [NaN, 300] },
      new Date("2026-10-17T01:00:00Z"))).toThrow();
  });

  it("rejects missing geometry and distant snapped endpoints without drawing a straight line", () => {
    expect(() => normalizeEvaluationRoute({ ...providerRoute, routes: [{
      ...providerRoute.routes[0], geometry: null,
    }] }, requested)).toThrow();
    expect(() => normalizeEvaluationRoute({ ...providerRoute, waypoints: [
      { location: [98, 18], distance: 300 }, providerRoute.waypoints[1],
    ] }, requested)).toThrow();
    expect(() => normalizeEvaluationRoute({ ...providerRoute, routes: [{ ...providerRoute.routes[0],
      geometry: { type: "LineString", coordinates: [[98.5, 18.5], [99, 18], [99, 19]] },
    }] }, requested)).toThrow();
  });

  it("requests full geometry and segment annotations in longitude,latitude order for driving only", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(providerRoute), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const route = await fetchOsrmEvaluationRoute({ ...requested, transportMode: "CAR" });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/route/v1/driving/98,18;99,19");
    expect(url.searchParams.get("overview")).toBe("full");
    expect(url.searchParams.get("annotations")).toBe("duration,distance");
    expect(route.durationSeconds).toBe(10_000);
    await expect(fetchOsrmEvaluationRoute({ ...requested, transportMode: "MOTORCYCLE" })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not turn NoRoute or an aborted request into a route estimate", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "NoRoute" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchOsrmEvaluationRoute({ ...requested, transportMode: "CAR" }))
      .rejects.toMatchObject({ code: "NO_ROUTE" });
    const controller = new AbortController(); controller.abort();
    await expect(fetchOsrmEvaluationRoute({ ...requested, transportMode: "CAR", signal: controller.signal }))
      .rejects.toMatchObject({ code: "TIMEOUT" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
