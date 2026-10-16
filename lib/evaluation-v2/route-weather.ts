import { alignHourlyForecast, fetchOpenMeteoHourlyForecast,
  type AlignedHourlyWeather, type HourlyForecastRequest } from "@/lib/integrations/open-meteo/open-meteo-hourly-service";
import type { RoutePassageSample } from "./route-sampling";
import type { RouteSamplingPlan } from "./route-sampling";

type Sample = Pick<RoutePassageSample, "lat" | "lng" | "passageAt">;
type ForecastRequester = typeof fetchOpenMeteoHourlyForecast;

export type RouteWeatherSample = Sample & {
  weather: AlignedHourlyWeather | null;
  status: "OK" | "MISSING_DATA" | "UNAVAILABLE" | "NOT_REQUESTED";
  errorCode?: string;
};

/** The plan's spatial/temporal coverage is retained; good sampled weather never upgrades coarse coverage. */
export async function fetchWeatherForRoutePlan(plan: RouteSamplingPlan, options: {
  now?: Date; signal?: AbortSignal; requestForecast?: ForecastRequester;
} = {}) {
  if (plan.status === "TIMING_UNAVAILABLE") {
    return { status: "INCOMPLETE" as const, coverageStatus: plan.status,
      timingStatus: "UNAVAILABLE" as const, coverage: plan.coverage, samples: [] as RouteWeatherSample[] };
  }
  const samples = await fetchWeatherForRouteSamples(plan.samples, options);
  return { status: plan.status === "SUFFICIENT" && plan.timingMethod === "OSRM_ANNOTATION"
      && samples.every((sample) => sample.status === "OK")
      ? "COMPLETE" as const : "INCOMPLETE" as const,
    coverageStatus: plan.status,
    timingStatus: plan.timingMethod === "OSRM_ANNOTATION" ? "VERIFIED_SEGMENTS" as const : "ESTIMATED_SEGMENTS" as const,
    coverage: plan.coverage, samples };
}

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
