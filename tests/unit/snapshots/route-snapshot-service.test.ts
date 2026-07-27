import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/services/trip-service";
import {
  RouteSyncUnavailableError,
  syncRouteSnapshotForCurrentUser,
} from "@/lib/snapshots/route-snapshot-service";

const tripServiceMock = vi.hoisted(() => ({
  getTripForCurrentUser: vi.fn(),
}));

const osrmServiceMock = vi.hoisted(() => ({
  fetchOsrmRouteSnapshot: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  routeSnapshot: {
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

vi.mock("@/lib/integrations/osrm/osrm-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/integrations/osrm/osrm-service")>(
    "@/lib/integrations/osrm/osrm-service",
  );

  return {
    ...actual,
    ...osrmServiceMock,
  };
});
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

describe("syncRouteSnapshotForCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    tripServiceMock.getTripForCurrentUser.mockResolvedValue({
      id: "trip_1",
      userId: "user_1",
      tripDate: new Date("2026-06-12T00:00:00.000Z"),
      originLat: 18.7993,
      originLng: 98.9871,
      park: {
        id: "park_1",
        openTime: "06:00",
        closeTime: "18:00",
        latitude: 18.5883,
        longitude: 98.4871,
      },
    });

    osrmServiceMock.fetchOsrmRouteSnapshot.mockResolvedValue({
      source: "OSRM",
      distanceMeters: 128734.5,
      durationSeconds: 8021.4,
      geometryJson: {
        type: "LineString",
      },
      rawJson: {
        code: "Ok",
      },
    });

    prismaMock.routeSnapshot.create.mockResolvedValue({
      id: "route_1",
      tripId: "trip_1",
      source: "OSRM",
      distanceMeters: 128734.5,
      durationSeconds: 8021.4,
      createdAt: new Date("2026-06-12T05:01:00.000Z"),
    });
  });

  it("fetches route distance data and persists a history snapshot for the current user's trip", async () => {
    const snapshot = await syncRouteSnapshotForCurrentUser("trip_1");

    expect(tripServiceMock.getTripForCurrentUser).toHaveBeenCalledWith("trip_1");
    expect(osrmServiceMock.fetchOsrmRouteSnapshot).toHaveBeenCalledWith({
      originLat: 18.7993,
      originLng: 98.9871,
      destinationLat: 18.5883,
      destinationLng: 98.4871,
    });
    expect(prismaMock.routeSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tripId: "trip_1",
          distanceMeters: 128734.5,
          durationSeconds: 8021.4,
        }),
      }),
    );
    expect(snapshot.id).toBe("route_1");
  });

  it("fails safely when the trip is missing origin coordinates", async () => {
    tripServiceMock.getTripForCurrentUser.mockResolvedValue({
      id: "trip_1",
      userId: "user_1",
      tripDate: new Date("2026-06-12T00:00:00.000Z"),
      originLat: null,
      originLng: null,
      park: {
        id: "park_1",
        openTime: "06:00",
        closeTime: "18:00",
        latitude: 18.5883,
        longitude: 98.4871,
      },
    });

    await expect(syncRouteSnapshotForCurrentUser("trip_1")).rejects.toMatchObject({
      name: "TripRouteContextError",
      code: "missing_origin_coordinates",
    });
    expect(prismaMock.routeSnapshot.create).not.toHaveBeenCalled();
  });

  it("fails safely when the trip park is missing destination coordinates", async () => {
    tripServiceMock.getTripForCurrentUser.mockResolvedValue({
      id: "trip_1",
      userId: "user_1",
      tripDate: new Date("2026-06-12T00:00:00.000Z"),
      originLat: 18.7993,
      originLng: 98.9871,
      park: {
        id: "park_1",
        openTime: "06:00",
        closeTime: "18:00",
        latitude: null,
        longitude: null,
      },
    });

    await expect(syncRouteSnapshotForCurrentUser("trip_1")).rejects.toMatchObject({
      name: "TripRouteContextError",
      code: "missing_destination_coordinates",
    });
    expect(prismaMock.routeSnapshot.create).not.toHaveBeenCalled();
  });

  it("preserves ownership checks by bubbling up forbidden trip access", async () => {
    tripServiceMock.getTripForCurrentUser.mockRejectedValue(new AuthorizationError("Forbidden"));

    await expect(syncRouteSnapshotForCurrentUser("trip_1")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    expect(prismaMock.routeSnapshot.create).not.toHaveBeenCalled();
  });

  it("translates OSRM failures into a route sync unavailable error", async () => {
    osrmServiceMock.fetchOsrmRouteSnapshot.mockRejectedValue(
      new RouteSyncUnavailableError("OSRM request failed"),
    );

    await expect(syncRouteSnapshotForCurrentUser("trip_1")).rejects.toBeInstanceOf(
      RouteSyncUnavailableError,
    );
  });
});
