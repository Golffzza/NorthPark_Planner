import { prisma } from "@/lib/db/prisma";
import {
  SunsetCalculationError,
  calculateSunsetSnapshot,
} from "@/lib/integrations/sun/sunset-service";
import { getTripForCurrentUser } from "@/lib/services/trip-service";

export class TripSnapshotContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TripSnapshotContextError";
  }
}

export class SunsetSyncUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SunsetSyncUnavailableError";
  }
}

function getAppTimezone() {
  return process.env.APP_TIMEZONE || "Asia/Bangkok";
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

export async function syncSunsetSnapshotForCurrentUser(tripId: string) {
  const trip = await getTripForCurrentUser(tripId);
  const latitude = toCoordinateNumber(trip.park.latitude);
  const longitude = toCoordinateNumber(trip.park.longitude);

  if (latitude === null || longitude === null) {
    throw new TripSnapshotContextError("Trip park coordinates are required");
  }

  try {
    const snapshot = calculateSunsetSnapshot({
      latitude,
      longitude,
      tripDate: trip.tripDate,
      timezone: getAppTimezone(),
    });

    return prisma.sunsetSnapshot.create({
      data: {
        tripId: trip.id,
        source: snapshot.source,
        timezone: snapshot.timezone,
        latitude,
        longitude,
        sunsetAt: snapshot.sunsetAt,
        sunsetLocalTime: snapshot.sunsetLocalTime,
      },
    });
  } catch (error) {
    if (error instanceof SunsetCalculationError) {
      throw new SunsetSyncUnavailableError(error.message);
    }

    throw error;
  }
}
