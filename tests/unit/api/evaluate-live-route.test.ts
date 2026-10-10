import { describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/trips/[id]/evaluate-live/route";
import {
  MissingLiveSnapshotError,
} from "@/lib/orchestration/trip-live-evaluation-orchestrator";
import { refreshTripEvaluationForCurrentUser } from "@/lib/orchestration/trip-refresh-evaluation-orchestrator";
import { AuthorizationError, CancelledTripEvaluationError, NotFoundError } from "@/lib/services/trip-service";

vi.mock("@/lib/orchestration/trip-refresh-evaluation-orchestrator", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/orchestration/trip-refresh-evaluation-orchestrator")
  >("@/lib/orchestration/trip-refresh-evaluation-orchestrator");

  return {
    ...actual,
    refreshTripEvaluationForCurrentUser: vi.fn(),
  };
});

const evaluationOrchestratorMock = vi.mocked(refreshTripEvaluationForCurrentUser);

describe("POST /api/v1/trips/[id]/evaluate-live", () => {
  it("returns 409 for cancelled trips", async () => {
    evaluationOrchestratorMock.mockRejectedValue(new CancelledTripEvaluationError());
    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/evaluate-live"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("trip_cancelled");
  });
  it("returns the live evaluation result as JSON", async () => {
    evaluationOrchestratorMock.mockResolvedValue({
      tripId: "trip_1",
      snapshots: {} as never,
      evaluation: {
        id: "eval_2",
        totalScore: 87,
        level: "EXCELLENT",
      } as never,
    });

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/evaluate-live"), {
      params: Promise.resolve({ id: "trip_1" }),
    });

    expect(response.status).toBe(200);
    expect(evaluationOrchestratorMock).toHaveBeenCalledWith("trip_1");
    await expect(response.json()).resolves.toEqual({
      data: {
        tripId: "trip_1",
        evaluation: {
          id: "eval_2",
          totalScore: 87,
          level: "EXCELLENT",
        },
      },
    });
  });

  it("returns 422 when the weather snapshot is missing", async () => {
    evaluationOrchestratorMock.mockRejectedValue(
      new MissingLiveSnapshotError("Weather snapshot is required for live evaluation", "missing_weather_snapshot"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/evaluate-live"), {
      params: Promise.resolve({ id: "trip_1" }),
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "missing_weather_snapshot",
        message: "Weather snapshot is required for live evaluation",
      },
    });
  });

  it("returns 422 when the route snapshot is missing", async () => {
    evaluationOrchestratorMock.mockRejectedValue(
      new MissingLiveSnapshotError("Route snapshot is required for live evaluation", "missing_route_snapshot"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/evaluate-live"), {
      params: Promise.resolve({ id: "trip_1" }),
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "missing_route_snapshot",
        message: "Route snapshot is required for live evaluation",
      },
    });
  });

  it("returns 422 when the sunset snapshot is missing", async () => {
    evaluationOrchestratorMock.mockRejectedValue(
      new MissingLiveSnapshotError("Sunset snapshot is required for live evaluation", "missing_sunset_snapshot"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/evaluate-live"), {
      params: Promise.resolve({ id: "trip_1" }),
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "missing_sunset_snapshot",
        message: "Sunset snapshot is required for live evaluation",
      },
    });
  });

  it("returns 404 when the trip is missing", async () => {
    evaluationOrchestratorMock.mockRejectedValue(new NotFoundError("Trip not found"));

    const response = await POST(new Request("http://localhost/api/v1/trips/missing/evaluate-live"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 403 when the trip does not belong to the current user", async () => {
    evaluationOrchestratorMock.mockRejectedValue(new AuthorizationError("Forbidden"));

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_2/evaluate-live"), {
      params: Promise.resolve({ id: "trip_2" }),
    });

    expect(response.status).toBe(403);
  });
});
