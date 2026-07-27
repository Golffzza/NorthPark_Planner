import { describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/trips/[id]/evaluate/route";
import { AuthorizationError, NotFoundError } from "@/lib/services/trip-service";

const evaluationServiceMock = vi.hoisted(() => ({
  evaluateTripForCurrentUser: vi.fn(),
}));

vi.mock("@/lib/services/evaluation-service", () => evaluationServiceMock);

describe("POST /api/v1/trips/[id]/evaluate", () => {
  it("returns the evaluation result as JSON", async () => {
    evaluationServiceMock.evaluateTripForCurrentUser.mockResolvedValue({
      tripId: "trip_1",
      data: {
        id: "eval_1",
        totalScore: 88,
        level: "EXCELLENT",
      },
    });

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/evaluate"), {
      params: Promise.resolve({ id: "trip_1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        tripId: "trip_1",
        evaluation: {
          id: "eval_1",
          totalScore: 88,
          level: "EXCELLENT",
        },
      },
    });
  });

  it("returns 404 when the trip is missing", async () => {
    evaluationServiceMock.evaluateTripForCurrentUser.mockRejectedValue(new NotFoundError("Trip not found"));

    const response = await POST(new Request("http://localhost/api/v1/trips/missing/evaluate"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "not_found",
        message: "Trip not found",
      },
    });
  });

  it("returns 403 when the trip does not belong to the mock current user", async () => {
    evaluationServiceMock.evaluateTripForCurrentUser.mockRejectedValue(
      new AuthorizationError("Forbidden"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_2/evaluate"), {
      params: Promise.resolve({ id: "trip_2" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "forbidden",
        message: "Forbidden",
      },
    });
  });
});
