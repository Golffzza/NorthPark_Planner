type OsrmRouteResponse = {
  code?: string;
  waypoints?: unknown;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: unknown;
    legs?: unknown;
  }>;
};

export type NormalizedOsrmRouteSnapshot = {
  source: "OSRM";
  distanceMeters: number;
  durationSeconds: number;
  geometryJson: unknown | null;
  rawJson: OsrmRouteResponse;
};

export class OsrmResponseMapperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OsrmResponseMapperError";
  }
}

export function mapOsrmRouteSnapshot(response: OsrmRouteResponse): NormalizedOsrmRouteSnapshot {
  const route = response.routes?.[0];

  if (!route || typeof route.distance !== "number" || typeof route.duration !== "number") {
    throw new OsrmResponseMapperError("OSRM route data is unavailable");
  }

  return {
    source: "OSRM",
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometryJson: route.geometry ?? null,
    rawJson: response,
  };
}
