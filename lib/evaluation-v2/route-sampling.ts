/** Evidence-only route preparation for E2. No Evaluation V1 or V2 score is calculated here. */
export type RouteCoordinate = { lat: number; lng: number };
export type RouteTimingMethod = "OSRM_ANNOTATION" | "GEOMETRY_DISTANCE_ESTIMATE";
export type AnnotationDiagnostics = {
  expectedSegments: number;
  durationCount: number | null;
  distanceCount: number | null;
  durationDifferenceSeconds: number | null;
  distanceDifferenceMeters: number | null;
  durationRelativeError: number | null;
  distanceRelativeError: number | null;
};
export type EvaluationRoute = {
  profile: "driving";
  geometry: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
  segmentDurationsSeconds: number[];
  segmentDistancesMeters: number[];
  timingMethod: RouteTimingMethod;
  snappedEndpoints: Array<{ coordinate: RouteCoordinate; distanceMeters: number }>;
  provenance: { provider: "OSRM"; dataVersion: string | null; annotationStatus: "ALIGNED" | "MISSING_OR_MISMATCHED";
    annotationDiagnostics: AnnotationDiagnostics; geometryPointCount: number;
    annotationDurationScale: number | null; annotationDistanceScale: number | null };
};

type RequestedEndpoints = { origin: RouteCoordinate; destination: RouteCoordinate };
const MAX_SNAP_METERS = 200;
const MAX_GEOMETRY_POINTS = 50_000;
// Project review thresholds, not OSRM/Open-Meteo guarantees or a weather-safety standard.
export const ROUTE_WEATHER_SAMPLING_POLICY = {
  maxWeatherRequests: 5, maxTemporalGapSeconds: 3_600, maxSpatialGapMeters: 50_000,
} as const;

function isCoordinate(value: unknown): value is RouteCoordinate {
  if (!value || typeof value !== "object") return false;
  const point = value as RouteCoordinate;
  return Number.isFinite(point.lat) && Number.isFinite(point.lng)
    && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function distanceBetween(a: RouteCoordinate, b: RouteCoordinate): number {
  const radians = Math.PI / 180;
  const deltaLat = (b.lat - a.lat) * radians;
  const deltaLng = (b.lng - a.lng) * radians;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians)
    * Math.sin(deltaLng / 2) ** 2;
  return 12_742_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function numericSegments(value: unknown): number[] | null {
  return Array.isArray(value)
    && value.every((item) => typeof item === "number" && Number.isFinite(item) && item >= 0)
    ? value as number[] : null;
}

function closeToTotal(values: number[], total: number, absoluteTolerance: number): boolean {
  return Math.abs(values.reduce((sum, value) => sum + value, 0) - total)
    <= Math.max(absoluteTolerance, total * 0.01);
}

export function normalizeEvaluationRoute(response: unknown, requested: RequestedEndpoints): EvaluationRoute {
  if (!isCoordinate(requested.origin) || !isCoordinate(requested.destination)) {
    throw new Error("Invalid route endpoint coordinates");
  }
  const data = response as {
    code?: unknown; data_version?: unknown;
    waypoints?: Array<{ location?: unknown; distance?: unknown }>;
    routes?: Array<{ distance?: unknown; duration?: unknown; geometry?: { type?: unknown; coordinates?: unknown };
      legs?: Array<{ annotation?: { duration?: unknown; distance?: unknown } }> }>;
  } | null;
  const route = data?.routes?.[0];
  if (data?.code !== "Ok" || !route || !isPositiveFinite(route.duration) || !isPositiveFinite(route.distance)
    || route.duration > 72 * 3_600 || route.distance > 5_000_000 || route.distance / route.duration > 60) {
    throw new Error("OSRM route summary is unavailable");
  }
  const rawCoordinates = route.geometry?.coordinates;
  if (route.geometry?.type !== "LineString" || !Array.isArray(rawCoordinates)
    || rawCoordinates.length < 2 || rawCoordinates.length > MAX_GEOMETRY_POINTS) {
    throw new Error("OSRM full route geometry is unavailable");
  }
  const geometry = rawCoordinates.map((pair): RouteCoordinate => {
    if (!Array.isArray(pair) || pair.length !== 2) throw new Error("Invalid OSRM geometry coordinate");
    const coordinate = { lng: pair[0] as number, lat: pair[1] as number };
    if (!isCoordinate(coordinate)) throw new Error("Invalid OSRM geometry coordinate");
    return coordinate;
  });
  if (data.waypoints?.length !== 2) throw new Error("OSRM snapped endpoints are unavailable");
  const snappedEndpoints = data.waypoints.map((waypoint) => {
    if (!Array.isArray(waypoint.location) || waypoint.location.length !== 2) {
      throw new Error("Invalid OSRM snapped endpoint");
    }
    const coordinate = { lng: waypoint.location[0] as number, lat: waypoint.location[1] as number };
    const distanceMeters = waypoint.distance;
    if (!isCoordinate(coordinate) || typeof distanceMeters !== "number"
      || !Number.isFinite(distanceMeters) || distanceMeters < 0 || distanceMeters > MAX_SNAP_METERS) {
      throw new Error("OSRM snapped endpoint requires review");
    }
    return { coordinate, distanceMeters };
  });
  if (distanceBetween(geometry[0], snappedEndpoints[0].coordinate) > 50
    || distanceBetween(geometry[geometry.length - 1], snappedEndpoints[1].coordinate) > 50) {
    throw new Error("OSRM geometry does not meet snapped endpoints");
  }
  const expected = geometry.length - 1;
  const durations = numericSegments(route.legs?.[0]?.annotation?.duration);
  const distances = numericSegments(route.legs?.[0]?.annotation?.distance);
  const durationSum = durations?.reduce((sum, value) => sum + value, 0) ?? null;
  const distanceSum = distances?.reduce((sum, value) => sum + value, 0) ?? null;
  const annotationDiagnostics: AnnotationDiagnostics = {
    expectedSegments: expected, durationCount: durations?.length ?? null, distanceCount: distances?.length ?? null,
    durationDifferenceSeconds: durationSum === null ? null : durationSum - route.duration,
    distanceDifferenceMeters: distanceSum === null ? null : distanceSum - route.distance,
    durationRelativeError: durationSum === null ? null : Math.abs(durationSum - route.duration) / route.duration,
    distanceRelativeError: distanceSum === null ? null : Math.abs(distanceSum - route.distance) / route.distance,
  };
  const aligned = !!durations && !!distances && durations.length === expected && distances.length === expected
    && closeToTotal(durations, route.duration, 1)
    && closeToTotal(distances, route.distance, 5);
  const estimatedDistances = geometry.slice(1).map((point, index) => distanceBetween(geometry[index], point));
  const estimatedTotal = estimatedDistances.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(estimatedTotal) || estimatedTotal <= 0
    || estimatedTotal < route.distance / 2 || estimatedTotal > route.distance * 2) {
    throw new Error("OSRM geometry has anomalous length");
  }
  const durationScale = aligned && durationSum ? route.duration / durationSum : null;
  const distanceScale = aligned && distanceSum ? route.distance / distanceSum : null;
  return {
    profile: "driving", geometry, distanceMeters: route.distance, durationSeconds: route.duration,
    segmentDurationsSeconds: aligned && durations && durationScale
      ? durations.map((value) => value * durationScale)
      : estimatedDistances.map((value) => route.duration as number * value / estimatedTotal),
    segmentDistancesMeters: aligned && distances && distanceScale
      ? distances.map((value) => value * distanceScale)
      : estimatedDistances.map((value) => route.distance as number * value / estimatedTotal),
    timingMethod: aligned ? "OSRM_ANNOTATION" : "GEOMETRY_DISTANCE_ESTIMATE",
    snappedEndpoints,
    provenance: { provider: "OSRM", dataVersion: typeof data.data_version === "string" ? data.data_version : null,
      annotationStatus: aligned ? "ALIGNED" : "MISSING_OR_MISMATCHED", annotationDiagnostics,
      geometryPointCount: geometry.length, annotationDurationScale: durationScale,
      annotationDistanceScale: distanceScale },
  };
}

export type RoutePassageSample = RouteCoordinate & {
  passageAt: Date;
  elapsedSeconds: number;
  timingMethod: RouteTimingMethod;
  segmentIndex: number;
  distanceFromStartMeters: number;
};

export type RouteSamplingPlan = {
  status: "SUFFICIENT" | "INSUFFICIENT_COVERAGE" | "TIMING_UNAVAILABLE";
  samples: RoutePassageSample[];
  samplingIntervalSeconds: number | null;
  coverage: { requestLimit: number; sampledSpanSeconds: number; maxTemporalGapSeconds: number | null;
    maxSpatialGapMeters: number | null; routeDurationSeconds: number; routeDistanceMeters: number };
  policy: { maxWeatherRequests: number; maxTemporalGapSeconds: number; maxSpatialGapMeters: number };
  timingMethod: RouteTimingMethod;
  estimatedPassageTimeAllowed: boolean;
};

/** At most five forecast requests. An estimated passage time requires explicit caller opt-in. */
export function buildRouteSamplingPlan(route: EvaluationRoute, departureAt: Date, options: {
  maxWeatherRequests?: number; allowEstimatedPassageTime?: boolean;
} = {}): RouteSamplingPlan {
  const maxSamples = options.maxWeatherRequests ?? ROUTE_WEATHER_SAMPLING_POLICY.maxWeatherRequests;
  if (!Number.isFinite(departureAt.getTime()) || !Number.isInteger(maxSamples)
    || maxSamples < 2 || maxSamples > ROUTE_WEATHER_SAMPLING_POLICY.maxWeatherRequests) {
    throw new Error("Invalid route sampling inputs");
  }
  if (route.geometry.length - 1 !== route.segmentDurationsSeconds.length
    || route.geometry.length - 1 !== route.segmentDistancesMeters.length
    || !isPositiveFinite(route.durationSeconds) || !isPositiveFinite(route.distanceMeters)
    || route.segmentDurationsSeconds.some((value) => !Number.isFinite(value) || value < 0)
    || route.segmentDistancesMeters.some((value) => !Number.isFinite(value) || value < 0)
    || !closeToTotal(route.segmentDurationsSeconds, route.durationSeconds, 1)
    || !closeToTotal(route.segmentDistancesMeters, route.distanceMeters, 5)) {
    throw new Error("Invalid route segment timing");
  }
  const policy = { ...ROUTE_WEATHER_SAMPLING_POLICY, maxWeatherRequests: maxSamples };
  const permitted = route.timingMethod === "OSRM_ANNOTATION" || options.allowEstimatedPassageTime === true;
  const base = { requestLimit: maxSamples, sampledSpanSeconds: 0, maxTemporalGapSeconds: null,
    maxSpatialGapMeters: null, routeDurationSeconds: route.durationSeconds, routeDistanceMeters: route.distanceMeters };
  if (!permitted) return { status: "TIMING_UNAVAILABLE", samples: [], samplingIntervalSeconds: null,
    coverage: base, policy, timingMethod: route.timingMethod, estimatedPassageTimeAllowed: false };
  const count = Math.min(maxSamples, Math.max(3,
    Math.ceil(Math.max(route.durationSeconds / ROUTE_WEATHER_SAMPLING_POLICY.maxTemporalGapSeconds,
      route.distanceMeters / ROUTE_WEATHER_SAMPLING_POLICY.maxSpatialGapMeters)) + 1));
  const samples = Array.from({ length: count }, (_, sampleIndex): RoutePassageSample => {
    const elapsedSeconds = route.durationSeconds * sampleIndex / (count - 1);
    let consumed = 0;
    let segmentIndex = route.segmentDurationsSeconds.length - 1;
    let fraction = 1;
    if (sampleIndex === 0) { segmentIndex = 0; fraction = 0; }
    else if (sampleIndex < count - 1) {
      for (let index = 0; index < route.segmentDurationsSeconds.length; index += 1) {
        const segmentSeconds = route.segmentDurationsSeconds[index];
        if (elapsedSeconds <= consumed + segmentSeconds || index === route.segmentDurationsSeconds.length - 1) {
          segmentIndex = index;
          fraction = segmentSeconds > 0 ? Math.min(1, Math.max(0, (elapsedSeconds - consumed) / segmentSeconds)) : 0;
          break;
        }
        consumed += segmentSeconds;
      }
    }
    const from = route.geometry[segmentIndex];
    const to = route.geometry[segmentIndex + 1];
    const distanceFromStartMeters = route.segmentDistancesMeters.slice(0, segmentIndex)
      .reduce((sum, value) => sum + value, 0) + route.segmentDistancesMeters[segmentIndex] * fraction;
    return { lat: from.lat + (to.lat - from.lat) * fraction,
      lng: from.lng + (to.lng - from.lng) * fraction,
      passageAt: new Date(departureAt.getTime() + elapsedSeconds * 1000), elapsedSeconds,
      timingMethod: route.timingMethod, segmentIndex, distanceFromStartMeters };
  });
  const samplingIntervalSeconds = route.durationSeconds / (count - 1);
  const maxSpatialGapMeters = Math.max(...samples.slice(1).map((sample, index) =>
    sample.distanceFromStartMeters - samples[index].distanceFromStartMeters));
  return { status: samplingIntervalSeconds <= ROUTE_WEATHER_SAMPLING_POLICY.maxTemporalGapSeconds
      && maxSpatialGapMeters <= ROUTE_WEATHER_SAMPLING_POLICY.maxSpatialGapMeters
      ? "SUFFICIENT" : "INSUFFICIENT_COVERAGE",
    samples, samplingIntervalSeconds, policy, timingMethod: route.timingMethod,
    estimatedPassageTimeAllowed: options.allowEstimatedPassageTime === true,
    coverage: { ...base, sampledSpanSeconds: route.durationSeconds,
      maxTemporalGapSeconds: samplingIntervalSeconds, maxSpatialGapMeters } };
}

export function buildRoutePassageSamples(route: EvaluationRoute, departureAt: Date, maxSamples = 5,
  options: { allowEstimatedPassageTime?: boolean } = {}): RoutePassageSample[] {
  const plan = buildRouteSamplingPlan(route, departureAt,
    { maxWeatherRequests: maxSamples, allowEstimatedPassageTime: options.allowEstimatedPassageTime });
  if (plan.status === "TIMING_UNAVAILABLE") throw new Error("Estimated passage time requires explicit approval");
  return plan.samples;
}
