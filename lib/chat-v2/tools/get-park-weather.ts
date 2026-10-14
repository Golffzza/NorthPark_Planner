import { z } from "zod";

import {
  OpenMeteoForecastNotAvailableYetError,
  OpenMeteoPastDateError,
  fetchOpenMeteoWeatherSnapshot,
} from "@/lib/integrations/open-meteo/open-meteo-service";
import { getParkDetail, NotFoundError } from "@/lib/services/park-service";

export const getParkWeatherInputSchema = z.object({
  forecastDate: z.string().trim().optional()
    .describe("Forecast date in YYYY-MM-DD; omit for today's daily forecast"),
});

// These DB coordinates conflict with the effective seed and are already blocked
// for location-based Nearby requests. Do not use them for weather lookups.
const COORDINATE_REVIEW_SLUGS = new Set([
  "namtok-pha-charoen", "nanthaburi", "ramkhamhaeng", "si-satchanalai",
]);
const PROVIDER_TIMEOUT_MS = 12_000;
const TIMEZONE = "Asia/Bangkok";

type WeatherDependencies = {
  readPark?: typeof getParkDetail;
  fetchForecast?: typeof fetchOpenMeteoWeatherSnapshot;
  now?: () => Date;
  timeoutMs?: number;
};

export function asksForHistoricalWeather(message: string): boolean {
  return /(?:ย้อนหลัง|เมื่อวาน|เมื่อ.{0,30}(?:ที่แล้ว|ก่อน)|เดือนก่อน|ปีที่แล้ว|ครั้งก่อน|ทริป(?:ที่ไป|เก่า|ก่อน)|ก่อนหน้านี้|ที่ผ่านมา|snapshot|สแนปช็อต)/i.test(message);
}

function dateInBangkok(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function executeGetParkWeather(
  parkSlug: string,
  input: z.infer<typeof getParkWeatherInputSchema>,
  currentMessage: string,
  signal?: AbortSignal,
  dependencies: WeatherDependencies = {},
) {
  const now = (dependencies.now ?? (() => new Date()))();
  const today = dateInBangkok(now);
  if (asksForHistoricalWeather(currentMessage)) {
    return { status: "HISTORICAL_SNAPSHOT_UNAVAILABLE" as const };
  }
  if (!input.forecastDate && !/(?:วันนี้|ตอนนี้|ขณะนี้|พรุ่งนี้|มะรืน)/.test(currentMessage)
    && /(?:เดือนหน้า|สัปดาห์หน้า|ปีหน้า|วันที่|วันจันทร์|วันอังคาร|วันพุธ|วันพฤหัส|วันศุกร์|วันเสาร์|วันอาทิตย์)/.test(currentMessage)) {
    return { status: "DATE_REQUIRED" as const };
  }
  const requestedDate = /มะรืน/.test(currentMessage) ? addDays(today, 2)
    : /พรุ่งนี้/.test(currentMessage) ? addDays(today, 1)
    : input.forecastDate ?? today;

  if (!isCalendarDate(requestedDate)) {
    return { status: "INVALID_DATE" as const };
  }
  if (requestedDate < today) {
    return { status: "PAST_DATE_UNAVAILABLE" as const, requestedDate };
  }

  let park: Awaited<ReturnType<typeof getParkDetail>>;
  try {
    park = await (dependencies.readPark ?? getParkDetail)(parkSlug);
  } catch (error) {
    if (error instanceof NotFoundError) return { status: "PARK_NOT_FOUND" as const };
    throw error;
  }

  const parkReference = { id: park.id, slug: park.slug, name: park.nameTh };
  if (COORDINATE_REVIEW_SLUGS.has(park.slug)) {
    return { status: "COORDINATE_REVIEW_REQUIRED" as const, park: parkReference };
  }
  const latitude = park.latitude;
  const longitude = park.longitude;
  if (latitude === null || longitude === null || !Number.isFinite(latitude)
    || !Number.isFinite(longitude) || latitude < -90 || latitude > 90
    || longitude < -180 || longitude > 180) {
    return { status: "INVALID_COORDINATES" as const, park: parkReference };
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); },
    dependencies.timeoutMs ?? PROVIDER_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  if (signal?.aborted) controller.abort();

  try {
    const forecast = await (dependencies.fetchForecast ?? fetchOpenMeteoWeatherSnapshot)({
      latitude, longitude,
      tripDate: new Date(`${requestedDate}T12:00:00.000Z`),
      timezone: TIMEZONE,
      signal: controller.signal,
    });
    return {
      status: "OK" as const,
      park: parkReference,
      dataKind: "DAILY_FORECAST" as const,
      requestedKind: /(?:ตอนนี้|ขณะนี้|เวลานี้|ปัจจุบัน)/.test(currentMessage)
        ? "CURRENT_CONDITIONS" as const : "FORECAST" as const,
      isCurrentObservation: false,
      forecastDate: requestedDate,
      forecastAt: forecast.forecastAt.toISOString(),
      retrievedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
      providerIssuedAt: null,
      timezone: forecast.timezone,
      source: forecast.source,
      coordinateScope: "PARK_REFERENCE_POINT" as const,
      coordinateVerification: "PASSED_INTERNAL_SCREENING" as const,
      coordinateNote: "พิกัดจุดอ้างอิงอุทยานในฐานข้อมูล ไม่ใช่พิกัดทุกพื้นที่หรือพิกัดที่หน่วยงานทางการยืนยัน",
      weatherCode: forecast.weatherCode,
      weatherCondition: forecast.weatherCondition,
      precipitationSumMm: forecast.precipitationMm,
      temperatureMaxC: forecast.temperatureC,
      windSpeedMaxKmh: forecast.windSpeedKmh,
    };
  } catch (error) {
    if (error instanceof OpenMeteoPastDateError) {
      return { status: "PAST_DATE_UNAVAILABLE" as const, requestedDate };
    }
    if (error instanceof OpenMeteoForecastNotAvailableYetError) {
      return {
        status: "OUTSIDE_FORECAST_WINDOW" as const,
        requestedDate,
        lastSupportedDate: error.lastSupportedDate,
      };
    }
    return { status: timedOut ? "UPSTREAM_TIMEOUT" as const : "UPSTREAM_UNAVAILABLE" as const };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
