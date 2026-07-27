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
