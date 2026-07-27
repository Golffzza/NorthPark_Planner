import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/trips/[id]/route-sync/route";
import { AuthorizationError } from "@/lib/services/trip-service";
import {
  RouteSyncUnavailableError,
  TripRouteContextError,
} from "@/lib/snapshots/route-snapshot-service";

const routeSnapshotServiceMock = vi.hoisted(() => ({
  syncRouteSnapshotForCurrentUser: vi.fn(),
}));

vi.mock("@/lib/snapshots/route-snapshot-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/snapshots/route-snapshot-service")>(
    "@/lib/snapshots/route-snapshot-service",
  );

  return {
    ...actual,
    ...routeSnapshotServiceMock,
  };
});

describe("POST /api/v1/trips/[id]/route-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the saved route snapshot", async () => {
    routeSnapshotServiceMock.syncRouteSnapshotForCurrentUser.mockResolvedValue({
      id: "route_1",
      tripId: "trip_1",
      distanceMeters: 128734.5,
    });

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/route-sync"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(routeSnapshotServiceMock.syncRouteSnapshotForCurrentUser).toHaveBeenCalledWith("trip_1");
    expect(body.data.id).toBe("route_1");
  });

  it("returns 422 when the trip is missing origin coordinates", async () => {
    routeSnapshotServiceMock.syncRouteSnapshotForCurrentUser.mockRejectedValue(
      new TripRouteContextError(
        "Route sync requires origin coordinates before it can calculate distance",
        "missing_origin_coordinates",
      ),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/route-sync"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("missing_origin_coordinates");
  });

  it("returns 422 when the park is missing destination coordinates", async () => {
    routeSnapshotServiceMock.syncRouteSnapshotForCurrentUser.mockRejectedValue(
      new TripRouteContextError(
        "Trip park coordinates are required before route sync can run",
        "missing_destination_coordinates",
      ),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/route-sync"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("missing_destination_coordinates");
  });

  it("returns 403 when the trip does not belong to the current user", async () => {
    routeSnapshotServiceMock.syncRouteSnapshotForCurrentUser.mockRejectedValue(
      new AuthorizationError("Forbidden"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/route-sync"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
  });

  it("returns 502 when the OSRM upstream cannot be used", async () => {
    routeSnapshotServiceMock.syncRouteSnapshotForCurrentUser.mockRejectedValue(
      new RouteSyncUnavailableError("OSRM request failed"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/route-sync"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("route_sync_unavailable");
  });
});
