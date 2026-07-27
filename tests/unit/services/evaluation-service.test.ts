import { beforeEach, describe, expect, it, vi } from "vitest";

import { evaluateTripForCurrentUser } from "@/lib/services/evaluation-service";

const tripServiceMock = vi.hoisted(() => ({
  getTripForCurrentUser: vi.fn(),
}));

const txMock = vi.hoisted(() => ({
  tripEvaluation: {
    create: vi.fn(),
  },
  trip: {
    update: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
}));

vi.mock("@/lib/services/trip-service", () => tripServiceMock);
vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("evaluateTripForCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tripServiceMock.getTripForCurrentUser.mockResolvedValue({
      id: "trip_1",
      userId: "user_1",
      departAt: "08:00",
      weatherCondition: "CLEAR",
      estimatedTravelMinutes: 120,
      mockSunsetTime: "18:30",
      travelerCount: 2,
      transportMode: "CAR",
      park: {
        id: "park_1",
        openTime: "06:00",
        closeTime: "18:00",
      },
    });

    txMock.tripEvaluation.create.mockResolvedValue({
      id: "eval_1",
      tripId: "trip_1",
      totalScore: 88,
      level: "EXCELLENT",
      weatherScore: 95,
      durationScore: 80,
      timeScore: 90,
      userProfileScore: 83,
      summary: "summary",
      recommendation: "recommendation",
      evaluatedAt: new Date("2026-05-28T12:00:00.000Z"),
      createdAt: new Date("2026-05-28T12:00:00.000Z"),
    });
    txMock.trip.update.mockResolvedValue({
      id: "trip_1",
      status: "EVALUATED",
    });

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => unknown) => {
      return callback(txMock);
    });
  });

  it("creates a new evaluation history record and updates trip status", async () => {
    const result = await evaluateTripForCurrentUser("trip_1");

    expect(tripServiceMock.getTripForCurrentUser).toHaveBeenCalledWith("trip_1");
    expect(txMock.tripEvaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tripId: "trip_1",
          totalScore: expect.any(Number),
          level: expect.any(String),
        }),
      }),
    );
    expect(txMock.trip.update).toHaveBeenCalledWith({
      where: { id: "trip_1" },
      data: { status: "EVALUATED" },
    });
    expect(result.data.id).toBe("eval_1");
    expect(result.tripId).toBe("trip_1");
  });
});
