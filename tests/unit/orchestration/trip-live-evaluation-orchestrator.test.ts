import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/services/trip-service";
import {
  evaluateLiveTripForCurrentUser,
} from "@/lib/orchestration/trip-live-evaluation-orchestrator";

const tripServiceMock = vi.hoisted(() => ({
  getTripForCurrentUser: vi.fn(),
  getTripIdForCurrentUser: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  weatherSnapshot: {
    findFirst: vi.fn(),
  },
  routeSnapshot: {
    findFirst: vi.fn(),
  },
  sunsetSnapshot: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const txMock = vi.hoisted(() => ({
  tripEvaluation: {
    create: vi.fn(),
  },
  trip: {
    updateMany: vi.fn(),
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

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/services/evaluation-explainer-service", () => ({
  explainTripEvaluation: vi.fn().mockResolvedValue({
    headline: "ผลประเมิน",
    explanation: "คำอธิบาย",
  }),
}));

describe("evaluateLiveTripForCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tripServiceMock.getTripIdForCurrentUser.mockResolvedValue("trip_1");

    tripServiceMock.getTripForCurrentUser.mockResolvedValue({
      id: "trip_1",
      userId: "user_1",
      tripDate: new Date("2026-06-12T00:00:00.000Z"),
      departAt: "08:15",
      originLat: 18.7883,
      originLng: 98.9853,
      travelerCount: 3,
      transportMode: "CAR",
      status: "DRAFT",
      park: {
        id: "park_1",
        openTime: "06:00",
        closeTime: "18:00",
        latitude: 18.5883,
        longitude: 98.4871,
      },
    });

    prismaMock.weatherSnapshot.findFirst.mockResolvedValue({
      id: "weather_1",
      weatherCondition: "CLEAR",
      timezone: "Asia/Bangkok",
      forecastAt: new Date("2026-06-11T17:00:00.000Z"),
      latitude: 18.5883,
      longitude: 98.4871,
      createdAt: new Date("2026-06-12T05:00:00.000Z"),
    });
    prismaMock.routeSnapshot.findFirst.mockResolvedValue({
      id: "route_1",
      durationSeconds: 7200,
      originLat: 18.7883,
      originLng: 98.9853,
      destinationLat: 18.5883,
      destinationLng: 98.4871,
      createdAt: new Date("2026-06-12T05:05:00.000Z"),
    });
    prismaMock.sunsetSnapshot.findFirst.mockResolvedValue({
      id: "sunset_1",
      timezone: "Asia/Bangkok",
      sunsetAt: new Date("2026-06-12T11:43:00.000Z"),
      latitude: 18.5883,
      longitude: 98.4871,
      createdAt: new Date("2026-06-12T05:10:00.000Z"),
    });

    txMock.tripEvaluation.create.mockResolvedValue({
      id: "eval_2",
      tripId: "trip_1",
      weatherSnapshotId: "weather_1",
      routeSnapshotId: "route_1",
      sunsetSnapshotId: "sunset_1",
      totalScore: 87,
      level: "EXCELLENT",
      weatherScore: 95,
      durationScore: 80,
      timeScore: 90,
      userProfileScore: 83,
      summary: "summary",
      recommendation: "recommendation",
      evaluatedAt: new Date("2026-06-12T05:11:00.000Z"),
      createdAt: new Date("2026-06-12T05:11:00.000Z"),
    });
    txMock.trip.updateMany.mockResolvedValue({ count: 1 });

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => unknown) => {
      return callback(txMock);
    });
  });

  it("stores all three exact snapshot IDs with the new live evaluation", async () => {
    const result = await evaluateLiveTripForCurrentUser("trip_1");

    expect(tripServiceMock.getTripForCurrentUser).toHaveBeenCalledWith("trip_1");
    expect(tripServiceMock.getTripForCurrentUser).toHaveBeenCalledTimes(1);
    expect(tripServiceMock.getTripIdForCurrentUser).toHaveBeenCalledWith("trip_1");
    expect(prismaMock.weatherSnapshot.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tripId: "trip_1" },
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(prismaMock.routeSnapshot.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tripId: "trip_1" },
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(prismaMock.sunsetSnapshot.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tripId: "trip_1" },
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(txMock.tripEvaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tripId: "trip_1",
          weatherSnapshotId: "weather_1",
          routeSnapshotId: "route_1",
          sunsetSnapshotId: "sunset_1",
          totalScore: expect.any(Number),
        }),
      }),
    );
    expect(txMock.trip.updateMany).toHaveBeenCalledWith({
      where: { id: "trip_1", status: { not: "CANCELLED" } },
      data: { status: "EVALUATED" },
    });
    expect(result.tripId).toBe("trip_1");
    expect(result.data.id).toBe("eval_2");
  });

  it("returns a specific error when the latest weather snapshot is missing", async () => {
    prismaMock.weatherSnapshot.findFirst.mockResolvedValue(null);

    await expect(evaluateLiveTripForCurrentUser("trip_1")).rejects.toMatchObject({
      name: "MissingLiveSnapshotError",
      code: "missing_weather_snapshot",
    });
  });

  it("returns a specific error when the latest route snapshot is missing", async () => {
    prismaMock.routeSnapshot.findFirst.mockResolvedValue(null);

    await expect(evaluateLiveTripForCurrentUser("trip_1")).rejects.toMatchObject({
      name: "MissingLiveSnapshotError",
      code: "missing_route_snapshot",
    });
  });

  it("returns a specific error when the latest sunset snapshot is missing", async () => {
    prismaMock.sunsetSnapshot.findFirst.mockResolvedValue(null);

    await expect(evaluateLiveTripForCurrentUser("trip_1")).rejects.toMatchObject({
      name: "MissingLiveSnapshotError",
      code: "missing_sunset_snapshot",
    });
  });

  it("preserves ownership checks by bubbling up forbidden trip access", async () => {
    tripServiceMock.getTripForCurrentUser.mockRejectedValue(new AuthorizationError("Forbidden"));

    await expect(evaluateLiveTripForCurrentUser("trip_1")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("adds a new evaluation history record instead of overwriting prior history", async () => {
    await evaluateLiveTripForCurrentUser("trip_1");

    expect(txMock.tripEvaluation.create).toHaveBeenCalledTimes(1);
    expect(txMock.trip.updateMany).toHaveBeenCalledTimes(1);
  });

  it("propagates transaction failures instead of returning an ephemeral evaluation", async () => {
    const databaseError = new Error("transaction failed");
    prismaMock.$transaction.mockRejectedValue(databaseError);

    await expect(evaluateLiveTripForCurrentUser("trip_1")).rejects.toBe(databaseError);
  });

  it("rejects a cancelled trip before querying snapshots or writing history", async () => {
    tripServiceMock.getTripForCurrentUser.mockResolvedValue({ id: "trip_1", status: "CANCELLED" });
    await expect(evaluateLiveTripForCurrentUser("trip_1")).rejects.toMatchObject({
      name: "CancelledTripEvaluationError",
    });
    expect(prismaMock.weatherSnapshot.findFirst).not.toHaveBeenCalled();
    expect(txMock.tripEvaluation.create).not.toHaveBeenCalled();
  });

  it("queries and binds the exact persisted IDs supplied by refresh", async () => {
    await evaluateLiveTripForCurrentUser("trip_1", {
      weatherSnapshotId: "weather_1", routeSnapshotId: "route_1", sunsetSnapshotId: "sunset_1",
    });
    expect(prismaMock.weatherSnapshot.findFirst).toHaveBeenCalledWith({
      where: { tripId: "trip_1", id: "weather_1" },
    });
    expect(prismaMock.routeSnapshot.findFirst).toHaveBeenCalledWith({
      where: { tripId: "trip_1", id: "route_1" },
    });
    expect(prismaMock.sunsetSnapshot.findFirst).toHaveBeenCalledWith({
      where: { tripId: "trip_1", id: "sunset_1" },
    });
    expect(txMock.tripEvaluation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ weatherSnapshotId: "weather_1", routeSnapshotId: "route_1", sunsetSnapshotId: "sunset_1" }),
    }));
  });
});
