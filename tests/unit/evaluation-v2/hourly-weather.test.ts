import { afterEach, describe, expect, it, vi } from "vitest";

import { alignHourlyForecast, fetchOpenMeteoHourlyForecast, HourlyWeatherError } from "@/lib/integrations/open-meteo/open-meteo-hourly-service";
import { fetchWeatherForRoutePlan, fetchWeatherForRouteSamples } from "@/lib/evaluation-v2/route-weather";
import { buildRouteSamplingPlan, normalizeEvaluationRoute } from "@/lib/evaluation-v2/route-sampling";

const now = new Date("2026-10-17T00:00:00Z");
const providerResponse = {
  timezone: "GMT", utc_offset_seconds: 0, latitude: 18.8, longitude: 98.9,
  hourly_units: { precipitation: "mm", wind_gusts_10m: "km/h", weather_code: "wmo code" },
  hourly: { time: ["2026-10-17T10:00", "2026-10-17T11:00", "2026-10-17T12:00"],
    precipitation: [0, 1.25, 2.5], wind_gusts_10m: [4, 5, 6], weather_code: [0, 61, 63] },
};
const input = { latitude: 18.8, longitude: 98.9,
  from: new Date("2026-10-17T11:30:00Z"), to: new Date("2026-10-17T11:30:00Z"), now };

describe("Evaluation V2 hourly weather", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("requests UTC hourly variables and aligns preceding-hour values separately from instant code", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(providerResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const forecast = await fetchOpenMeteoHourlyForecast(input);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("hourly")).toBe("precipitation,wind_gusts_10m,weather_code");
    expect(url.searchParams.get("timezone")).toBe("GMT");
    expect(url.searchParams.get("precipitation_unit")).toBe("mm");
    expect(url.searchParams.get("wind_speed_unit")).toBe("kmh");
    expect(url.searchParams.get("forecast_days")).toBeNull();
    expect(alignHourlyForecast(forecast, input.from)).toMatchObject({
      status: "OK", precipitationMm: 2.5, windGustKmh: 6, weatherCode: 63,
      accumulationEndAt: new Date("2026-10-17T12:00:00Z"),
      missingReasons: [],
      provenance: { provider: "OPEN_METEO", timezone: "GMT", modelRunAt: null },
    });
    expect(forecast.coverage).toMatchObject({
      firstAccumulationStartAt: new Date("2026-10-17T09:00:00Z"),
      lastTimestampAt: new Date("2026-10-17T12:00:00Z"),
      requestedFrom: input.from, requestedTo: input.to,
    });
  });

  it("preserves null provider values as missing instead of inventing weather", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ...providerResponse, hourly: { ...providerResponse.hourly, wind_gusts_10m: [4, 5, null] },
    }), { status: 200 })));
    const result = alignHourlyForecast(await fetchOpenMeteoHourlyForecast(input), input.from);
    expect(result).toMatchObject({ status: "MISSING_DATA", precipitationMm: 2.5, windGustKmh: null,
      missingReasons: ["WIND_GUST_MISSING"] });
    expect(result).not.toHaveProperty("score");
  });

  it("rejects invalid coordinates, dates and unsupported forecast windows before fetch", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(fetchOpenMeteoHourlyForecast({ ...input, latitude: 100 })).rejects.toBeInstanceOf(HourlyWeatherError);
    await expect(fetchOpenMeteoHourlyForecast({ ...input, from: new Date("2026-10-16T23:00:00Z") }))
      .rejects.toMatchObject({ code: "OUTSIDE_FORECAST_WINDOW" });
    await expect(fetchOpenMeteoHourlyForecast({ ...input, to: new Date("2026-11-04T00:00:00Z") }))
      .rejects.toMatchObject({ code: "OUTSIDE_FORECAST_WINDOW" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("distinguishes 429 and invalid units from empty weather", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("quota", { status: 429 })));
    await expect(fetchOpenMeteoHourlyForecast(input)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ...providerResponse, hourly_units: { ...providerResponse.hourly_units, precipitation: "inch" },
    }), { status: 200 })));
    await expect(fetchOpenMeteoHourlyForecast(input)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("distinguishes upstream 5xx, incomplete arrays and a real abort timeout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    await expect(fetchOpenMeteoHourlyForecast(input)).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ...providerResponse, hourly: { ...providerResponse.hourly, weather_code: [0, 61] },
    }), { status: 200 })));
    await expect(fetchOpenMeteoHourlyForecast(input)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })));
    const pending = fetchOpenMeteoHourlyForecast(input);
    const assertion = expect(pending).rejects.toMatchObject({ code: "UPSTREAM_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(6_001);
    await assertion;
  });

  it("rejects a response that omits the requested hourly window", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ...providerResponse, hourly: { ...providerResponse.hourly,
        time: ["2026-10-17T10:00", "2026-10-17T11:00"],
        precipitation: [0, 1.25], wind_gusts_10m: [4, 5], weather_code: [0, 61] },
    }), { status: 200 })));
    await expect(fetchOpenMeteoHourlyForecast(input)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(providerResponse), { status: 200 })));
    await expect(fetchOpenMeteoHourlyForecast({ ...input, from: new Date("2026-10-17T08:30:00Z") }))
      .rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("reports distinct missing reasons for precipitation, wind, code and uncovered hours", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ...providerResponse, hourly: { ...providerResponse.hourly,
        precipitation: [0, 1.25, null], wind_gusts_10m: [4, 5, null], weather_code: [0, 61, null] },
    }), { status: 200 })));
    const forecast = await fetchOpenMeteoHourlyForecast(input);
    expect(alignHourlyForecast(forecast, input.from).missingReasons)
      .toEqual(["PRECIPITATION_MISSING", "WIND_GUST_MISSING", "WEATHER_CODE_MISSING"]);
    expect(alignHourlyForecast(forecast, new Date("2026-10-17T13:30:00Z")).missingReasons)
      .toContain("ACCUMULATION_HOUR_MISSING");
  });

  it("does not label a sparse long-route weather plan complete", async () => {
    const route = normalizeEvaluationRoute({ code: "Ok", waypoints: [
      { location: [98, 18], distance: 0 }, { location: [99, 19], distance: 0 },
    ], routes: [{ distance: 200_000, duration: 7 * 3_600, geometry: {
      type: "LineString", coordinates: [[98, 18], [99, 18], [99, 19]],
    }, legs: [{ annotation: { duration: [7 * 900, 7 * 2_700], distance: [100_000, 100_000] } }] }] },
    { origin: { lat: 18, lng: 98 }, destination: { lat: 19, lng: 99 } });
    const plan = buildRouteSamplingPlan(route, new Date("2026-10-17T10:00:00Z"));
    const requestForecast = vi.fn().mockImplementation(async ({ to }: { to: Date }) => ({
      rows: [0, 1].map((offset) => ({
        endAt: new Date(Math.floor(to.getTime() / 3_600_000) * 3_600_000 + offset * 3_600_000),
        precipitationMm: 0, windGustKmh: 0, weatherCode: 0 })),
      provenance: { provider: "OPEN_METEO", timezone: "GMT", modelRunAt: null, fetchedAt: now },
    }));
    const result = await fetchWeatherForRoutePlan(plan, { now, requestForecast });
    expect(requestForecast).toHaveBeenCalledTimes(5);
    expect(result.status).toBe("INCOMPLETE");
    expect(result.coverageStatus).toBe("INSUFFICIENT_COVERAGE");
    expect(result.samples.every((sample) => sample.status === "OK")).toBe(true);
    expect(result).not.toHaveProperty("weatherScore");
  });

  it("makes no weather requests when annotation timing is only an unapproved estimate", async () => {
    const route = normalizeEvaluationRoute({ code: "Ok", waypoints: [
      { location: [98, 18], distance: 0 }, { location: [98.1, 18.1], distance: 0 },
    ], routes: [{ distance: 22_000, duration: 7_200, geometry: {
      type: "LineString", coordinates: [[98, 18], [98.1, 18], [98.1, 18.1]],
    }, legs: [{ annotation: { duration: [7_200], distance: [22_000] } }] }] },
    { origin: { lat: 18, lng: 98 }, destination: { lat: 18.1, lng: 98.1 } });
    const plan = buildRouteSamplingPlan(route, new Date("2026-10-17T10:00:00Z"));
    const requestForecast = vi.fn();
    const result = await fetchWeatherForRoutePlan(plan, { requestForecast });
    expect(result).toMatchObject({ status: "INCOMPLETE", coverageStatus: "TIMING_UNAVAILABLE", samples: [] });
    expect(requestForecast).not.toHaveBeenCalled();
    const approvedPlan = buildRouteSamplingPlan(route, new Date("2026-10-17T10:30:00Z"),
      { allowEstimatedPassageTime: true });
    requestForecast.mockImplementation(async ({ to }: { to: Date }) => ({
      rows: [0, 1].map((offset) => ({
        endAt: new Date(Math.floor(to.getTime() / 3_600_000) * 3_600_000 + offset * 3_600_000),
        precipitationMm: 0, windGustKmh: 0, weatherCode: 0 })),
      provenance: { provider: "OPEN_METEO", timezone: "GMT", modelRunAt: null, fetchedAt: now },
    }));
    const estimated = await fetchWeatherForRoutePlan(approvedPlan, { requestForecast });
    expect(estimated.status).toBe("INCOMPLETE");
    expect(estimated.samples.every((sample) => sample.status === "OK")).toBe(true);
    expect(approvedPlan.timingMethod).toBe("GEOMETRY_DISTANCE_ESTIMATE");
  });

  it("does not reuse a preceding-hour bin at its right boundary", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(providerResponse), { status: 200 })));
    const forecast = await fetchOpenMeteoHourlyForecast(input);
    expect(alignHourlyForecast(forecast, new Date("2026-10-17T11:00:00Z")))
      .toMatchObject({ precipitationMm: 2.5, accumulationEndAt: new Date("2026-10-17T12:00:00Z") });
    expect(alignHourlyForecast(forecast, new Date("2026-10-17T12:00:00Z")))
      .toMatchObject({ status: "MISSING_DATA", accumulationEndAt: null });
  });

  it("reads route sample coordinates sequentially without assigning weather scores", async () => {
    const requestForecast = vi.fn().mockResolvedValue({
      ...providerResponse, rows: [{ endAt: new Date("2026-10-17T12:00:00Z"),
        precipitationMm: 2.5, windGustKmh: 6, weatherCode: 63 }],
      provenance: { provider: "OPEN_METEO", timezone: "GMT", modelRunAt: null, fetchedAt: now },
    });
    const samples = [
      { lat: 18.8, lng: 98.9, passageAt: input.from },
      { lat: 18.9, lng: 99, passageAt: input.from },
    ];
    const results = await fetchWeatherForRouteSamples(samples, { now, requestForecast });
    expect(requestForecast).toHaveBeenCalledTimes(2);
    expect(requestForecast.mock.calls[1][0]).toMatchObject({ latitude: 18.9, longitude: 99 });
    expect(results).toHaveLength(2);
    expect(results[0]).not.toHaveProperty("score");
  });

  it("stops further public requests after a provider failure", async () => {
    const requestForecast = vi.fn().mockRejectedValue(new HourlyWeatherError("RATE_LIMITED"));
    const samples = Array.from({ length: 3 }, (_, index) => ({
      lat: 18.8 + index * 0.01, lng: 98.9, passageAt: input.from,
    }));
    expect((await fetchWeatherForRouteSamples(samples, { now, requestForecast })).map((sample) => sample.status))
      .toEqual(["UNAVAILABLE", "NOT_REQUESTED", "NOT_REQUESTED"]);
    expect(requestForecast).toHaveBeenCalledTimes(1);
  });

  it("caps public route-weather calls and respects an already aborted signal", async () => {
    const samples = Array.from({ length: 6 }, () => ({ lat: 18.8, lng: 98.9, passageAt: input.from }));
    await expect(fetchWeatherForRouteSamples(samples)).rejects.toThrow();
    const controller = new AbortController(); controller.abort();
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(fetchOpenMeteoHourlyForecast({ ...input, signal: controller.signal }))
      .rejects.toMatchObject({ code: "UPSTREAM_TIMEOUT" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
