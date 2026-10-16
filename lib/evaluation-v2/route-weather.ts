import { alignHourlyForecast, fetchOpenMeteoHourlyForecast,
  type AlignedHourlyWeather, type HourlyForecastRequest } from "@/lib/integrations/open-meteo/open-meteo-hourly-service";
import type { RoutePassageSample } from "./route-sampling";

type Sample = Pick<RoutePassageSample, "lat" | "lng" | "passageAt">;
type ForecastRequester = typeof fetchOpenMeteoHourlyForecast;

export type RouteWeatherSample = Sample & {
  weather: AlignedHourlyWeather | null;
  status: "OK" | "MISSING_DATA" | "UNAVAILABLE" | "NOT_REQUESTED";
  errorCode?: string;
};

/** Sequential and capped to avoid a burst of public Open-Meteo requests. No score is produced. */
export async function fetchWeatherForRouteSamples(samples: readonly Sample[], options: {
  now?: Date; signal?: AbortSignal; requestForecast?: ForecastRequester;
} = {}): Promise<RouteWeatherSample[]> {
  if (samples.length < 2 || samples.length > 5 || samples.some((sample) =>
    !Number.isFinite(sample.lat) || !Number.isFinite(sample.lng)
    || Math.abs(sample.lat) > 90 || Math.abs(sample.lng) > 180
    || !Number.isFinite(sample.passageAt.getTime()))) {
    throw new Error("Invalid route weather samples");
  }
  const request = options.requestForecast ?? fetchOpenMeteoHourlyForecast;
  const results: RouteWeatherSample[] = [];
  let providerUnavailable = false;
  for (const sample of samples) {
    if (providerUnavailable) {
      results.push({ ...sample, weather: null, status: "NOT_REQUESTED" });
      continue;
    }
    const input: HourlyForecastRequest = { latitude: sample.lat, longitude: sample.lng,
      from: sample.passageAt, to: sample.passageAt, now: options.now, signal: options.signal };
    try {
      const weather = alignHourlyForecast(await request(input), sample.passageAt);
      results.push({ ...sample, weather, status: weather.status });
    } catch (error) {
      providerUnavailable = true;
      results.push({ ...sample, weather: null, status: "UNAVAILABLE",
        errorCode: error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN" });
    }
  }
  return results;
}
