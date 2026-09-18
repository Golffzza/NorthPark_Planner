import type { WeatherSnapshot, RouteSnapshot, SunsetSnapshot } from "@prisma/client";

export const inMemoryWeatherSnapshots: WeatherSnapshot[] = [];
export const inMemoryRouteSnapshots: RouteSnapshot[] = [];
export const inMemorySunsetSnapshots: SunsetSnapshot[] = [];

export function saveWeatherSnapshotInMemory(snapshot: WeatherSnapshot): WeatherSnapshot {
  inMemoryWeatherSnapshots.unshift(snapshot);
  return snapshot;
}

export function saveRouteSnapshotInMemory(snapshot: RouteSnapshot): RouteSnapshot {
  inMemoryRouteSnapshots.unshift(snapshot);
  return snapshot;
}

export function saveSunsetSnapshotInMemory(snapshot: SunsetSnapshot): SunsetSnapshot {
  inMemorySunsetSnapshots.unshift(snapshot);
  return snapshot;
}

export function getLatestWeatherSnapshotInMemory(tripId: string): WeatherSnapshot | undefined {
  return inMemoryWeatherSnapshots
    .filter((s) => s.tripId === tripId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export function getLatestRouteSnapshotInMemory(tripId: string): RouteSnapshot | undefined {
  return inMemoryRouteSnapshots
    .filter((s) => s.tripId === tripId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export function getLatestSunsetSnapshotInMemory(tripId: string): SunsetSnapshot | undefined {
  return inMemorySunsetSnapshots
    .filter((s) => s.tripId === tripId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}
