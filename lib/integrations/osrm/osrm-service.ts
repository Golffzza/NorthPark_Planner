import {
  mapOsrmRouteSnapshot,
  OsrmResponseMapperError,
  type NormalizedOsrmRouteSnapshot,
} from "./osrm-response-mapper";

type OsrmRouteInput = {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
};

export class OsrmServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OsrmServiceError";
  }
}

function getBaseUrl() {
  return (process.env.OSRM_BASE_URL || "http://router.project-osrm.org").replace(/\/+$/, "");
}

type OsrmCoordinate = { lat: number; lng: number };
export type OsrmNearbyRoute =
  | { status: "OK"; distanceMeters: number; durationSeconds: number }
  | { status: "NO_ROUTE" | "UNSUPPORTED" | "UNAVAILABLE" };

type OsrmTableWaypoint = { location?: unknown; distance?: unknown } | null;
type ValidOsrmTableWaypoint = { location: [number, number]; distance: number };
type OsrmTableResponse = {
  code?: unknown;
  sources?: OsrmTableWaypoint[];
  destinations?: OsrmTableWaypoint[];
  distances?: unknown;
  durations?: unknown;
  fallback_speed_cells?: unknown;
};

const NEARBY_TABLE_TIMEOUT_MS = 5_000;
// A distant snap may route to a road that does not actually serve the park or place.
const MAX_ROAD_SNAP_METERS = 200;

function validOsrmCoordinate(coordinate: OsrmCoordinate): boolean {
  return Number.isFinite(coordinate.lat) && Number.isFinite(coordinate.lng)
    && Math.abs(coordinate.lat) <= 90 && Math.abs(coordinate.lng) <= 180;
}

function validWaypoint(value: OsrmTableWaypoint | undefined): value is ValidOsrmTableWaypoint {
  if (!value || !Array.isArray(value.location) || value.location.length !== 2) return false;
  const [lng, lat] = value.location;
  return typeof lng === "number" && typeof lat === "number" && validOsrmCoordinate({ lat, lng })
    && typeof value.distance === "number" && Number.isFinite(value.distance) && value.distance >= 0;
}

export async function fetchOsrmNearbyTable(
  origin: OsrmCoordinate,
  destinations: readonly OsrmCoordinate[],
  signal?: AbortSignal,
): Promise<OsrmNearbyRoute[]> {
  if (!validOsrmCoordinate(origin) || destinations.length < 1 || destinations.length > 20
    || destinations.some((destination) => !validOsrmCoordinate(destination))) {
    throw new OsrmServiceError("Invalid nearby routing coordinates");
  }
  const coordinates = [origin, ...destinations].map(({ lng, lat }) => `${lng},${lat}`).join(";");
  const url = new URL(`/table/v1/driving/${coordinates}`, getBaseUrl());
  url.searchParams.set("sources", "0");
  url.searchParams.set("destinations", destinations.map((_, index) => index + 1).join(";"));
  url.searchParams.set("annotations", "distance,duration");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NEARBY_TABLE_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    if (signal?.aborted) throw new OsrmServiceError("OSRM request aborted");
    const response = await fetch(url.toString(), {
      method: "GET", cache: "no-store", signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "NorthPark_Planner/1.0 (+https://github.com/Golffzza/NorthPark_Planner)",
      },
    });
    const data = (await response.json()) as OsrmTableResponse;
    if (data.code === "NoTable") return destinations.map(() => ({ status: "NO_ROUTE" }));
    if (data.code === "NoSegment") {
      // OSRM does not identify which coordinate failed in a batched response.
      return destinations.map(() => ({ status: destinations.length === 1 ? "UNSUPPORTED" : "UNAVAILABLE" }));
    }
    if (!response.ok || data.code !== "Ok") throw new OsrmServiceError("OSRM request failed");

    const source = data.sources?.[0];
    const distances = Array.isArray(data.distances) ? data.distances[0] : undefined;
    const durations = Array.isArray(data.durations) ? data.durations[0] : undefined;
    if (!Array.isArray(data.destinations) || data.destinations.length !== destinations.length
      || !Array.isArray(distances) || !Array.isArray(durations)
      || distances.length !== destinations.length || durations.length !== destinations.length
      || !validWaypoint(source)) {
      return destinations.map(() => ({ status: "UNAVAILABLE" }));
    }
    if (source.distance > MAX_ROAD_SNAP_METERS) {
      return destinations.map(() => ({ status: "UNSUPPORTED" }));
    }
    return destinations.map((_, index): OsrmNearbyRoute => {
      const waypoint = data.destinations![index];
      if (!validWaypoint(waypoint)) return { status: "UNAVAILABLE" };
      if (waypoint.distance > MAX_ROAD_SNAP_METERS) return { status: "UNSUPPORTED" };
      const usedFallback = Array.isArray(data.fallback_speed_cells)
        && data.fallback_speed_cells.some((cell) => Array.isArray(cell) && cell[0] === 0 && cell[1] === index);
      if (usedFallback) return { status: "NO_ROUTE" };
      const distance = distances[index];
      const duration = durations[index];
      if (distance === null || duration === null) return { status: "NO_ROUTE" };
      if (typeof distance !== "number" || !Number.isFinite(distance) || distance < 0
        || typeof duration !== "number" || !Number.isFinite(duration) || duration < 0) {
        return { status: "UNAVAILABLE" };
      }
      return { status: "OK", distanceMeters: distance, durationSeconds: duration };
    });
  } catch (error) {
    if (error instanceof OsrmServiceError) throw error;
    throw new OsrmServiceError(controller.signal.aborted ? "OSRM request timed out" : "OSRM request failed");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function fetchOsrmRouteSnapshot(
  input: OsrmRouteInput,
): Promise<NormalizedOsrmRouteSnapshot> {
  const coordinates = `${input.originLng},${input.originLat};${input.destinationLng},${input.destinationLat}`;
  const url = new URL(`/route/v1/driving/${coordinates}`, getBaseUrl());

  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "false");

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
    throw new OsrmServiceError("OSRM request failed");
  }

  if (!response.ok) {
    throw new OsrmServiceError("OSRM request failed");
  }

  try {
    const data = (await response.json()) as Parameters<typeof mapOsrmRouteSnapshot>[0];
    return mapOsrmRouteSnapshot(data);
  } catch (error) {
    if (error instanceof OsrmResponseMapperError) {
      throw new OsrmServiceError(error.message);
    }

    throw new OsrmServiceError("OSRM request failed");
  }
}
