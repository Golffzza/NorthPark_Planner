import type { WeatherCondition } from "@prisma/client";

import { mapOpenMeteoWeatherCondition } from "./weather-code-mapper";

type OpenMeteoSnapshotInput = {
  latitude: number;
  longitude: number;
  tripDate: Date;
  timezone?: string;
};

type OpenMeteoDailyResponse = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    precipitation_sum?: number[];
    temperature_2m_max?: number[];
    wind_speed_10m_max?: number[];
  };
};

export type OpenMeteoWeatherSnapshot = {
  source: "OPEN_METEO";
  timezone: string;
  forecastAt: Date;
  weatherCode: number;
  precipitationMm: number;
  weatherCondition: WeatherCondition;
  temperatureC: number | null;
  windSpeedKmh: number | null;
  raw: OpenMeteoDailyResponse;
};

export class OpenMeteoServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenMeteoServiceError";
  }
}

function getAppTimezone() {
  return process.env.APP_TIMEZONE || "Asia/Bangkok";
}

function getBaseUrl() {
  return (process.env.OPEN_METEO_BASE_URL || "https://api.open-meteo.com").replace(/\/+$/, "");
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

function formatDateForOpenMeteo(date: Date, timeZone: string) {
  const { year, month, day } = getDatePartsInTimeZone(date, timeZone);

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

function parseForecastDate(value: string, timeZone: string) {
  const [year, month, day] = value.split("-").map(Number);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
  });
  const offsetValue =
    formatter
      .formatToParts(new Date(Date.UTC(year, month - 1, day, 12)))
      .find((part) => part.type === "timeZoneName")
      ?.value || "GMT+0";
  const match = offsetValue.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);

  if (!match) {
    return new Date(Date.UTC(year, month - 1, day));
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || 0);
  const totalOffsetMinutes = sign * (hours * 60 + minutes);

  return new Date(Date.UTC(year, month - 1, day) - totalOffsetMinutes * 60_000);
}

function getDailyValue(values: number[] | undefined, label: string) {
  const value = values?.[0];

  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new OpenMeteoServiceError(`Open-Meteo daily ${label} is unavailable`);
  }

  return value;
}

export async function fetchOpenMeteoWeatherSnapshot(
  input: OpenMeteoSnapshotInput,
): Promise<OpenMeteoWeatherSnapshot> {
  const timezone = input.timezone || getAppTimezone();
  const tripDate = formatDateForOpenMeteo(input.tripDate, timezone);
  const url = new URL("/v1/forecast", getBaseUrl());

  url.searchParams.set("latitude", input.latitude.toString());
  url.searchParams.set("longitude", input.longitude.toString());
  url.searchParams.set(
    "daily",
    "weather_code,precipitation_sum,temperature_2m_max,wind_speed_10m_max",
  );
  url.searchParams.set("timezone", timezone);
  url.searchParams.set("start_date", tripDate);
  url.searchParams.set("end_date", tripDate);

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });
  } catch {
    throw new OpenMeteoServiceError("Open-Meteo request failed");
  }

  if (!response.ok) {
    throw new OpenMeteoServiceError("Open-Meteo request failed");
  }

  const data = (await response.json()) as OpenMeteoDailyResponse;
  const forecastDate = data.daily?.time?.[0];

  if (!forecastDate) {
    throw new OpenMeteoServiceError("Open-Meteo forecast date is unavailable");
  }

  const weatherCode = getDailyValue(data.daily?.weather_code, "weather_code");
  const precipitationMm = getDailyValue(data.daily?.precipitation_sum, "precipitation_sum");
  const weatherCondition = mapOpenMeteoWeatherCondition(weatherCode, precipitationMm);

  return {
    source: "OPEN_METEO",
    timezone,
    forecastAt: parseForecastDate(forecastDate, timezone),
    weatherCode,
    precipitationMm,
    weatherCondition,
    temperatureC: data.daily?.temperature_2m_max?.[0] ?? null,
    windSpeedKmh: data.daily?.wind_speed_10m_max?.[0] ?? null,
    raw: data,
  };
}
