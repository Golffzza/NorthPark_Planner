import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OpenMeteoServiceError,
  fetchOpenMeteoWeatherSnapshot,
} from "@/lib/integrations/open-meteo/open-meteo-service";

describe("fetchOpenMeteoWeatherSnapshot", () => {
  beforeEach(() => {
    process.env.OPEN_METEO_BASE_URL = "https://api.open-meteo.com";
    process.env.APP_TIMEZONE = "Asia/Bangkok";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes the Open-Meteo daily forecast into a snapshot-ready shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          daily: {
            time: ["2026-06-12"],
            weather_code: [63],
            precipitation_sum: [4.5],
            temperature_2m_max: [27.4],
            wind_speed_10m_max: [18.2],
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await fetchOpenMeteoWeatherSnapshot({
      latitude: 18.5897,
      longitude: 98.4875,
      tripDate: new Date("2026-06-12T00:00:00.000Z"),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://api.open-meteo.com/v1/forecast?"),
      expect.objectContaining({
        headers: {
          accept: "application/json",
        },
      }),
    );
    expect(snapshot).toMatchObject({
      source: "OPEN_METEO",
      weatherCode: 63,
      precipitationMm: 4.5,
      weatherCondition: "LIGHT_RAIN",
      temperatureC: 27.4,
      windSpeedKmh: 18.2,
      timezone: "Asia/Bangkok",
    });
    expect(snapshot.forecastAt).toBeInstanceOf(Date);
  });

  it("throws an upstream error when Open-Meteo responds with a failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ reason: "unavailable" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(
      fetchOpenMeteoWeatherSnapshot({
        latitude: 18.5897,
        longitude: 98.4875,
        tripDate: new Date("2026-06-12T00:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(OpenMeteoServiceError);
  });
});
