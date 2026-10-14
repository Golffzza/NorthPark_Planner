import { fetchOsrmNearbyTable, type OsrmNearbyRoute } from "@/lib/integrations/osrm/osrm-service";
import type { NearbyPlace } from "@/lib/services/nearby-places-service";

type Coordinates = { lat: number; lng: number };
type RouteTable = typeof fetchOsrmNearbyTable;
const ROUTE_CACHE_TTL_MS = 10 * 60 * 1000;
const FAILED_ROUTE_CACHE_TTL_MS = 30 * 1000;

function validCoordinates({ lat, lng }: Coordinates): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function routeKey(origin: Coordinates, destination: Coordinates): string {
  return JSON.stringify([origin.lat, origin.lng, destination.lat, destination.lng]);
}

function withRoute(place: NearbyPlace, route: OsrmNearbyRoute): NearbyPlace {
  const base = { ...place };
  delete base.roadDistanceMeters;
  delete base.estimatedDrivingMinutes;
  delete base.routeStatus;
  if (route.status === "OK") {
    return {
      ...base,
      roadDistanceMeters: Math.round(route.distanceMeters),
      estimatedDrivingMinutes: Math.ceil(route.durationSeconds / 60),
      routeStatus: "OK",
    };
  }
  return { ...base, routeStatus: route.status };
}

export function createNearbyPlacesRoutingService(dependencies: { routeTable?: RouteTable; now?: () => number } = {}) {
  const routeTable = dependencies.routeTable ?? fetchOsrmNearbyTable;
  const now = dependencies.now ?? Date.now;
  const cache = new Map<string, { route: OsrmNearbyRoute; expiresAt: number }>();
  let providerQueue: Promise<void> = Promise.resolve();

  async function enrich(origin: Coordinates, places: readonly NearbyPlace[], signal?: AbortSignal): Promise<NearbyPlace[]> {
    if (places.length === 0) return [];
    if (!validCoordinates(origin)) return places.map((place) => withRoute(place, { status: "UNAVAILABLE" }));
    const previous = providerQueue;
    let release!: () => void;
    providerQueue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      const missing = new Map<string, Coordinates>();
      const routes = new Map<string, OsrmNearbyRoute>();
      for (const place of places) {
        const destination = { lat: place.lat, lng: place.lng };
        const key = routeKey(origin, destination);
        if (!validCoordinates(destination)) {
          routes.set(key, { status: "UNAVAILABLE" });
          continue;
        }
        const hit = cache.get(key);
        if (hit && hit.expiresAt > now()) routes.set(key, hit.route);
        else missing.set(key, destination);
      }
      if (missing.size > 0) {
        const entries = [...missing];
        let fetched: OsrmNearbyRoute[];
        try {
          fetched = await routeTable(origin, entries.map(([, destination]) => destination), signal);
          if (fetched.length !== entries.length) throw new Error("OSRM table length mismatch");
        } catch {
          fetched = entries.map(() => ({ status: "UNAVAILABLE" }));
        }
        entries.forEach(([key], index) => {
          const route = fetched[index];
          routes.set(key, route);
          if (cache.size >= 200) cache.delete(cache.keys().next().value!);
          cache.set(key, {
            route,
            expiresAt: now() + (route.status === "UNAVAILABLE" ? FAILED_ROUTE_CACHE_TTL_MS : ROUTE_CACHE_TTL_MS),
          });
        });
      }
      return places.map((place) => withRoute(place, routes.get(routeKey(origin, place)) ?? { status: "UNAVAILABLE" }));
    } finally {
      release();
    }
  }

  return { enrich };
}

export const nearbyPlacesRoutingService = createNearbyPlacesRoutingService();
