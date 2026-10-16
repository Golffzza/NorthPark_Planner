import type { AlignedHourlyWeather } from "@/lib/integrations/open-meteo/open-meteo-hourly-service";

/** Experimental E1.1 candidate. This module is not connected to production evaluation. */
export const WEATHER_RUBRIC_VERSION = "E1.1-CANDIDATE-2026-10-17";
export type ImpactLevel = 0 | 1 | 2 | 3;
export type ForecastHazard = {
  kind: "THUNDERSTORM_CODE" | "HEAVY_HOURLY_RAIN" | "VERY_HEAVY_HOURLY_RAIN" | "HIGH_GUST";
  value: number;
  unit: "wmo code" | "mm/hourly bin" | "km/h";
  at: Date;
  latitude: number;
  longitude: number;
  source: "OPEN_METEO_FORECAST";
  evidenceAt: Date | null;
  fetchedAt: Date | null;
  gridLatitude: number | null;
  gridLongitude: number | null;
  rubricVersion: typeof WEATHER_RUBRIC_VERSION;
};
export type WeatherPointScore = {
  status: "KNOWN" | "UNKNOWN";
  level: ImpactLevel | null;
  score: number | null;
  factors: { rain: ImpactLevel | null; gust: ImpactLevel | null; code: ImpactLevel | null };
  drivers: Array<"rain" | "gust" | "code">;
  missingReasons: string[];
  dataConflict: boolean;
  hazards: ForecastHazard[];
  officialWarning: null;
  blockingConstraint: null;
  rubricVersion: typeof WEATHER_RUBRIC_VERSION;
  at: Date;
  latitude: number;
  longitude: number;
  source: { precipitationMm: number | null; windGustKmh: number | null; weatherCode: number | null;
    precipitationUnit: "mm/hourly bin"; gustUnit: "km/h"; accumulationEndAt: Date | null;
    weatherCodeAt: Date | null; provenance: AlignedHourlyWeather["provenance"] | null };
};

const CODE_LEVELS = new Map<number, ImpactLevel>([
  [0, 0], [1, 0], [2, 0], [3, 0],
  [51, 1], [53, 1], [55, 1], [61, 1], [80, 1],
  [63, 2], [81, 2],
  [65, 3], [82, 3], [95, 3], [96, 3], [97, 3], [99, 3],
]);

export function rainImpact(value: number): ImpactLevel | null {
  if (!Number.isFinite(value) || value < 0) return null;
  return value === 0 ? 0 : value < 2.5 ? 1 : value < 10 ? 2 : 3;
}
export function gustImpact(value: number): ImpactLevel | null {
  if (!Number.isFinite(value) || value < 0) return null;
  return value < 56 ? 0 : value < 72 ? 1 : value < 93 ? 2 : 3;
}
export function codeImpact(value: number): ImpactLevel | null {
  return CODE_LEVELS.get(value) ?? null;
}

export function scoreWeatherPoint(input: { at: Date; latitude: number; longitude: number;
  weather: AlignedHourlyWeather | null }): WeatherPointScore {
  const { at, latitude, longitude, weather } = input;
  const precipitationMm = weather?.precipitationMm ?? null;
  const windGustKmh = weather?.windGustKmh ?? null;
  const weatherCode = weather?.weatherCode ?? null;
  const validLocation = Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && Number.isFinite(longitude) && Math.abs(longitude) <= 180 && Number.isFinite(at.getTime());
  const hazards: ForecastHazard[] = [];
  const flag = (kind: ForecastHazard["kind"], value: number, unit: ForecastHazard["unit"]) =>
    hazards.push({ kind, value, unit, at, latitude, longitude, source: "OPEN_METEO_FORECAST",
      evidenceAt: kind === "THUNDERSTORM_CODE" ? weather?.weatherCodeAt ?? null
        : weather?.accumulationEndAt ?? null,
      fetchedAt: weather?.provenance.fetchedAt ?? null,
      gridLatitude: weather?.provenance.gridLatitude ?? null,
      gridLongitude: weather?.provenance.gridLongitude ?? null,
      rubricVersion: WEATHER_RUBRIC_VERSION });
  if (validLocation && weatherCode !== null && [95, 96, 97, 99].includes(weatherCode)) {
    flag("THUNDERSTORM_CODE", weatherCode, "wmo code");
  }
  if (validLocation && precipitationMm !== null && Number.isFinite(precipitationMm) && precipitationMm >= 50.1) {
    flag("VERY_HEAVY_HOURLY_RAIN", precipitationMm, "mm/hourly bin");
  } else if (validLocation && precipitationMm !== null && Number.isFinite(precipitationMm) && precipitationMm >= 25.1) {
    flag("HEAVY_HOURLY_RAIN", precipitationMm, "mm/hourly bin");
  }
  if (validLocation && windGustKmh !== null && Number.isFinite(windGustKmh) && windGustKmh >= 93) {
    flag("HIGH_GUST", windGustKmh, "km/h");
  }

  const validRain = precipitationMm !== null && Number.isFinite(precipitationMm) && precipitationMm >= 0;
  const validGust = windGustKmh !== null && Number.isFinite(windGustKmh) && windGustKmh >= 0;
  const rain = validRain ? rainImpact(precipitationMm) : null;
  const gust = validGust ? gustImpact(windGustKmh) : null;
  const code = weatherCode === null ? null : codeImpact(weatherCode);
  const missingReasons: string[] = [...(weather?.missingReasons ?? [])];
  if (!weather) missingReasons.push("FORECAST_UNAVAILABLE");
  else if (weather.status !== "OK") missingReasons.push("PROVIDER_MARKED_INCOMPLETE");
  if (!validLocation) missingReasons.push("INVALID_LOCATION_OR_TIME");
  const requestedLatitude = weather?.provenance.requestedLatitude;
  const requestedLongitude = weather?.provenance.requestedLongitude;
  if (weather && (requestedLatitude == null || requestedLongitude == null)) {
    missingReasons.push("LOCATION_PROVENANCE_MISSING");
  } else if (requestedLatitude != null && requestedLongitude != null
    && (Math.abs(requestedLatitude - latitude) > 1e-6
    || Math.abs(requestedLongitude - longitude) > 1e-6)) {
    missingReasons.push("LOCATION_PROVENANCE_MISMATCH");
  }
  if (!validRain && !missingReasons.includes("PRECIPITATION_MISSING")) missingReasons.push("PRECIPITATION_MISSING");
  if (!validGust && !missingReasons.includes("WIND_GUST_MISSING")) missingReasons.push("WIND_GUST_MISSING");
  if (weatherCode === null && !missingReasons.includes("WEATHER_CODE_MISSING")) missingReasons.push("WEATHER_CODE_MISSING");
  else if (weatherCode !== null && code === null) missingReasons.push("UNSUPPORTED_WEATHER_CODE");
  const expectedHour = Number.isFinite(at.getTime())
    ? Math.floor(at.getTime() / 3_600_000) * 3_600_000 + 3_600_000 : NaN;
  if (weather && weather.accumulationEndAt?.getTime() !== expectedHour) missingReasons.push("ACCUMULATION_TIME_MISMATCH");
  if (weather && (weather.weatherCodeAt === null
    || Math.abs(weather.weatherCodeAt.getTime() - at.getTime()) > 30 * 60_000)) {
    missingReasons.push("WEATHER_CODE_TIME_MISMATCH");
  }
  const level = missingReasons.length === 0 && rain !== null && gust !== null && code !== null
    ? Math.max(rain, gust, code) as ImpactLevel : null;
  const factors = { rain, gust, code };
  const drivers = level === null ? [] : (Object.entries(factors) as Array<[keyof typeof factors, ImpactLevel | null]>)
    .filter(([, value]) => value === level).map(([kind]) => kind);
  return { status: level === null ? "UNKNOWN" : "KNOWN", level,
    score: level === null ? null : 100 * (1 - level / 3), factors, drivers,
    missingReasons: [...new Set(missingReasons)],
    dataConflict: code !== null && code >= 2 && precipitationMm !== null && precipitationMm < 2.5,
    hazards, officialWarning: null, blockingConstraint: null,
    rubricVersion: WEATHER_RUBRIC_VERSION, at, latitude, longitude,
    source: { precipitationMm, windGustKmh, weatherCode, precipitationUnit: "mm/hourly bin", gustUnit: "km/h",
      accumulationEndAt: weather?.accumulationEndAt ?? null, weatherCodeAt: weather?.weatherCodeAt ?? null,
      provenance: weather?.provenance ?? null } };
}
