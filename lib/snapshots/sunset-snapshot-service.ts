import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  SunsetCalculationError,
  calculateSunsetSnapshot,
} from "@/lib/integrations/sun/sunset-service";
import { getTripForCurrentUser } from "@/lib/services/trip-service";
import { saveSunsetSnapshotInMemory } from "./in-memory-snapshots";

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

    if (typeof prisma?.sunsetSnapshot?.create === "function") {
      try {
        const created = await prisma.sunsetSnapshot.create({
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
        saveSunsetSnapshotInMemory(created);
        return created;
      } catch (dbError) {
        console.warn("[sunset-snapshot] Database create failed, saving in memory fallback:", dbError);
      }
    }

    return saveSunsetSnapshotInMemory({
      id: `sunset-snap-${Date.now()}`,
      tripId: trip.id,
      source: snapshot.source,
      timezone: snapshot.timezone,
      latitude: new Prisma.Decimal(latitude),
      longitude: new Prisma.Decimal(longitude),
      sunsetAt: snapshot.sunsetAt,
      sunsetLocalTime: snapshot.sunsetLocalTime,
      createdAt: new Date(),
    });
  } catch (error) {
    if (error instanceof SunsetCalculationError) {
      throw new SunsetSyncUnavailableError(error.message);
    }

    throw error;
  }
}
