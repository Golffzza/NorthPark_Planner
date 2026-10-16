import { alignHourlyForecast, fetchOpenMeteoHourlyBatch, HourlyWeatherError,
  type AlignedHourlyWeather, type HourlyBatchPoint } from "@/lib/integrations/open-meteo/open-meteo-hourly-service";
import { locateRoutePassageAtElapsed, type EvaluationRoute,
  type RoutePassageSample, type RouteSamplingPlan } from "./route-sampling";
import { scoreWeatherPoint, WEATHER_RUBRIC_VERSION, type ForecastHazard, type WeatherPointScore } from "./weather-rubric";

export type ScoringInterval = { index: number; startAt: Date; endAt: Date; durationSeconds: number;
  representative: RoutePassageSample; sampleWindowIndex: number };
export type VerifiedDestination = { latitude: number; longitude: number; sourceId: string; verifiedAt: Date };

function destinationEvidenceMatchesRoute(route: EvaluationRoute, evidence: VerifiedDestination | null): boolean {
  if (!evidence || !Number.isFinite(evidence.latitude) || Math.abs(evidence.latitude) > 90
    || !Number.isFinite(evidence.longitude) || Math.abs(evidence.longitude) > 180
    || !evidence.sourceId.trim() || !Number.isFinite(evidence.verifiedAt.getTime())) return false;
  const endpoint = route.snappedEndpoints[1]?.coordinate;
  if (!endpoint) return false;
  const radians = Math.PI / 180;
  const deltaLat = (evidence.latitude - endpoint.lat) * radians;
  const deltaLng = (evidence.longitude - endpoint.lng) * radians;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(endpoint.lat * radians)
    * Math.cos(evidence.latitude * radians) * Math.sin(deltaLng / 2) ** 2;
  return 12_742_000 * Math.asin(Math.min(1, Math.sqrt(h))) <= 200;
}

/** Partition sample windows at UTC forecast hours; each interval has its own route-geometry midpoint. */
export function buildRouteWeatherScoringIntervals(route: EvaluationRoute, plan: RouteSamplingPlan): ScoringInterval[] {
  if (plan.status === "TIMING_UNAVAILABLE") return [];
  if (plan.samples.length < 2 || plan.samples[0].elapsedSeconds !== 0
    || Math.abs(plan.samples[plan.samples.length - 1].elapsedSeconds - route.durationSeconds) > 0.001) {
    throw new Error("Route sampling plan does not span the route");
  }
  const departureAt = plan.samples[0].passageAt;
  const intervals: ScoringInterval[] = [];
  for (let sampleIndex = 0; sampleIndex < plan.samples.length - 1; sampleIndex += 1) {
    const end = plan.samples[sampleIndex + 1].passageAt.getTime();
    let start = plan.samples[sampleIndex].passageAt.getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error("Invalid sample interval");
    while (start < end) {
      const nextHour = (Math.floor(start / 3_600_000) + 1) * 3_600_000;
      const stop = Math.min(end, nextHour);
      const midpoint = (start + stop) / 2;
      intervals.push({ index: intervals.length, startAt: new Date(start), endAt: new Date(stop),
        durationSeconds: (stop - start) / 1_000,
        representative: locateRoutePassageAtElapsed(route, departureAt,
          (midpoint - departureAt.getTime()) / 1_000), sampleWindowIndex: sampleIndex });
      start = stop;
    }
  }
  const total = intervals.reduce((sum, interval) => sum + interval.durationSeconds, 0);
  if (Math.abs(total - route.durationSeconds) > 1) throw new Error("Route weather intervals do not cover route duration");
  return intervals;
}

export type RouteWeatherScoringInput = {
  route: EvaluationRoute;
  plan: RouteSamplingPlan;
  intervals: readonly ScoringInterval[];
  intervalWeather: readonly (AlignedHourlyWeather | null)[];
  intervalErrors?: readonly (string | null)[];
  destinationWeather: AlignedHourlyWeather | null;
  destinationError?: string | null;
  destinationEvidence: VerifiedDestination | null;
  requestProvenance?: { httpRequests: number; uniqueCoordinates: number };
};

export function scoreEvaluationWeatherV2(input: RouteWeatherScoringInput) {
  const { route, plan, intervals } = input;
  const expected = buildRouteWeatherScoringIntervals(route, plan);
  if (intervals.length !== expected.length || input.intervalWeather.length !== intervals.length
    || intervals.some((interval, index) => interval.startAt.getTime() !== expected[index].startAt.getTime()
      || interval.endAt.getTime() !== expected[index].endAt.getTime()
      || interval.representative.passageAt.getTime() !== expected[index].representative.passageAt.getTime())) {
    throw new Error("Route weather interval alignment mismatch");
  }
  const scoredIntervals = intervals.map((interval, index) => ({ ...interval,
    weather: scoreWeatherPoint({ at: interval.representative.passageAt,
      latitude: interval.representative.lat, longitude: interval.representative.lng,
      weather: input.intervalWeather[index] }) }));
  const destinationVerified = destinationEvidenceMatchesRoute(route, input.destinationEvidence);
  const destination: WeatherPointScore | null = destinationVerified && input.destinationEvidence
    ? scoreWeatherPoint({ at: plan.arrivalAt, latitude: input.destinationEvidence.latitude,
      longitude: input.destinationEvidence.longitude, weather: input.destinationWeather }) : null;
  const routeMissingReasons: string[] = [];
  if (plan.status !== "SUFFICIENT") routeMissingReasons.push(`ROUTE_${plan.status}`);
  if (plan.timingMethod !== "OSRM_ANNOTATION") routeMissingReasons.push("ESTIMATED_PASSAGE_TIME");
  if (intervals.length === 0 || intervals.length + 1 > plan.policy.maxWeatherRequests) {
    routeMissingReasons.push("INSUFFICIENT_FORECAST_POINTS");
  }
  scoredIntervals.forEach((interval, index) => {
    if (interval.weather.status === "UNKNOWN") routeMissingReasons.push(`INTERVAL_${index}_UNKNOWN`);
    if (input.intervalErrors?.[index]) routeMissingReasons.push(`INTERVAL_${index}_${input.intervalErrors[index]}`);
  });
  const wr = routeMissingReasons.length === 0
    ? scoredIntervals.reduce((sum, interval) => sum + interval.durationSeconds * (interval.weather.score as number), 0)
      / route.durationSeconds : null;
  const destinationMissingReasons: string[] = [];
  if (!destinationVerified) destinationMissingReasons.push("DESTINATION_COORDINATE_UNVERIFIED");
  if (!destination || destination.status === "UNKNOWN") destinationMissingReasons.push("DESTINATION_WEATHER_UNKNOWN");
  if (input.destinationError) destinationMissingReasons.push(input.destinationError);
  const wp = destinationMissingReasons.length === 0 ? destination?.score ?? null : null;
  const weatherScore = wr !== null && wp !== null ? 0.4 * wr + 0.6 * wp : null;
  const hazards: ForecastHazard[] = [
    ...scoredIntervals.flatMap((interval) => interval.weather.hazards), ...(destination?.hazards ?? []),
  ];
  return { status: weatherScore === null ? "UNKNOWN" as const : "KNOWN" as const,
    WR: wr, WP: wp, W: weatherScore, routeMissingReasons, destinationMissingReasons,
    intervals: scoredIntervals, destination, hazards,
    officialWarning: null, blockingConstraint: null,
    rubricVersion: WEATHER_RUBRIC_VERSION,
    weights: { route: 0.4, destination: 0.6, status: "EXPERIMENTAL" as const },
    coverage: plan.coverage, samplingPolicy: plan.policy, samplingStatus: plan.status,
    routeProvenance: route.provenance, destinationEvidence: destinationVerified ? input.destinationEvidence : null,
    requestProvenance: input.requestProvenance ?? null };
}

/** Candidate only; no production score or database write. One batch request for ≤4 intervals plus arrival. */
export async function evaluateWeatherV2Candidate(input: {
  route: EvaluationRoute; plan: RouteSamplingPlan; destinationEvidence: VerifiedDestination | null;
  now?: Date; signal?: AbortSignal; fetchBatch?: typeof fetchOpenMeteoHourlyBatch;
}) {
  const intervals = buildRouteWeatherScoringIntervals(input.route, input.plan);
  const destinationVerified = destinationEvidenceMatchesRoute(input.route, input.destinationEvidence);
  const fetchRoute = input.plan.status === "SUFFICIENT" && input.plan.timingMethod === "OSRM_ANNOTATION"
    && intervals.length > 0 && intervals.length + 1 <= input.plan.policy.maxWeatherRequests;
  const points: HourlyBatchPoint[] = [
    ...(fetchRoute ? intervals.map((interval) => ({ latitude: interval.representative.lat,
      longitude: interval.representative.lng, at: interval.representative.passageAt })) : []),
    ...(destinationVerified && input.destinationEvidence
      ? [{ latitude: input.destinationEvidence.latitude, longitude: input.destinationEvidence.longitude,
      at: input.plan.arrivalAt }] : []),
  ];
  let intervalWeather: Array<AlignedHourlyWeather | null> = intervals.map(() => null);
  const intervalErrors: Array<string | null> = intervals.map(() => fetchRoute ? null : "NOT_REQUESTED");
  let destinationWeather: AlignedHourlyWeather | null = null;
  let destinationError: string | null = null;
  let requestProvenance = { httpRequests: 0, uniqueCoordinates: 0 };
  if (points.length > 0) {
    let batch: Awaited<ReturnType<typeof fetchOpenMeteoHourlyBatch>>;
    try {
      batch = await (input.fetchBatch ?? fetchOpenMeteoHourlyBatch)(points,
        { now: input.now, signal: input.signal });
    } catch (error) {
      const errorCode = error instanceof HourlyWeatherError ? error.code : "UPSTREAM_UNAVAILABLE";
      batch = { results: points.map((point, index) => ({ status: "UNAVAILABLE" as const,
        forecast: null, errorCode, point, index })), httpRequests: 0, uniqueCoordinates: 0 };
    }
    requestProvenance = { httpRequests: batch.httpRequests, uniqueCoordinates: batch.uniqueCoordinates };
    if (fetchRoute) {
      intervalWeather = batch.results.slice(0, intervals.length).map((result) => result.forecast
        ? alignHourlyForecast(result.forecast, result.point.at) : null);
      batch.results.slice(0, intervals.length).forEach((result, index) => {
        intervalErrors[index] = result.errorCode ?? null;
      });
    }
    if (destinationVerified) {
      const result = batch.results[batch.results.length - 1];
      destinationWeather = result.forecast ? alignHourlyForecast(result.forecast, input.plan.arrivalAt) : null;
      destinationError = result.errorCode ?? null;
    }
  }
  return scoreEvaluationWeatherV2({ route: input.route, plan: input.plan, intervals,
    intervalWeather, intervalErrors, destinationWeather, destinationError,
    destinationEvidence: input.destinationEvidence, requestProvenance });
}
