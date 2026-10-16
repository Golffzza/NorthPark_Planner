/** Evidence-only route preparation for E2. No Evaluation V1 or V2 score is calculated here. */
export type RouteCoordinate = { lat: number; lng: number };
export type RouteTimingMethod = "OSRM_ANNOTATION" | "GEOMETRY_DISTANCE_ESTIMATE";
export type EvaluationRoute = {
  profile: "driving";
  geometry: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
  segmentDurationsSeconds: number[];
  segmentDistancesMeters: number[];
  timingMethod: RouteTimingMethod;
  snappedEndpoints: Array<{ coordinate: RouteCoordinate; distanceMeters: number }>;
  provenance: { provider: "OSRM"; dataVersion: string | null; annotationStatus: "ALIGNED" | "MISSING_OR_MISMATCHED" };
};

type RequestedEndpoints = { origin: RouteCoordinate; destination: RouteCoordinate };
const MAX_SNAP_METERS = 200;

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

function numericSegments(value: unknown, expected: number): number[] | null {
  return Array.isArray(value) && value.length === expected
    && value.every((item) => typeof item === "number" && Number.isFinite(item) && item >= 0)
    ? value as number[] : null;
}

function closeToTotal(values: number[], total: number, absoluteTolerance: number): boolean {
  return Math.abs(values.reduce((sum, value) => sum + value, 0) - total)
    <= Math.max(absoluteTolerance, total * 0.05);
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
  if (data?.code !== "Ok" || !route || !isPositiveFinite(route.duration) || !isPositiveFinite(route.distance)) {
    throw new Error("OSRM route summary is unavailable");
  }
  const rawCoordinates = route.geometry?.coordinates;
  if (route.geometry?.type !== "LineString" || !Array.isArray(rawCoordinates) || rawCoordinates.length < 2) {
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
  const durations = numericSegments(route.legs?.[0]?.annotation?.duration, expected);
  const distances = numericSegments(route.legs?.[0]?.annotation?.distance, expected);
  const aligned = !!durations && !!distances
    && closeToTotal(durations, route.duration, 5)
    && closeToTotal(distances, route.distance, 50);
  const estimatedDistances = geometry.slice(1).map((point, index) => distanceBetween(geometry[index], point));
  const estimatedTotal = estimatedDistances.reduce((sum, value) => sum + value, 0);
  if (!aligned && estimatedTotal <= 0) throw new Error("OSRM geometry has no usable length");
  return {
    profile: "driving", geometry, distanceMeters: route.distance, durationSeconds: route.duration,
    segmentDurationsSeconds: aligned && durations ? durations : estimatedDistances.map((value) => route.duration as number * value / estimatedTotal),
    segmentDistancesMeters: aligned && distances ? distances : estimatedDistances.map((value) => route.distance as number * value / estimatedTotal),
    timingMethod: aligned ? "OSRM_ANNOTATION" : "GEOMETRY_DISTANCE_ESTIMATE",
    snappedEndpoints,
    provenance: { provider: "OSRM", dataVersion: typeof data.data_version === "string" ? data.data_version : null,
      annotationStatus: aligned ? "ALIGNED" : "MISSING_OR_MISMATCHED" },
  };
}

export type RoutePassageSample = RouteCoordinate & {
  passageAt: Date;
  elapsedSeconds: number;
  timingMethod: RouteTimingMethod;
  segmentIndex: number;
};

export function buildRoutePassageSamples(route: EvaluationRoute, departureAt: Date, maxSamples = 5): RoutePassageSample[] {
  if (!Number.isFinite(departureAt.getTime()) || !Number.isInteger(maxSamples) || maxSamples < 2 || maxSamples > 12) {
    throw new Error("Invalid route sampling inputs");
  }
  const count = Math.min(maxSamples, Math.max(3, Math.ceil(route.durationSeconds / 3600) + 1));
  return Array.from({ length: count }, (_, sampleIndex) => {
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
    return { lat: from.lat + (to.lat - from.lat) * fraction,
      lng: from.lng + (to.lng - from.lng) * fraction,
      passageAt: new Date(departureAt.getTime() + elapsedSeconds * 1000), elapsedSeconds,
      timingMethod: route.timingMethod, segmentIndex };
  });
}
