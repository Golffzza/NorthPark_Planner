import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError, NotFoundError } from "@/lib/services/trip-service";
import {
  RouteSyncUnavailableError,
  TripRouteContextError,
} from "@/lib/snapshots/route-snapshot-service";
import {
  TripSnapshotContextError,
  WeatherSyncUnavailableError,
} from "@/lib/snapshots/weather-snapshot-service";
import { SunsetSyncUnavailableError } from "@/lib/snapshots/sunset-snapshot-service";
import { refreshTripEvaluationForCurrentUser } from "@/lib/orchestration/trip-refresh-evaluation-orchestrator";

const tripServiceMock = vi.hoisted(() => ({
  getTripForCurrentUser: vi.fn(),
}));

const weatherSnapshotServiceMock = vi.hoisted(() => ({
  syncWeatherSnapshotForCurrentUser: vi.fn(),
}));

const sunsetSnapshotServiceMock = vi.hoisted(() => ({
  syncSunsetSnapshotForCurrentUser: vi.fn(),
}));

const routeSnapshotServiceMock = vi.hoisted(() => ({
  syncRouteSnapshotForCurrentUser: vi.fn(),
}));

const liveEvaluationOrchestratorMock = vi.hoisted(() => ({
  evaluateLiveTripForCurrentUser: vi.fn(),
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

vi.mock("@/lib/snapshots/weather-snapshot-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/snapshots/weather-snapshot-service")>(
    "@/lib/snapshots/weather-snapshot-service",
  );

  return {
    ...actual,
    ...weatherSnapshotServiceMock,
  };
});

vi.mock("@/lib/snapshots/sunset-snapshot-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/snapshots/sunset-snapshot-service")>(
    "@/lib/snapshots/sunset-snapshot-service",
  );

  return {
    ...actual,
    ...sunsetSnapshotServiceMock,
  };
});

vi.mock("@/lib/snapshots/route-snapshot-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/snapshots/route-snapshot-service")>(
    "@/lib/snapshots/route-snapshot-service",
  );

  return {
    ...actual,
    ...routeSnapshotServiceMock,
  };
});

vi.mock("@/lib/orchestration/trip-live-evaluation-orchestrator", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/orchestration/trip-live-evaluation-orchestrator")
  >("@/lib/orchestration/trip-live-evaluation-orchestrator");

  return {
    ...actual,
    ...liveEvaluationOrchestratorMock,
  };
});

describe("refreshTripEvaluationForCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    tripServiceMock.getTripForCurrentUser.mockResolvedValue({
      id: "trip_1",
      userId: "user_1",
      originLat: 18.7883,
      originLng: 98.9853,
      park: {
        id: "park_1",
        latitude: 18.5883,
        longitude: 98.4871,
      },
    });

    weatherSnapshotServiceMock.syncWeatherSnapshotForCurrentUser.mockResolvedValue({
      id: "weather_1",
      tripId: "trip_1",
      weatherCondition: "CLEAR",
      source: "open-meteo",
    });
    sunsetSnapshotServiceMock.syncSunsetSnapshotForCurrentUser.mockResolvedValue({
      id: "sunset_1",
      tripId: "trip_1",
      sunsetLocalTime: "18:43",
      source: "calculated",
    });
    routeSnapshotServiceMock.syncRouteSnapshotForCurrentUser.mockResolvedValue({
      id: "route_1",
      tripId: "trip_1",
      distanceMeters: 128734.5,
      durationSeconds: 7200,
      source: "osrm",
    });
    liveEvaluationOrchestratorMock.evaluateLiveTripForCurrentUser.mockResolvedValue({
      tripId: "trip_1",
      data: {
        id: "eval_2",
        totalScore: 87,
        level: "EXCELLENT",
        summary: "summary",
      },
    });
  });

  it("refreshes snapshots and returns the latest evaluation with snapshot summary", async () => {
    const result = await refreshTripEvaluationForCurrentUser("trip_1");

    expect(tripServiceMock.getTripForCurrentUser).toHaveBeenCalledWith("trip_1");
    expect(weatherSnapshotServiceMock.syncWeatherSnapshotForCurrentUser).toHaveBeenCalledWith("trip_1");
    expect(sunsetSnapshotServiceMock.syncSunsetSnapshotForCurrentUser).toHaveBeenCalledWith("trip_1");
    expect(routeSnapshotServiceMock.syncRouteSnapshotForCurrentUser).toHaveBeenCalledWith("trip_1");
    expect(liveEvaluationOrchestratorMock.evaluateLiveTripForCurrentUser).toHaveBeenCalledWith("trip_1");
    expect(result).toEqual({
      tripId: "trip_1",
      snapshots: {
        weather: {
          id: "weather_1",
          source: "open-meteo",
          weatherCondition: "CLEAR",
        },
        sunset: {
          id: "sunset_1",
          source: "calculated",
          sunsetLocalTime: "18:43",
        },
        route: {
          id: "route_1",
          source: "osrm",
          distanceMeters: 128734.5,
          durationSeconds: 7200,
        },
      },
      evaluation: {
        id: "eval_2",
        totalScore: 87,
        level: "EXCELLENT",
        summary: "summary",
      },
    });
  });

  it("returns the origin coordinate error when the trip is not route-sync ready", async () => {
    routeSnapshotServiceMock.syncRouteSnapshotForCurrentUser.mockRejectedValue(
      new TripRouteContextError(
        "Route sync requires origin coordinates before it can calculate distance",
        "missing_origin_coordinates",
      ),
    );

    await expect(refreshTripEvaluationForCurrentUser("trip_1")).rejects.toMatchObject({
      name: "TripRouteContextError",
      code: "missing_origin_coordinates",
    });
  });

  it("returns a safe upstream error when weather sync fails", async () => {
    weatherSnapshotServiceMock.syncWeatherSnapshotForCurrentUser.mockRejectedValue(
      new WeatherSyncUnavailableError("Open-Meteo request failed"),
    );

    await expect(refreshTripEvaluationForCurrentUser("trip_1")).rejects.toBeInstanceOf(
      WeatherSyncUnavailableError,
    );
  });

  it("returns a safe upstream error when route sync fails", async () => {
    routeSnapshotServiceMock.syncRouteSnapshotForCurrentUser.mockRejectedValue(
      new RouteSyncUnavailableError("OSRM request failed"),
    );

    await expect(refreshTripEvaluationForCurrentUser("trip_1")).rejects.toBeInstanceOf(
      RouteSyncUnavailableError,
    );
  });

  it("preserves ownership checks by bubbling up forbidden trip access", async () => {
    tripServiceMock.getTripForCurrentUser.mockRejectedValue(new AuthorizationError("Forbidden"));

    await expect(refreshTripEvaluationForCurrentUser("trip_1")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("delegates to live evaluation so a new evaluation history record and evaluated status can be produced", async () => {
    await refreshTripEvaluationForCurrentUser("trip_1");

    expect(liveEvaluationOrchestratorMock.evaluateLiveTripForCurrentUser).toHaveBeenCalledTimes(1);
  });

  it("bubbles up not found when the trip does not exist", async () => {
    tripServiceMock.getTripForCurrentUser.mockRejectedValue(new NotFoundError("Trip not found"));

    await expect(refreshTripEvaluationForCurrentUser("missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("returns a safe upstream error when sunset sync fails", async () => {
    sunsetSnapshotServiceMock.syncSunsetSnapshotForCurrentUser.mockRejectedValue(
      new SunsetSyncUnavailableError("Sunset calculation failed"),
    );

    await expect(refreshTripEvaluationForCurrentUser("trip_1")).rejects.toBeInstanceOf(
      SunsetSyncUnavailableError,
    );
  });

  it("returns the park coordinate error when weather or sunset sync lacks destination context", async () => {
    weatherSnapshotServiceMock.syncWeatherSnapshotForCurrentUser.mockRejectedValue(
      new TripSnapshotContextError("Trip park coordinates are required"),
    );

    await expect(refreshTripEvaluationForCurrentUser("trip_1")).rejects.toBeInstanceOf(
      TripSnapshotContextError,
    );
  });
});
