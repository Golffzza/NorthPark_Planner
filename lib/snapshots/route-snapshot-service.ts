import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { fetchOsrmRouteSnapshot, OsrmServiceError } from "@/lib/integrations/osrm/osrm-service";
import { getTripForCurrentUser } from "@/lib/services/trip-service";

export class TripRouteContextError extends Error {
  code: "missing_origin_coordinates" | "missing_destination_coordinates";

  constructor(
    message: string,
    code: "missing_origin_coordinates" | "missing_destination_coordinates",
  ) {
    super(message);
    this.name = "TripRouteContextError";
    this.code = code;
  }
}

export class RouteSyncUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteSyncUnavailableError";
  }
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === null || value === undefined) {
    return value ?? undefined;
  }

  return value as Prisma.InputJsonValue;
}

function toCoordinateNumber(value: { toNumber(): number } | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return null;
}

export async function syncRouteSnapshotForCurrentUser(tripId: string) {
  const trip = await getTripForCurrentUser(tripId);
  const originLat = toCoordinateNumber(trip.originLat);
  const originLng = toCoordinateNumber(trip.originLng);
  const destinationLat = toCoordinateNumber(trip.park.latitude);
  const destinationLng = toCoordinateNumber(trip.park.longitude);

  if (originLat === null || originLng === null) {
    throw new TripRouteContextError(
      "Route sync requires origin coordinates before it can calculate distance",
      "missing_origin_coordinates",
    );
  }

  if (destinationLat === null || destinationLng === null) {
    throw new TripRouteContextError(
      "Trip park coordinates are required before route sync can run",
      "missing_destination_coordinates",
    );
  }

  try {
    const snapshot = await fetchOsrmRouteSnapshot({
      originLat,
      originLng,
      destinationLat,
      destinationLng,
    });

    return prisma.routeSnapshot.create({
      data: {
        tripId: trip.id,
        source: snapshot.source,
        originLat,
        originLng,
        destinationLat,
        destinationLng,
        distanceMeters: snapshot.distanceMeters,
        durationSeconds: snapshot.durationSeconds,
        geometryJson: toJsonValue(snapshot.geometryJson),
        rawJson: toJsonValue(snapshot.rawJson),
      },
    });
  } catch (error) {
    if (error instanceof OsrmServiceError) {
      throw new RouteSyncUnavailableError(error.message);
    }

    if (error instanceof RouteSyncUnavailableError) {
      throw error;
    }

    throw error;
  }
}
