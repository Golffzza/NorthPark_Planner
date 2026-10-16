import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchOsrmEvaluationRoute } from "@/lib/integrations/osrm/osrm-evaluation-route";
import { buildRoutePassageSamples, normalizeEvaluationRoute } from "@/lib/evaluation-v2/route-sampling";

const requested = { origin: { lat: 18, lng: 98 }, destination: { lat: 19, lng: 99 } };
const providerRoute = {
  code: "Ok", data_version: "2026-10-01T00:00:00Z",
  waypoints: [{ location: [98, 18], distance: 4 }, { location: [99, 19], distance: 9 }],
  routes: [{ distance: 200_000, duration: 100, geometry: {
    type: "LineString", coordinates: [[98, 18], [99, 18], [99, 19]],
  }, legs: [{ annotation: { duration: [25, 75], distance: [100_000, 100_000] } }] }],
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
    expect(samples[1]).toMatchObject({ lng: 99, elapsedSeconds: 50, timingMethod: "OSRM_ANNOTATION" });
    expect(samples[1].lat).toBeCloseTo(18 + 25 / 75);
    expect(samples[1].passageAt.toISOString()).toBe("2026-10-17T01:00:50.000Z");
  });

  it("labels geometry-distance timing as an estimate when annotations do not align", () => {
    const route = normalizeEvaluationRoute({ ...providerRoute, routes: [{
      ...providerRoute.routes[0], legs: [{ annotation: { duration: [100], distance: [200_000] } }],
    }] }, requested);
    expect(route.timingMethod).toBe("GEOMETRY_DISTANCE_ESTIMATE");
    expect(buildRoutePassageSamples(route, new Date("2026-10-17T01:00:00Z"), 3)[1].timingMethod)
      .toBe("GEOMETRY_DISTANCE_ESTIMATE");
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
    expect(route.durationSeconds).toBe(100);
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
