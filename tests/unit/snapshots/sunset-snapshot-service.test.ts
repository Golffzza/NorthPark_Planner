import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/services/trip-service";
import {
  TripSnapshotContextError,
  syncSunsetSnapshotForCurrentUser,
} from "@/lib/snapshots/sunset-snapshot-service";

const tripServiceMock = vi.hoisted(() => ({
  getTripForCurrentUser: vi.fn(),
}));

const sunsetServiceMock = vi.hoisted(() => ({
  calculateSunsetSnapshot: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  sunsetSnapshot: {
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

vi.mock("@/lib/integrations/sun/sunset-service", () => sunsetServiceMock);
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

describe("syncSunsetSnapshotForCurrentUser", () => {
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

    sunsetServiceMock.calculateSunsetSnapshot.mockReturnValue({
      source: "SYSTEM",
      timezone: "Asia/Bangkok",
      sunsetAt: new Date("2026-06-12T11:43:00.000Z"),
      sunsetLocalTime: "18:43",
    });

    prismaMock.sunsetSnapshot.create.mockResolvedValue({
      id: "sunset_1",
      tripId: "trip_1",
      source: "SYSTEM",
      timezone: "Asia/Bangkok",
      sunsetAt: new Date("2026-06-12T11:43:00.000Z"),
      sunsetLocalTime: "18:43",
      createdAt: new Date("2026-06-12T11:43:05.000Z"),
    });
  });

  it("calculates sunset in-system and stores a trip-linked history snapshot", async () => {
    const snapshot = await syncSunsetSnapshotForCurrentUser("trip_1");

    expect(sunsetServiceMock.calculateSunsetSnapshot).toHaveBeenCalledWith({
      latitude: 18.5883,
      longitude: 98.4871,
      tripDate: new Date("2026-06-12T00:00:00.000Z"),
      timezone: "Asia/Bangkok",
    });
    expect(prismaMock.sunsetSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tripId: "trip_1",
          sunsetLocalTime: "18:43",
          source: "SYSTEM",
        }),
      }),
    );
    expect(snapshot.id).toBe("sunset_1");
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
        latitude: 18.5883,
        longitude: null,
      },
    });

    await expect(syncSunsetSnapshotForCurrentUser("trip_1")).rejects.toBeInstanceOf(
      TripSnapshotContextError,
    );
    expect(prismaMock.sunsetSnapshot.create).not.toHaveBeenCalled();
  });

  it("preserves ownership checks by bubbling up forbidden trip access", async () => {
    tripServiceMock.getTripForCurrentUser.mockRejectedValue(new AuthorizationError("Forbidden"));

    await expect(syncSunsetSnapshotForCurrentUser("trip_1")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    expect(prismaMock.sunsetSnapshot.create).not.toHaveBeenCalled();
  });
});
