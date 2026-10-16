import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchOpenMeteoHourlyBatch } from "@/lib/integrations/open-meteo/open-meteo-hourly-service";

const now = new Date("2026-10-17T08:00:00Z");
const points = [
  { latitude: 18, longitude: 98, at: new Date("2026-10-17T08:30:00Z") },
  { latitude: 19, longitude: 99, at: new Date("2026-10-17T09:30:00Z") },
];
function response(latitude: number, longitude: number) {
  return { timezone: "GMT", utc_offset_seconds: 0, latitude, longitude,
    hourly_units: { precipitation: "mm", wind_gusts_10m: "km/h", weather_code: "wmo code" },
    hourly: { time: ["2026-10-17T08:00", "2026-10-17T09:00", "2026-10-17T10:00"],
      precipitation: [0, 1, 2], wind_gusts_10m: [4, 5, 6], weather_code: [0, 1, 2] } };
}

describe("Open-Meteo bounded multi-coordinate forecast", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses one request per unique coordinate so JSON array order cannot claim identity", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const query = new URL(url).searchParams;
      return new Response(JSON.stringify(response(Number(query.get("latitude")),
        Number(query.get("longitude")))), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const batch = await fetchOpenMeteoHourlyBatch(points, { now });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("latitude")).toBe("18");
    expect(url.searchParams.get("longitude")).toBe("98");
    expect(batch).toMatchObject({ httpRequests: 2, uniqueCoordinates: 2 });
    expect(batch.results.map((result) => result.status)).toEqual(["OK", "OK"]);
    expect(batch.results[1].forecast?.provenance.requestedLatitude).toBe(19);
  });

  it("deduplicates identical coordinates and rejects swapped nearby grids and unexpected arrays", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response(18, 98)), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const duplicate = await fetchOpenMeteoHourlyBatch([points[0], { ...points[0], at: points[1].at }], { now });
    expect(duplicate).toMatchObject({ httpRequests: 1, uniqueCoordinates: 1 });
    expect(duplicate.results.map((result) => result.status)).toEqual(["OK", "OK"]);
    const nearby = [points[0], { ...points[0], latitude: 18.01 }];
    const swapped = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(response(18.01, 98)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(response(18, 98)), { status: 200 }));
    vi.stubGlobal("fetch", swapped);
    const ambiguous = await fetchOpenMeteoHourlyBatch(nearby, { now });
    expect(ambiguous.results.map((result) => result.status)).toEqual(["UNAVAILABLE", "UNAVAILABLE"]);
    expect(ambiguous.results.map((result) => result.errorCode))
      .toEqual(["LOCATION_MAPPING_AMBIGUOUS", "LOCATION_MAPPING_AMBIGUOUS"]);
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify([response(18, 98)]),
      { status: 200 })));
    expect((await fetchOpenMeteoHourlyBatch(points, { now })).results.map((result) => result.errorCode))
      .toEqual(["INVALID_RESPONSE", "INVALID_RESPONSE"]);
  });

  it("isolates one malformed entry and distinguishes rate limit and invalid input", async () => {
    const partial = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(response(18, 98)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...response(19, 99), hourly: null }), { status: 200 }));
    vi.stubGlobal("fetch", partial);
    expect((await fetchOpenMeteoHourlyBatch(points, { now })).results.map((result) => result.status))
      .toEqual(["OK", "UNAVAILABLE"]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("quota", { status: 429 })));
    expect((await fetchOpenMeteoHourlyBatch(points, { now })).results.map((result) => result.errorCode))
      .toEqual(["RATE_LIMITED", "RATE_LIMITED"]);
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(fetchOpenMeteoHourlyBatch(Array(6).fill(points[0]), { now }))
      .rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});
