import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchOsrmEvaluationRoute } from "@/lib/integrations/osrm/osrm-evaluation-route";
import { buildRouteSamplingPlan } from "@/lib/evaluation-v2/route-sampling";
import { buildEvaluationTimeline } from "@/lib/evaluation-v2/timeline";
import { fetchWeatherForRoutePlan } from "@/lib/evaluation-v2/route-weather";

const endpoints = { origin: { lat: 18, lng: 98 }, destination: { lat: 18.1, lng: 98.1 } };
const routeResponse = { code: "Ok", data_version: "2026-10-17T00:00:00Z",
  waypoints: [{ location: [98, 18], distance: 0 }, { location: [98.1, 18.1], distance: 0 }],
  routes: [{ distance: 22_000, duration: 7_200,
    geometry: { type: "LineString", coordinates: [[98, 18], [98.1, 18], [98.1, 18.1]] },
    legs: [{ annotation: { duration: [3_600, 3_600], distance: [11_000, 11_000] } }] }] };
const hours = [16, 17, 18, 19].map((hour) => `2026-10-17T${hour}:00`);
const weatherResponse = { timezone: "GMT", utc_offset_seconds: 0,
  latitude: 18, longitude: 98,
  hourly_units: { precipitation: "mm", wind_gusts_10m: "km/h", weather_code: "wmo code" },
  hourly: { time: hours, precipitation: [0, 0, 0, 0], wind_gusts_10m: [4, 4, 4, 4],
    weather_code: [1, 1, 1, 1] } };

describe("Evaluation V2 provider contract pipeline", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps OSRM geometry, Bangkok cross-day passage times and sampled hourly provenance separate from scores", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) =>
      new Response(JSON.stringify(new URL(url).pathname.startsWith("/route/") ? routeResponse : weatherResponse),
        { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const route = await fetchOsrmEvaluationRoute({ ...endpoints, transportMode: "CAR" });
    const timeline = buildEvaluationTimeline({ departureDate: "2026-10-17", departAt: "23:30",
      timeZone: "Asia/Bangkok", routeDurationSeconds: route.durationSeconds });
    const plan = buildRouteSamplingPlan(route, timeline.departureAt);
    const result = await fetchWeatherForRoutePlan(plan, { now: new Date("2026-10-17T16:00:00Z") });

    expect(timeline.arrivalLocalDate).toBe("2026-10-18");
    expect(plan.status).toBe("SUFFICIENT");
    expect(plan.samples.map((sample) => sample.passageAt.toISOString())).toEqual([
      "2026-10-17T16:30:00.000Z", "2026-10-17T17:30:00.000Z", "2026-10-17T18:30:00.000Z",
    ]);
    expect(plan.samples[1]).toMatchObject({ lat: 18, lng: 98.1, segmentIndex: 0,
      timingMethod: "OSRM_ANNOTATION" });
    expect(result.status).toBe("COMPLETE");
    expect(result.samples.every((sample) => sample.weather?.status === "OK")).toBe(true);
    expect(result.samples[0].weather?.provenance).toMatchObject({ provider: "OPEN_METEO",
      requestedLatitude: 18, requestedLongitude: 98 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("weatherScore");
    expect(timeline).not.toHaveProperty("timeScore");
  });

  it("keeps a missing weather field and later provider failure incomplete", async () => {
    let forecastCalls = 0;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(routeResponse), { status: 200 })));
    const route = await fetchOsrmEvaluationRoute({ ...endpoints, transportMode: "CAR" });
    const plan = buildRouteSamplingPlan(route, new Date("2026-10-17T16:30:00Z"));
    const requestForecast = vi.fn().mockImplementation(async () => {
      forecastCalls += 1;
      if (forecastCalls === 3) throw Object.assign(new Error("provider failure"), { code: "UPSTREAM_UNAVAILABLE" });
      const at = new Date(`2026-10-17T${15 + forecastCalls}:00:00Z`);
      return { rows: [0, 1].map((offset) => ({ endAt: new Date(at.getTime() + offset * 3_600_000),
        precipitationMm: forecastCalls === 2 ? null : 0, windGustKmh: 4, weatherCode: 1 })),
      provenance: { provider: "OPEN_METEO", timezone: "GMT", modelRunAt: null,
        fetchedAt: new Date("2026-10-17T16:00:00Z") } };
    });
    const result = await fetchWeatherForRoutePlan(plan, { requestForecast });
    expect(result.status).toBe("INCOMPLETE");
    expect(result.samples.map((sample) => sample.status)).toEqual(["OK", "MISSING_DATA", "UNAVAILABLE"]);
    expect(result.samples[1].weather?.missingReasons).toContain("PRECIPITATION_MISSING");
    expect(result.samples[2].errorCode).toBe("UPSTREAM_UNAVAILABLE");
    expect(requestForecast).toHaveBeenCalledTimes(3);
  });
});
