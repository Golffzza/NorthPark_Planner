import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/trips/[id]/weather-sync/route";
import { AuthorizationError } from "@/lib/services/trip-service";
import {
  TripSnapshotContextError,
  WeatherSyncUnavailableError,
} from "@/lib/snapshots/weather-snapshot-service";

const weatherSnapshotServiceMock = vi.hoisted(() => ({
  syncWeatherSnapshotForCurrentUser: vi.fn(),
}));

vi.mock("@/lib/snapshots/weather-snapshot-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/snapshots/weather-snapshot-service")>(
    "@/lib/snapshots/weather-snapshot-service",
  );

  return {
    ...actual,
    ...weatherSnapshotServiceMock,
  };
});

describe("POST /api/v1/trips/[id]/weather-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the saved weather snapshot", async () => {
    weatherSnapshotServiceMock.syncWeatherSnapshotForCurrentUser.mockResolvedValue({
      id: "weather_1",
      tripId: "trip_1",
      weatherCondition: "LIGHT_RAIN",
    });

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/weather-sync"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(weatherSnapshotServiceMock.syncWeatherSnapshotForCurrentUser).toHaveBeenCalledWith(
      "trip_1",
    );
    expect(body.data.id).toBe("weather_1");
  });

  it("returns 403 when the trip does not belong to the current user", async () => {
    weatherSnapshotServiceMock.syncWeatherSnapshotForCurrentUser.mockRejectedValue(
      new AuthorizationError("Forbidden"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/weather-sync"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
  });

  it("returns 422 when the trip is missing the required geo context", async () => {
    weatherSnapshotServiceMock.syncWeatherSnapshotForCurrentUser.mockRejectedValue(
      new TripSnapshotContextError("Trip park coordinates are required"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/weather-sync"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("trip_context_missing");
  });

  it("returns 502 when the upstream free weather provider cannot be used", async () => {
    weatherSnapshotServiceMock.syncWeatherSnapshotForCurrentUser.mockRejectedValue(
      new WeatherSyncUnavailableError("Open-Meteo request failed"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/weather-sync"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("weather_sync_unavailable");
  });
});
