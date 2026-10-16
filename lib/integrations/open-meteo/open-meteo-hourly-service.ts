/** E2-only hourly forecast transport. It never maps weather to a score. */
export type HourlyWeatherRow = {
  endAt: Date; // precipitation and gust cover [endAt - 1 hour, endAt)
  precipitationMm: number | null;
  windGustKmh: number | null;
  weatherCode: number | null; // instantaneous at endAt
};
export type HourlyForecast = {
  rows: HourlyWeatherRow[];
  coverage: { firstAccumulationStartAt: Date; lastTimestampAt: Date;
    requestedFrom: Date | null; requestedTo: Date | null };
  provenance: {
    provider: "OPEN_METEO";
    timezone: "GMT";
    modelRunAt: null; // Forecast API does not provide a per-row model run timestamp.
    fetchedAt: Date;
    gridLatitude: number;
    gridLongitude: number;
    requestedLatitude: number | null;
    requestedLongitude: number | null;
  };
};
export type HourlyForecastRequest = {
  latitude: number; longitude: number; from: Date; to: Date; now?: Date; signal?: AbortSignal;
};
export type HourlyWeatherErrorCode = "INVALID_INPUT" | "OUTSIDE_FORECAST_WINDOW" | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_UNAVAILABLE" | "RATE_LIMITED" | "INVALID_RESPONSE" | "LOCATION_MAPPING_AMBIGUOUS";

export class HourlyWeatherError extends Error {
  constructor(readonly code: HourlyWeatherErrorCode) {
    super(`Open-Meteo hourly forecast: ${code}`);
    this.name = "HourlyWeatherError";
  }
}

function validCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function parseUtcHour(value: unknown): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00$/.test(value)) {
    throw new HourlyWeatherError("INVALID_RESPONSE");
  }
  const date = new Date(`${value}:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 16) !== value) {
    throw new HourlyWeatherError("INVALID_RESPONSE");
  }
  return date;
}

function nullableNonnegative(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new HourlyWeatherError("INVALID_RESPONSE");
  }
  return value;
}

function nullableCode(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 99) {
    throw new HourlyWeatherError("INVALID_RESPONSE");
  }
  return value;
}

export function normalizeOpenMeteoHourlyResponse(raw: unknown, fetchedAt: Date,
  request?: Pick<HourlyForecastRequest, "latitude" | "longitude" | "from" | "to">): HourlyForecast {
  const data = raw as { timezone?: unknown; utc_offset_seconds?: unknown; latitude?: unknown; longitude?: unknown;
    hourly_units?: { precipitation?: unknown; wind_gusts_10m?: unknown; weather_code?: unknown };
    hourly?: { time?: unknown; precipitation?: unknown; wind_gusts_10m?: unknown; weather_code?: unknown } } | null;
  const hourly = data?.hourly;
  if (!data || !["GMT", "UTC"].includes(data.timezone as string) || data.utc_offset_seconds !== 0
    || !validCoordinate(data.latitude as number, data.longitude as number)
    || data.hourly_units?.precipitation !== "mm" || data.hourly_units?.wind_gusts_10m !== "km/h"
    || data.hourly_units?.weather_code !== "wmo code" || !hourly
    || !Array.isArray(hourly.time) || !Array.isArray(hourly.precipitation)
    || !Array.isArray(hourly.wind_gusts_10m) || !Array.isArray(hourly.weather_code)
    || hourly.time.length === 0 || hourly.time.length !== hourly.precipitation.length
    || hourly.time.length !== hourly.wind_gusts_10m.length || hourly.time.length !== hourly.weather_code.length) {
    throw new HourlyWeatherError("INVALID_RESPONSE");
  }
  const rows: HourlyWeatherRow[] = hourly.time.map((value, index) => ({
    endAt: parseUtcHour(value), precipitationMm: nullableNonnegative((hourly.precipitation as unknown[])[index]),
    windGustKmh: nullableNonnegative((hourly.wind_gusts_10m as unknown[])[index]),
    weatherCode: nullableCode((hourly.weather_code as unknown[])[index]),
  }));
  if (rows.some((row, index) => index > 0 && row.endAt.getTime() - rows[index - 1].endAt.getTime() !== 3_600_000)) {
    throw new HourlyWeatherError("INVALID_RESPONSE");
  }
  return { rows, coverage: { firstAccumulationStartAt: new Date(rows[0].endAt.getTime() - 3_600_000),
    lastTimestampAt: rows[rows.length - 1].endAt,
    requestedFrom: request ? new Date(request.from) : null, requestedTo: request ? new Date(request.to) : null },
    provenance: { provider: "OPEN_METEO", timezone: "GMT", modelRunAt: null,
      fetchedAt: new Date(fetchedAt), gridLatitude: data.latitude as number,
      gridLongitude: data.longitude as number, requestedLatitude: request?.latitude ?? null,
      requestedLongitude: request?.longitude ?? null } };
}

export type HourlyMissingReason = "ACCUMULATION_HOUR_MISSING" | "PRECIPITATION_MISSING"
  | "WIND_GUST_MISSING" | "WEATHER_CODE_HOUR_MISSING" | "WEATHER_CODE_MISSING";
export type AlignedHourlyWeather = {
  status: "OK" | "MISSING_DATA";
  precipitationMm: number | null;
  windGustKmh: number | null;
  weatherCode: number | null;
  accumulationEndAt: Date | null;
  weatherCodeAt: Date | null;
  missingReasons: HourlyMissingReason[];
  provenance: HourlyForecast["provenance"];
};

export function alignHourlyForecast(forecast: HourlyForecast, at: Date): AlignedHourlyWeather {
  if (!Number.isFinite(at.getTime())) throw new HourlyWeatherError("INVALID_INPUT");
  const accumulationHour = Math.floor(at.getTime() / 3_600_000) * 3_600_000 + 3_600_000;
  const accumulation = forecast.rows.find((row) => row.endAt.getTime() === accumulationHour);
  const nearest = [...forecast.rows].sort((a, b) =>
    Math.abs(a.endAt.getTime() - at.getTime()) - Math.abs(b.endAt.getTime() - at.getTime())
    || b.endAt.getTime() - a.endAt.getTime())[0];
  const code = nearest && Math.abs(nearest.endAt.getTime() - at.getTime()) <= 30 * 60_000 ? nearest.weatherCode : null;
  const precipitationMm = accumulation?.precipitationMm ?? null;
  const windGustKmh = accumulation?.windGustKmh ?? null;
  const missingReasons: HourlyMissingReason[] = [];
  if (!accumulation) missingReasons.push("ACCUMULATION_HOUR_MISSING");
  else {
    if (precipitationMm === null) missingReasons.push("PRECIPITATION_MISSING");
    if (windGustKmh === null) missingReasons.push("WIND_GUST_MISSING");
  }
  if (!nearest || Math.abs(nearest.endAt.getTime() - at.getTime()) > 30 * 60_000) {
    missingReasons.push("WEATHER_CODE_HOUR_MISSING");
  } else if (code === null) missingReasons.push("WEATHER_CODE_MISSING");
  return { status: precipitationMm !== null && windGustKmh !== null && code !== null ? "OK" : "MISSING_DATA",
    precipitationMm, windGustKmh, weatherCode: code, accumulationEndAt: accumulation?.endAt ?? null,
    weatherCodeAt: code !== null ? nearest.endAt : null, missingReasons, provenance: forecast.provenance };
}

export async function fetchOpenMeteoHourlyForecast(input: HourlyForecastRequest): Promise<HourlyForecast> {
  const now = input.now ?? new Date();
  if (!validCoordinate(input.latitude, input.longitude) || !Number.isFinite(input.from?.getTime())
    || !Number.isFinite(input.to?.getTime()) || !Number.isFinite(now.getTime()) || input.to < input.from) {
    throw new HourlyWeatherError("INVALID_INPUT");
  }
  const todayUtc = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const lastDay = todayUtc + 15 * 86_400_000;
  const requiredStartHour = Math.floor(input.from.getTime() / 3_600_000) * 3_600_000 + 3_600_000;
  const requiredEndHour = Math.floor(input.to.getTime() / 3_600_000) * 3_600_000 + 3_600_000;
  if (input.from < now || requiredEndHour >= lastDay + 86_400_000) {
    throw new HourlyWeatherError("OUTSIDE_FORECAST_WINDOW");
  }
  const base = (process.env.OPEN_METEO_BASE_URL || "https://api.open-meteo.com").replace(/\/+$/, "");
  const url = new URL("/v1/forecast", base);
  url.searchParams.set("latitude", String(input.latitude));
  url.searchParams.set("longitude", String(input.longitude));
  url.searchParams.set("hourly", "precipitation,wind_gusts_10m,weather_code");
  url.searchParams.set("timezone", "GMT");
  url.searchParams.set("precipitation_unit", "mm");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("start_date", input.from.toISOString().slice(0, 10));
  url.searchParams.set("end_date", new Date(requiredEndHour).toISOString().slice(0, 10));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  const onAbort = () => controller.abort();
  input.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    if (input.signal?.aborted) throw new HourlyWeatherError("UPSTREAM_TIMEOUT");
    const response = await fetch(url.toString(), { method: "GET", cache: "no-store", signal: controller.signal,
      headers: { accept: "application/json" } });
    if (response.status === 429) throw new HourlyWeatherError("RATE_LIMITED");
    if (!response.ok) throw new HourlyWeatherError("UPSTREAM_UNAVAILABLE");
    const forecast = normalizeOpenMeteoHourlyResponse(await response.json(), new Date(), input);
    if (forecast.rows[0].endAt.getTime() > requiredStartHour
      || forecast.rows[forecast.rows.length - 1].endAt.getTime() < requiredEndHour) {
      throw new HourlyWeatherError("INVALID_RESPONSE");
    }
    return forecast;
  } catch (error) {
    if (error instanceof HourlyWeatherError) throw error;
    throw new HourlyWeatherError(controller.signal.aborted ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE");
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", onAbort);
  }
}

export type HourlyBatchPoint = { latitude: number; longitude: number; at: Date };
export type HourlyBatchResult = { status: "OK" | "UNAVAILABLE"; forecast: HourlyForecast | null;
  errorCode?: HourlyWeatherErrorCode; point: HourlyBatchPoint; index: number };
export const MAX_HOURLY_BATCH_COORDINATES = 5;

function gridDistanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const radians = Math.PI / 180;
  const deltaLat = (b.latitude - a.latitude) * radians;
  const deltaLng = (b.longitude - a.longitude) * radians;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(a.latitude * radians)
    * Math.cos(b.latitude * radians) * Math.sin(deltaLng / 2) ** 2;
  return 12_742_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** A bounded logical batch. Each unique coordinate gets its own HTTP request: JSON has no location ID. */
export async function fetchOpenMeteoHourlyBatch(points: readonly HourlyBatchPoint[], options: {
  now?: Date; signal?: AbortSignal;
} = {}): Promise<{ results: HourlyBatchResult[]; httpRequests: number; uniqueCoordinates: number }> {
  const now = options.now ?? new Date();
  if (points.length < 1 || points.length > MAX_HOURLY_BATCH_COORDINATES || !Number.isFinite(now.getTime())
    || points.some((point) => !validCoordinate(point.latitude, point.longitude)
      || !Number.isFinite(point.at?.getTime()) || point.at < now)) {
    throw new HourlyWeatherError("INVALID_INPUT");
  }
  const lastDayEnd = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`) + 16 * 86_400_000;
  const endHour = (at: Date) => Math.floor(at.getTime() / 3_600_000) * 3_600_000 + 3_600_000;
  if (points.some((point) => endHour(point.at) >= lastDayEnd)) {
    throw new HourlyWeatherError("OUTSIDE_FORECAST_WINDOW");
  }
  const unique: Array<{ latitude: number; longitude: number; indices: number[] }> = [];
  points.forEach((point, index) => {
    const entry = unique.find((item) => item.latitude === point.latitude && item.longitude === point.longitude);
    if (entry) entry.indices.push(index);
    else unique.push({ latitude: point.latitude, longitude: point.longitude, indices: [index] });
  });
  const base = (process.env.OPEN_METEO_BASE_URL || "https://api.open-meteo.com").replace(/\/+$/, "");
  const results: HourlyBatchResult[] = new Array(points.length);
  let httpRequests = 0;
  let rateLimited = false;
  for (const entry of unique) {
    let forecast: HourlyForecast | null = null;
    let errorCode: HourlyWeatherErrorCode | undefined;
    if (rateLimited) errorCode = "RATE_LIMITED";
    else if (options.signal?.aborted) errorCode = "UPSTREAM_TIMEOUT";
    else {
      const firstAt = new Date(Math.min(...entry.indices.map((index) => points[index].at.getTime())));
      const lastAt = new Date(Math.max(...entry.indices.map((index) => points[index].at.getTime())));
      const url = new URL("/v1/forecast", base);
      url.searchParams.set("latitude", String(entry.latitude));
      url.searchParams.set("longitude", String(entry.longitude));
      url.searchParams.set("hourly", "precipitation,wind_gusts_10m,weather_code");
      url.searchParams.set("timezone", "GMT");
      url.searchParams.set("precipitation_unit", "mm");
      url.searchParams.set("wind_speed_unit", "kmh");
      url.searchParams.set("start_date", firstAt.toISOString().slice(0, 10));
      url.searchParams.set("end_date", new Date(endHour(lastAt)).toISOString().slice(0, 10));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6_000);
      const onAbort = () => controller.abort();
      options.signal?.addEventListener("abort", onAbort, { once: true });
      try {
        httpRequests += 1;
        const response = await fetch(url.toString(), { method: "GET", cache: "no-store",
          signal: controller.signal, headers: { accept: "application/json" } });
        if (response.status === 429) { errorCode = "RATE_LIMITED"; rateLimited = true; }
        else if (!response.ok) errorCode = "UPSTREAM_UNAVAILABLE";
        else {
          const raw = await response.json() as unknown;
          // One requested location must produce one object. Arrays cannot prove identity here.
          if (Array.isArray(raw)) throw new HourlyWeatherError("INVALID_RESPONSE");
          forecast = normalizeOpenMeteoHourlyResponse(raw, new Date(), {
            latitude: entry.latitude, longitude: entry.longitude, from: firstAt, to: lastAt,
          });
          // Plausibility check only; single-request isolation establishes attribution.
          const grid = { latitude: forecast.provenance.gridLatitude,
            longitude: forecast.provenance.gridLongitude };
          const ownDistance = gridDistanceMeters(entry, grid);
          if (unique.some((other) => other !== entry && gridDistanceMeters(other, grid) + 1 < ownDistance)) {
            throw new HourlyWeatherError("LOCATION_MAPPING_AMBIGUOUS");
          }
          if (ownDistance > 25_000
            || forecast.rows[0].endAt.getTime() > endHour(firstAt)
            || forecast.rows[forecast.rows.length - 1].endAt.getTime() < endHour(lastAt)) {
            throw new HourlyWeatherError("INVALID_RESPONSE");
          }
        }
      } catch (error) {
        forecast = null;
        errorCode = error instanceof HourlyWeatherError ? error.code
          : controller.signal.aborted ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE";
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", onAbort);
      }
    }
    entry.indices.forEach((index) => { results[index] = forecast
      ? { status: "OK", forecast, point: points[index], index }
      : { status: "UNAVAILABLE", forecast: null, errorCode, point: points[index], index }; });
  }
  return { results, httpRequests, uniqueCoordinates: unique.length };
}
