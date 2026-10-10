//* ./lib/evaluation/score-weather.ts

import { WEATHER_SCORES } from "./constants";
import type { WeatherCondition } from "./types";

export function scoreWeather(condition: WeatherCondition): number {
  return WEATHER_SCORES[condition];
}