import type { WeatherCondition } from "@prisma/client";

const STORM_CODES = new Set([95, 96, 99]);
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 66, 71, 73, 75, 77, 80, 81, 85, 86]);
const HEAVY_RAIN_CODES = new Set([65, 67, 82]);
const CLOUDY_CODES = new Set([1, 2, 3, 45, 48]);

export function mapOpenMeteoWeatherCondition(
  weatherCode: number,
  precipitationMm = 0,
): WeatherCondition {
  if (STORM_CODES.has(weatherCode)) {
    return "STORM";
  }

  if (HEAVY_RAIN_CODES.has(weatherCode) || precipitationMm >= 7.5) {
    return "HEAVY_RAIN";
  }

  if (RAIN_CODES.has(weatherCode) || precipitationMm > 0) {
    return "LIGHT_RAIN";
  }

  if (weatherCode === 0) {
    return "CLEAR";
  }

  if (CLOUDY_CODES.has(weatherCode)) {
    return "CLOUDY";
  }

  return "CLOUDY";
}
