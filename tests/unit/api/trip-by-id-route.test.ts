import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, PATCH } from "@/app/api/v1/trips/[id]/route";
import { AuthorizationError, NotFoundError } from "@/lib/services/trip-service";

const tripServiceMock = vi.hoisted(() => ({
  cancelTripForCurrentUser: vi.fn(),
  getTripDetailForCurrentUser: vi.fn(),
  updateTripForCurrentUser: vi.fn(),
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

describe("/api/v1/trips/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns trip detail", async () => {
    tripServiceMock.getTripDetailForCurrentUser.mockResolvedValue({
      id: "trip_1",
      evaluations: [{ id: "eval_1" }],
      park: { id: "park_1" },
    });

    const response = await GET(new Request("http://localhost/api/v1/trips/trip_1"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(tripServiceMock.getTripDetailForCurrentUser).toHaveBeenCalledWith("trip_1");
    expect(body.data.id).toBe("trip_1");
  });

  it("updates a trip", async () => {
    tripServiceMock.updateTripForCurrentUser.mockResolvedValue({
      id: "trip_1",
      status: "DRAFT",
    });

    const response = await PATCH(
      new Request("http://localhost/api/v1/trips/trip_1", {
        method: "PATCH",
        body: JSON.stringify({
          departAt: "09:00",
        }),
      }),
      { params: Promise.resolve({ id: "trip_1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(tripServiceMock.updateTripForCurrentUser).toHaveBeenCalled();
    expect(body.data.status).toBe("DRAFT");
  });

  it("returns 422 for invalid patch payload", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/v1/trips/trip_1", {
        method: "PATCH",
        body: JSON.stringify({
          travelerCount: 0,
        }),
      }),
      { params: Promise.resolve({ id: "trip_1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
  });

  it("soft deletes a trip", async () => {
    tripServiceMock.cancelTripForCurrentUser.mockResolvedValue({
      id: "trip_1",
      status: "CANCELLED",
    });

    const response = await DELETE(new Request("http://localhost/api/v1/trips/trip_1"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(tripServiceMock.cancelTripForCurrentUser).toHaveBeenCalledWith("trip_1");
    expect(body.data.status).toBe("CANCELLED");
  });

  it("returns 403 for forbidden trip access", async () => {
    tripServiceMock.getTripDetailForCurrentUser.mockRejectedValue(new AuthorizationError("Forbidden"));

    const response = await GET(new Request("http://localhost/api/v1/trips/trip_2"), {
      params: Promise.resolve({ id: "trip_2" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
  });

  it("returns 404 when trip does not exist", async () => {
    tripServiceMock.cancelTripForCurrentUser.mockRejectedValue(new NotFoundError("Trip not found"));

    const response = await DELETE(new Request("http://localhost/api/v1/trips/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("not_found");
  });
});
