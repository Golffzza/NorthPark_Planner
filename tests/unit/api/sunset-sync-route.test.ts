import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/trips/[id]/sunset-sync/route";
import { AuthorizationError } from "@/lib/services/trip-service";
import {
  SunsetSyncUnavailableError,
  TripSnapshotContextError,
} from "@/lib/snapshots/sunset-snapshot-service";

const sunsetSnapshotServiceMock = vi.hoisted(() => ({
  syncSunsetSnapshotForCurrentUser: vi.fn(),
}));

vi.mock("@/lib/snapshots/sunset-snapshot-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/snapshots/sunset-snapshot-service")>(
    "@/lib/snapshots/sunset-snapshot-service",
  );

  return {
    ...actual,
    ...sunsetSnapshotServiceMock,
  };
});

describe("POST /api/v1/trips/[id]/sunset-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the saved sunset snapshot", async () => {
    sunsetSnapshotServiceMock.syncSunsetSnapshotForCurrentUser.mockResolvedValue({
      id: "sunset_1",
      tripId: "trip_1",
      sunsetLocalTime: "18:43",
    });

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/sunset-sync"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(sunsetSnapshotServiceMock.syncSunsetSnapshotForCurrentUser).toHaveBeenCalledWith(
      "trip_1",
    );
    expect(body.data.id).toBe("sunset_1");
  });

  it("returns 422 when the trip is missing the required geo context", async () => {
    sunsetSnapshotServiceMock.syncSunsetSnapshotForCurrentUser.mockRejectedValue(
      new TripSnapshotContextError("Trip park coordinates are required"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/sunset-sync"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("trip_context_missing");
  });

  it("returns 403 when the trip does not belong to the current user", async () => {
    sunsetSnapshotServiceMock.syncSunsetSnapshotForCurrentUser.mockRejectedValue(
      new AuthorizationError("Forbidden"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/sunset-sync"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
  });

  it("returns 502 when sunset calculation cannot be completed safely", async () => {
    sunsetSnapshotServiceMock.syncSunsetSnapshotForCurrentUser.mockRejectedValue(
      new SunsetSyncUnavailableError("Sunset calculation failed"),
    );

    const response = await POST(new Request("http://localhost/api/v1/trips/trip_1/sunset-sync"), {
      params: Promise.resolve({ id: "trip_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("sunset_sync_unavailable");
  });
});
