import { alignHourlyForecast, fetchOpenMeteoHourlyBatch, HourlyWeatherError,
  type AlignedHourlyWeather, type HourlyBatchPoint } from "@/lib/integrations/open-meteo/open-meteo-hourly-service";
import { locateRoutePassageAtElapsed, type EvaluationRoute,
  type RoutePassageSample, type RouteSamplingPlan } from "./route-sampling";
import { scoreWeatherPoint, WEATHER_RUBRIC_VERSION, type ForecastHazard } from "./weather-rubric";

export type ScoringInterval = { index: number; startAt: Date; endAt: Date; durationSeconds: number;
  representative: RoutePassageSample; sampleWindowIndex: number };
/** Caller-supplied coordinates and metadata. None of these fields authenticates an entrance. */
export type DestinationCoordinateClaim = { latitude: number; longitude: number; sourceId?: string;
  verifiedAt?: Date; effectiveFrom?: Date; reviewStatus?: "VERIFIED" | "PENDING" | "REJECTED" };

export const WEATHER_REQUEST_POLICY = { maxCoordinatesPerBatch: 5, maxBatches: 3,
  maxHttpRequests: 12 } as const;

function destinationEvidenceMatchesRoute(route: EvaluationRoute, evidence: DestinationCoordinateClaim | null): boolean {
  if (!evidence || !Number.isFinite(evidence.latitude) || Math.abs(evidence.latitude) > 90
    || !Number.isFinite(evidence.longitude) || Math.abs(evidence.longitude) > 180
    || typeof evidence.sourceId !== "string" || !evidence.sourceId.trim()
    || !(evidence.verifiedAt instanceof Date)
    || !Number.isFinite(evidence.verifiedAt.getTime())) return false;
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
  destinationEvidence: DestinationCoordinateClaim | null;
  requestProvenance?: { httpRequests: number; uniqueCoordinates: number; batches: number;
    maxCoordinatesPerBatch: number; maxBatches: number; coordinatesPerHttpRequest: 1; maxHttpRequests: number };
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
  const destinationClaimMatchesRoute = destinationEvidenceMatchesRoute(route, input.destinationEvidence);
  // Route proximity and caller metadata cannot authenticate an entrance. A trusted source is not wired in E3.
  const routeMissingReasons: string[] = [];
  if (plan.status !== "SUFFICIENT") routeMissingReasons.push(`ROUTE_${plan.status}`);
  if (plan.timingMethod !== "OSRM_ANNOTATION") routeMissingReasons.push("ESTIMATED_PASSAGE_TIME");
  if (intervals.length === 0 || intervals.length > WEATHER_REQUEST_POLICY.maxHttpRequests
    || intervals.length > WEATHER_REQUEST_POLICY.maxCoordinatesPerBatch * WEATHER_REQUEST_POLICY.maxBatches) {
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
  if (!destinationClaimMatchesRoute) destinationMissingReasons.push("DESTINATION_COORDINATE_UNVERIFIED");
  destinationMissingReasons.push("DESTINATION_ENTRANCE_SOURCE_UNVERIFIED");
  destinationMissingReasons.push("DESTINATION_ENTRANCE_EFFECTIVE_DATE_UNVERIFIED");
  destinationMissingReasons.push("DESTINATION_ENTRANCE_REVIEW_STATUS_UNVERIFIED");
  destinationMissingReasons.push("DESTINATION_WEATHER_UNKNOWN");
  if (input.destinationError) destinationMissingReasons.push(input.destinationError);
  const hazards: ForecastHazard[] = scoredIntervals.flatMap((interval) => interval.weather.hazards);
  return { status: "UNKNOWN" as const,
    WR: wr, WP: null, W: null, routeMissingReasons, destinationMissingReasons,
    intervals: scoredIntervals, destination: null, hazards,
    officialWarning: null, blockingConstraint: null,
    rubricVersion: WEATHER_RUBRIC_VERSION,
    weights: { route: 0.4, destination: 0.6, status: "EXPERIMENTAL" as const },
    coverage: plan.coverage, samplingPolicy: plan.policy, samplingStatus: plan.status,
    routeProvenance: route.provenance, destinationEvidence: null,
    destinationEvidenceAudit: { claimSourceId: input.destinationEvidence?.sourceId ?? null,
      claimVerifiedAt: input.destinationEvidence?.verifiedAt ?? null,
      claimEffectiveFrom: input.destinationEvidence?.effectiveFrom ?? null,
      claimReviewStatus: input.destinationEvidence?.reviewStatus ?? null,
      claimMatchesSnappedEndpoint: destinationClaimMatchesRoute,
      verificationStatus: "UNVERIFIED" as const, effectiveFrom: null,
      trustedSource: null, reason: "NO_TRUSTED_ENTRANCE_REGISTRY" as const },
    requestProvenance: input.requestProvenance ?? null };
}

/** Candidate only; no production score or database write. Bounded serial forecast requests. */
export async function evaluateWeatherV2Candidate(input: {
  route: EvaluationRoute; plan: RouteSamplingPlan; destinationEvidence: DestinationCoordinateClaim | null;
  now?: Date; signal?: AbortSignal; fetchBatch?: typeof fetchOpenMeteoHourlyBatch;
}) {
  const intervals = buildRouteWeatherScoringIntervals(input.route, input.plan);
  const fetchRoute = input.plan.status === "SUFFICIENT" && input.plan.timingMethod === "OSRM_ANNOTATION"
    && intervals.length > 0 && intervals.length <= WEATHER_REQUEST_POLICY.maxHttpRequests
    && intervals.length <= WEATHER_REQUEST_POLICY.maxCoordinatesPerBatch * WEATHER_REQUEST_POLICY.maxBatches;
  const points: HourlyBatchPoint[] = [
    ...(fetchRoute ? intervals.map((interval) => ({ latitude: interval.representative.lat,
      longitude: interval.representative.lng, at: interval.representative.passageAt })) : []),
  ];
  const intervalWeather: Array<AlignedHourlyWeather | null> = intervals.map(() => null);
  const intervalErrors: Array<string | null> = intervals.map(() => fetchRoute ? null : "NOT_REQUESTED");
  const requestProvenance = { httpRequests: 0, uniqueCoordinates: 0, batches: 0,
    maxCoordinatesPerBatch: WEATHER_REQUEST_POLICY.maxCoordinatesPerBatch,
    maxBatches: WEATHER_REQUEST_POLICY.maxBatches,
    coordinatesPerHttpRequest: 1 as const, maxHttpRequests: WEATHER_REQUEST_POLICY.maxHttpRequests };
  for (let offset = 0; offset < points.length; offset += WEATHER_REQUEST_POLICY.maxCoordinatesPerBatch) {
    const slice = points.slice(offset, offset + WEATHER_REQUEST_POLICY.maxCoordinatesPerBatch);
    let batch: Awaited<ReturnType<typeof fetchOpenMeteoHourlyBatch>>;
    try {
      batch = await (input.fetchBatch ?? fetchOpenMeteoHourlyBatch)(slice,
        { now: input.now, signal: input.signal });
    } catch (error) {
      const errorCode = error instanceof HourlyWeatherError ? error.code : "UPSTREAM_UNAVAILABLE";
      batch = { results: slice.map((point, index) => ({ status: "UNAVAILABLE" as const,
        forecast: null, errorCode, point, index })), httpRequests: 0, uniqueCoordinates: 0 };
    }
    requestProvenance.batches += 1;
    requestProvenance.httpRequests += batch.httpRequests;
    requestProvenance.uniqueCoordinates += batch.uniqueCoordinates;
    slice.forEach((point, index) => {
      const result = batch.results[index];
      const validMapping = result?.index === index && result.point.latitude === point.latitude
        && result.point.longitude === point.longitude && result.point.at.getTime() === point.at.getTime();
      intervalWeather[offset + index] = validMapping && result.forecast
        ? alignHourlyForecast(result.forecast, point.at) : null;
      intervalErrors[offset + index] = validMapping ? result.errorCode ?? null : "INVALID_RESPONSE";
    });
    if (batch.results.some((result) => result.errorCode === "RATE_LIMITED")) {
      for (let index = offset + slice.length; index < points.length; index += 1) intervalErrors[index] = "RATE_LIMITED";
      break;
    }
  }
  return scoreEvaluationWeatherV2({ route: input.route, plan: input.plan, intervals,
    intervalWeather, intervalErrors, destinationWeather: null,
    destinationEvidence: input.destinationEvidence, requestProvenance });
}
