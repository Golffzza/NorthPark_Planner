import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/v1/trips/route";

const tripServiceMock = vi.hoisted(() => ({
  createTripForCurrentUser: vi.fn(),
  listTripsForCurrentUser: vi.fn(),
}));

vi.mock("@/lib/services/trip-service", () => tripServiceMock);

describe("/api/v1/trips route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns current user trips with optional status filter", async () => {
    tripServiceMock.listTripsForCurrentUser.mockResolvedValue([
      {
        id: "trip_1",
        status: "EVALUATED",
        latestEvaluation: {
          id: "eval_1",
          totalScore: 88,
          level: "EXCELLENT",
          summary: "summary",
          evaluatedAt: "2026-05-21T09:00:00.000Z",
        },
      },
    ]);

    const response = await GET(new Request("http://localhost/api/v1/trips?status=EVALUATED"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(tripServiceMock.listTripsForCurrentUser).toHaveBeenCalledWith("EVALUATED");
    expect(body.data).toHaveLength(1);
  });

  it("creates a trip and returns location header", async () => {
    tripServiceMock.createTripForCurrentUser.mockResolvedValue({
      id: "trip_1",
      status: "DRAFT",
    });

    const response = await POST(
      new Request("http://localhost/api/v1/trips", {
        method: "POST",
        body: JSON.stringify({
          parkId: "park_1",
          tripDate: "2026-06-01",
          departAt: "07:30",
          originText: "Chiang Mai",
          originLat: 18.7883,
          originLng: 98.9853,
          transportMode: "CAR",
          travelerCount: 3,
          weatherCondition: "CLOUDY",
          estimatedTravelMinutes: 90,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("Location")).toBe("/api/v1/trips/trip_1");
    expect(tripServiceMock.createTripForCurrentUser).toHaveBeenCalled();
    expect(body.data.id).toBe("trip_1");
  });

  it("returns 400 for malformed json on create", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/trips", {
        method: "POST",
        body: "{invalid",
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("bad_request");
  });

  it("returns 422 for invalid create payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/trips", {
        method: "POST",
        body: JSON.stringify({
          parkId: "",
          tripDate: "invalid-date",
          departAt: "7am",
          originText: "",
          transportMode: "PLANE",
          travelerCount: 0,
          weatherCondition: "SUNNY",
          estimatedTravelMinutes: -5,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(Array.isArray(body.error.details)).toBe(true);
  });
});
