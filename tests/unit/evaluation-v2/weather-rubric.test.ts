import { describe, expect, it } from "vitest";

import { scoreWeatherPoint, codeImpact, gustImpact, rainImpact, WEATHER_RUBRIC_VERSION }
  from "@/lib/evaluation-v2/weather-rubric";
import type { AlignedHourlyWeather } from "@/lib/integrations/open-meteo/open-meteo-hourly-service";

const at = new Date("2026-10-17T08:30:00Z");
function weather(precipitationMm: number | null, windGustKmh: number | null,
  weatherCode: number | null): AlignedHourlyWeather {
  return { status: precipitationMm !== null && windGustKmh !== null && weatherCode !== null ? "OK" : "MISSING_DATA",
    precipitationMm, windGustKmh, weatherCode, accumulationEndAt: new Date("2026-10-17T09:00:00Z"),
    weatherCodeAt: new Date("2026-10-17T09:00:00Z"), missingReasons: [],
    provenance: { provider: "OPEN_METEO", timezone: "GMT", modelRunAt: null,
      fetchedAt: new Date("2026-10-17T08:00:00Z"), gridLatitude: 18, gridLongitude: 98,
      requestedLatitude: 18, requestedLongitude: 98 } };
}
const score = (value: AlignedHourlyWeather | null) =>
  scoreWeatherPoint({ at, latitude: 18, longitude: 98, weather: value });

describe("Evaluation V2 candidate weather rubric", () => {
  it.each([[0, 0], [2.499, 1], [2.5, 2], [9.999, 2], [10, 3], [25.1, 3], [50.1, 3]])
  ("maps hourly rain %s to candidate level %s", (value, level) => {
    expect(rainImpact(value)).toBe(level);
    expect(score(weather(value, 0, 0)).level).toBe(level);
  });

  it.each([[55.999, 0], [56, 1], [71.999, 1], [72, 2], [92.999, 2], [93, 3]])
  ("maps gust %s to candidate level %s", (value, level) => {
    expect(gustImpact(value)).toBe(level);
    expect(score(weather(0, value, 0)).level).toBe(level);
  });

  it("maps every supported code group and leaves fog, freezing and unknown codes UNKNOWN", () => {
    for (const code of [0, 1, 2, 3]) expect(codeImpact(code)).toBe(0);
    for (const code of [51, 53, 55, 61, 80]) expect(codeImpact(code)).toBe(1);
    for (const code of [63, 81]) expect(codeImpact(code)).toBe(2);
    for (const code of [65, 82, 95, 96, 97, 99]) expect(codeImpact(code)).toBe(3);
    for (const code of [45, 48, 66, 67, 71, 72, 73, 74, 75, 76, 77, 85, 86, 98]) {
      expect(score(weather(0, 0, code))).toMatchObject({ status: "UNKNOWN", level: null, score: null });
    }
  });

  it("uses max without double-counting and records contradictory code evidence", () => {
    const result = score(weather(1, 72, 95));
    expect(result).toMatchObject({ rubricVersion: WEATHER_RUBRIC_VERSION, level: 3, score: 0,
      factors: { rain: 1, gust: 2, code: 3 }, drivers: ["code"], dataConflict: true,
      officialWarning: null, blockingConstraint: null });
    expect(result.hazards.map((hazard) => hazard.kind)).toEqual(["THUNDERSTORM_CODE"]);
  });

  it("keeps forecast hazards when necessary weather data are missing", () => {
    const result = score(weather(50.1, null, 97));
    expect(result).toMatchObject({ status: "UNKNOWN", score: null });
    expect(result.hazards.map((hazard) => hazard.kind))
      .toEqual(["THUNDERSTORM_CODE", "VERY_HEAVY_HOURLY_RAIN"]);
    expect(score(weather(25.1, 93, 0)).hazards.map((hazard) => hazard.kind))
      .toEqual(["HEAVY_HOURLY_RAIN", "HIGH_GUST"]);
    expect(score(weather(25, 92.999, 0)).hazards).toEqual([]);
  });

  it("requires aligned timestamps and the correct requested location", () => {
    expect(score({ ...weather(0, 0, 0), accumulationEndAt: new Date("2026-10-17T08:00:00Z") }))
      .toMatchObject({ status: "UNKNOWN", score: null });
    expect(score({ ...weather(0, 0, 0), provenance: { ...weather(0, 0, 0).provenance,
      requestedLatitude: 19 } })).toMatchObject({ status: "UNKNOWN", score: null });
    expect(score(null)).toMatchObject({ status: "UNKNOWN", score: null });
  });
});
