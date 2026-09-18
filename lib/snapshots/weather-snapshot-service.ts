import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  OpenMeteoServiceError,
  fetchOpenMeteoWeatherSnapshot,
} from "@/lib/integrations/open-meteo/open-meteo-service";
import { getTripForCurrentUser } from "@/lib/services/trip-service";
import { saveWeatherSnapshotInMemory } from "./in-memory-snapshots";

export class TripSnapshotContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TripSnapshotContextError";
  }
}

export class WeatherSyncUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherSyncUnavailableError";
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

export async function syncWeatherSnapshotForCurrentUser(tripId: string) {
  const trip = await getTripForCurrentUser(tripId);
  const latitude = toCoordinateNumber(trip.park.latitude);
  const longitude = toCoordinateNumber(trip.park.longitude);

  if (latitude === null || longitude === null) {
    throw new TripSnapshotContextError("Trip park coordinates are required");
  }

  try {
    const snapshot = await fetchOpenMeteoWeatherSnapshot({
      latitude,
      longitude,
      tripDate: trip.tripDate,
      timezone: getAppTimezone(),
    });

    if (typeof prisma?.weatherSnapshot?.create === "function") {
      try {
        const created = await prisma.weatherSnapshot.create({
          data: {
            tripId: trip.id,
            source: snapshot.source,
            timezone: snapshot.timezone,
            latitude,
            longitude,
            forecastAt: snapshot.forecastAt,
            weatherCode: snapshot.weatherCode,
            precipitationMm: snapshot.precipitationMm,
            weatherCondition: snapshot.weatherCondition,
            temperatureC: snapshot.temperatureC,
            windSpeedKmh: snapshot.windSpeedKmh,
            raw: snapshot.raw,
          },
        });
        saveWeatherSnapshotInMemory(created);
        return created;
      } catch (dbError) {
        console.warn("[weather-snapshot] Database create failed, saving in memory fallback:", dbError);
      }
    }

    return saveWeatherSnapshotInMemory({
      id: `weather-snap-${Date.now()}`,
      tripId: trip.id,
      source: snapshot.source,
      timezone: snapshot.timezone,
      latitude: new Prisma.Decimal(latitude),
      longitude: new Prisma.Decimal(longitude),
      forecastAt: snapshot.forecastAt,
      weatherCode: snapshot.weatherCode,
      precipitationMm: snapshot.precipitationMm,
      weatherCondition: snapshot.weatherCondition,
      temperatureC: snapshot.temperatureC,
      windSpeedKmh: snapshot.windSpeedKmh,
      raw: snapshot.raw as Prisma.JsonValue,
      createdAt: new Date(),
    });
  } catch (error) {
    if (error instanceof OpenMeteoServiceError) {
      throw new WeatherSyncUnavailableError(error.message);
    }

    throw error;
  }
}
