import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError, NotFoundError, getTripForCurrentUser } from "@/lib/services/trip-service";

const prismaMock = vi.hoisted(() => ({
  trip: {
    findUnique: vi.fn(),
  },
}));

const currentUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: currentUserMock,
}));

describe("getTripForCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserMock.mockResolvedValue({ id: "user_1" });
  });

  it("returns the trip when it belongs to the mock current user", async () => {
    prismaMock.trip.findUnique.mockResolvedValue({
      id: "trip_1",
      userId: "user_1",
      park: {
        id: "park_1",
        openTime: "06:00",
        closeTime: "18:00",
      },
    });

    const trip = await getTripForCurrentUser("trip_1");

    expect(trip.id).toBe("trip_1");
    expect(prismaMock.trip.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "trip_1" },
      }),
    );
  });

  it("throws not found when the trip does not exist", async () => {
    prismaMock.trip.findUnique.mockResolvedValue(null);

    await expect(getTripForCurrentUser("missing_trip")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws forbidden when the trip belongs to another user", async () => {
    prismaMock.trip.findUnique.mockResolvedValue({
      id: "trip_2",
      userId: "user_2",
      park: {
        id: "park_1",
        openTime: "06:00",
        closeTime: "18:00",
      },
    });

    await expect(getTripForCurrentUser("trip_2")).rejects.toBeInstanceOf(AuthorizationError);
  });
});
