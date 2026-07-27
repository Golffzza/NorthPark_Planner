import { describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/trips/[id]/refresh-evaluation/route";
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

vi.mock("@/lib/orchestration/trip-refresh-evaluation-orchestrator", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/orchestration/trip-refresh-evaluation-orchestrator")
  >("@/lib/orchestration/trip-refresh-evaluation-orchestrator");

  return {
    ...actual,
    refreshTripEvaluationForCurrentUser: vi.fn(),
  };
});

const refreshEvaluationOrchestratorMock = vi.mocked(refreshTripEvaluationForCurrentUser);

describe("POST /api/v1/trips/[id]/refresh-evaluation", () => {
  it("returns the refreshed evaluation and snapshot summary as JSON", async () => {
    refreshEvaluationOrchestratorMock.mockResolvedValue({
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
      } as never,
    });

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/refresh-evaluation"), {
      params: Promise.resolve({ id: "trip_1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
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
        },
      },
    });
  });

  it("returns 422 when origin coordinates are missing", async () => {
    refreshEvaluationOrchestratorMock.mockRejectedValue(
      new TripRouteContextError(
        "Route sync requires origin coordinates before it can calculate distance",
        "missing_origin_coordinates",
      ),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/refresh-evaluation"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("missing_origin_coordinates");
  });

  it("returns 422 when park destination coordinates are missing", async () => {
    refreshEvaluationOrchestratorMock.mockRejectedValue(
      new TripRouteContextError(
        "Trip park coordinates are required before route sync can run",
        "missing_destination_coordinates",
      ),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/refresh-evaluation"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("missing_destination_coordinates");
  });

  it("returns 422 when weather or sunset sync lacks park coordinates", async () => {
    refreshEvaluationOrchestratorMock.mockRejectedValue(
      new TripSnapshotContextError("Trip park coordinates are required"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/refresh-evaluation"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("trip_context_missing");
  });

  it("returns 502 when weather sync cannot use the upstream provider safely", async () => {
    refreshEvaluationOrchestratorMock.mockRejectedValue(
      new WeatherSyncUnavailableError("Open-Meteo request failed"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/refresh-evaluation"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("weather_sync_unavailable");
  });

  it("returns 502 when route sync cannot use the upstream provider safely", async () => {
    refreshEvaluationOrchestratorMock.mockRejectedValue(
      new RouteSyncUnavailableError("OSRM request failed"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/refresh-evaluation"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("route_sync_unavailable");
  });

  it("returns 502 when sunset sync cannot complete safely", async () => {
    refreshEvaluationOrchestratorMock.mockRejectedValue(
      new SunsetSyncUnavailableError("Sunset calculation failed"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/refresh-evaluation"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("sunset_sync_unavailable");
  });

  it("returns 404 when the trip is missing", async () => {
    refreshEvaluationOrchestratorMock.mockRejectedValue(new NotFoundError("Trip not found"));

    const response = await POST(new Request("http://localhost/api/v1/trips/missing/refresh-evaluation"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 403 when the trip does not belong to the current user", async () => {
    refreshEvaluationOrchestratorMock.mockRejectedValue(new AuthorizationError("Forbidden"));

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_2/refresh-evaluation"), {
      params: Promise.resolve({ id: "trip_2" }),
    });

    expect(response.status).toBe(403);
  });
});
