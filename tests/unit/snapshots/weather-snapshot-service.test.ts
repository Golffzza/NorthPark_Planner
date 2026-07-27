import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/services/trip-service";
import {
  TripSnapshotContextError,
  syncWeatherSnapshotForCurrentUser,
} from "@/lib/snapshots/weather-snapshot-service";

const tripServiceMock = vi.hoisted(() => ({
  getTripForCurrentUser: vi.fn(),
}));

const openMeteoMock = vi.hoisted(() => ({
  fetchOpenMeteoWeatherSnapshot: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  weatherSnapshot: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/services/trip-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/trip-service")>(
    "@/lib/services/trip-service",
  );

  return {
    ...actual,
    ...tripServiceMock,
  };
});

vi.mock("@/lib/integrations/open-meteo/open-meteo-service", () => openMeteoMock);
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

describe("syncWeatherSnapshotForCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_TIMEZONE = "Asia/Bangkok";

    tripServiceMock.getTripForCurrentUser.mockResolvedValue({
      id: "trip_1",
      userId: "user_1",
      tripDate: new Date("2026-06-12T00:00:00.000Z"),
      park: {
        id: "park_1",
        openTime: "06:00",
        closeTime: "18:00",
        latitude: 18.5883,
        longitude: 98.4871,
      },
    });

    openMeteoMock.fetchOpenMeteoWeatherSnapshot.mockResolvedValue({
      source: "OPEN_METEO",
      timezone: "Asia/Bangkok",
      forecastAt: new Date("2026-06-12T05:00:00.000Z"),
      weatherCode: 63,
      precipitationMm: 4.2,
      weatherCondition: "LIGHT_RAIN",
      temperatureC: 26.9,
      windSpeedKmh: 17.1,
      raw: { provider: "open-meteo" },
    });

    prismaMock.weatherSnapshot.create.mockResolvedValue({
      id: "weather_1",
      tripId: "trip_1",
      source: "OPEN_METEO",
      timezone: "Asia/Bangkok",
      forecastAt: new Date("2026-06-12T05:00:00.000Z"),
      weatherCode: 63,
      precipitationMm: 4.2,
      weatherCondition: "LIGHT_RAIN",
      temperatureC: 26.9,
      windSpeedKmh: 17.1,
      createdAt: new Date("2026-06-12T05:01:00.000Z"),
    });
  });

  it("fetches normalized weather data and persists a history snapshot for the current user's trip", async () => {
    const snapshot = await syncWeatherSnapshotForCurrentUser("trip_1");

    expect(tripServiceMock.getTripForCurrentUser).toHaveBeenCalledWith("trip_1");
    expect(openMeteoMock.fetchOpenMeteoWeatherSnapshot).toHaveBeenCalledWith({
      latitude: 18.5883,
      longitude: 98.4871,
      tripDate: new Date("2026-06-12T00:00:00.000Z"),
      timezone: "Asia/Bangkok",
    });
    expect(prismaMock.weatherSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tripId: "trip_1",
          weatherCondition: "LIGHT_RAIN",
          weatherCode: 63,
        }),
      }),
    );
    expect(snapshot.id).toBe("weather_1");
  });

  it("fails safely when the trip cannot provide park coordinates", async () => {
    tripServiceMock.getTripForCurrentUser.mockResolvedValue({
      id: "trip_1",
      userId: "user_1",
      tripDate: new Date("2026-06-12T00:00:00.000Z"),
      park: {
        id: "park_1",
        openTime: "06:00",
        closeTime: "18:00",
        latitude: null,
        longitude: 98.4871,
      },
    });

    await expect(syncWeatherSnapshotForCurrentUser("trip_1")).rejects.toBeInstanceOf(
      TripSnapshotContextError,
    );
    expect(prismaMock.weatherSnapshot.create).not.toHaveBeenCalled();
  });

  it("preserves ownership checks by bubbling up forbidden trip access", async () => {
    tripServiceMock.getTripForCurrentUser.mockRejectedValue(new AuthorizationError("Forbidden"));

    await expect(syncWeatherSnapshotForCurrentUser("trip_1")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    expect(prismaMock.weatherSnapshot.create).not.toHaveBeenCalled();
  });
});
