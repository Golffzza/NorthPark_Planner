import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  NotFoundError,
  cancelTripForCurrentUser,
  createTripForCurrentUser,
  getTripDetailForCurrentUser,
  listTripsForCurrentUser,
  updateTripForCurrentUser,
} from "@/lib/services/trip-service";

const prismaMock = vi.hoisted(() => ({
  park: {
    findUnique: vi.fn(),
  },
  trip: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

const authMock = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/auth/current-user", () => authMock);

describe("trip service CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.getCurrentUser.mockResolvedValue({
      id: "user_1",
      displayName: "Demo User",
      email: "demo.user@northpark.local",
      role: "USER",
    });
  });

  it("lists only current user trips and supports status filter", async () => {
    prismaMock.trip.findMany.mockResolvedValue([
      {
        id: "trip_1",
        userId: "user_1",
        tripDate: new Date("2026-05-28T00:00:00.000Z"),
        departAt: "08:00",
        originText: "Chiang Mai",
        transportMode: "CAR",
        travelerCount: 2,
        weatherCondition: "CLEAR",
        estimatedTravelMinutes: 120,
        mockSunsetTime: "18:30",
        status: "EVALUATED",
        createdAt: new Date("2026-05-20T08:00:00.000Z"),
        updatedAt: new Date("2026-05-20T08:30:00.000Z"),
        park: {
          id: "park_1",
          nameTh: "Doi Inthanon",
          nameEn: "Doi Inthanon",
          province: "Chiang Mai",
          openTime: "06:00",
          closeTime: "18:00",
          coverImageUrl: "https://example.com/park.jpg",
        },
        evaluations: [
          {
            id: "eval_1",
            totalScore: 88,
            level: "EXCELLENT",
            summary: "summary",
            evaluatedAt: new Date("2026-05-21T09:00:00.000Z"),
          },
        ],
        weatherSnapshots: [],
        routeSnapshots: [],
      },
    ]);

    const result = await listTripsForCurrentUser("EVALUATED");

    expect(prismaMock.trip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user_1",
          status: "EVALUATED",
        },
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.park.nameTh).toBe("Doi Inthanon");
    expect(result[0]?.latestEvaluation?.id).toBe("eval_1");
  });

  it("creates a draft trip when park is active", async () => {
    prismaMock.park.findUnique.mockResolvedValue({
      id: "park_1",
      isActive: true,
    });
    prismaMock.trip.create.mockResolvedValue({
      id: "trip_1",
      userId: "user_1",
      tripDate: new Date("2026-06-01T00:00:00.000Z"),
      departAt: "07:30",
      originText: "Chiang Mai",
      originLat: 18.7883,
      originLng: 98.9853,
      transportMode: "CAR",
      travelerCount: 3,
      weatherCondition: "CLOUDY",
      estimatedTravelMinutes: 90,
      mockSunsetTime: "18:30",
      status: "DRAFT",
      notes: null,
      createdAt: new Date("2026-05-28T10:00:00.000Z"),
      updatedAt: new Date("2026-05-28T10:00:00.000Z"),
      park: {
        id: "park_1",
        nameTh: "Doi Inthanon",
        nameEn: "Doi Inthanon",
        province: "Chiang Mai",
        openTime: "06:00",
        closeTime: "18:00",
        coverImageUrl: null,
      },
      evaluations: [],
      weatherSnapshots: [],
      routeSnapshots: [],
    });

    const result = await createTripForCurrentUser({
      parkId: "park_1",
      tripDate: new Date("2026-06-01T00:00:00.000Z"),
      departAt: "07:30",
      originText: "Chiang Mai",
      originLat: 18.7883,
      originLng: 98.9853,
      transportMode: "CAR",
      travelerCount: 3,
      weatherCondition: "CLOUDY",
      estimatedTravelMinutes: 90,
      mockSunsetTime: "18:30",
    });

    expect(prismaMock.trip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user_1",
          parkId: "park_1",
          originLat: 18.7883,
          originLng: 98.9853,
          status: "DRAFT",
        }),
      }),
    );
    expect(result.status).toBe("DRAFT");
  });

  it("throws not found when creating with missing or inactive park", async () => {
    prismaMock.park.findUnique.mockResolvedValue(null);

    await expect(
      createTripForCurrentUser({
        parkId: "park_missing",
        tripDate: new Date("2026-06-01T00:00:00.000Z"),
        departAt: "07:30",
        originText: "Chiang Mai",
        transportMode: "CAR",
        travelerCount: 3,
        weatherCondition: "CLOUDY",
        estimatedTravelMinutes: 90,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("returns trip detail with park and evaluations", async () => {
    prismaMock.trip.findUnique.mockResolvedValue({
      id: "trip_1",
      userId: "user_1",
      tripDate: new Date("2026-05-28T00:00:00.000Z"),
      departAt: "08:00",
      originText: "Chiang Mai",
      originLat: 18.7883,
      originLng: 98.9853,
      transportMode: "CAR",
      travelerCount: 2,
      weatherCondition: "CLEAR",
      estimatedTravelMinutes: 120,
      mockSunsetTime: "18:30",
      status: "EVALUATED",
      notes: null,
      createdAt: new Date("2026-05-20T08:00:00.000Z"),
      updatedAt: new Date("2026-05-20T08:30:00.000Z"),
      park: {
        id: "park_1",
        nameTh: "Doi Inthanon",
        nameEn: "Doi Inthanon",
        province: "Chiang Mai",
        openTime: "06:00",
        closeTime: "18:00",
        coverImageUrl: null,
      },
      evaluations: [
        {
          id: "eval_1",
          tripId: "trip_1",
          totalScore: 88,
          level: "EXCELLENT",
          weatherScore: 95,
          durationScore: 80,
          timeScore: 90,
          userProfileScore: 85,
          summary: "summary",
          recommendation: "recommendation",
          evaluatedAt: new Date("2026-05-21T09:00:00.000Z"),
          createdAt: new Date("2026-05-21T09:00:00.000Z"),
        },
      ],
      weatherSnapshots: [
        {
          id: "weather_1",
          weatherCondition: "CLEAR",
          temperatureC: 24.6,
          createdAt: new Date("2026-05-21T08:00:00.000Z"),
        },
      ],
      routeSnapshots: [
        {
          id: "route_1",
          distanceMeters: 98500,
          durationSeconds: 8100,
          createdAt: new Date("2026-05-21T08:05:00.000Z"),
        },
      ],
    });

    const result = await getTripDetailForCurrentUser("trip_1");

    expect(result.id).toBe("trip_1");
    expect(result.originLat).toBe(18.7883);
    expect(result.originLng).toBe(98.9853);
    expect(result.evaluations).toHaveLength(1);
    expect(result.park.id).toBe("park_1");
    expect(result.latestWeatherSnapshot?.temperatureC).toBe(24.6);
    expect(result.latestRouteSnapshot?.distanceMeters).toBe(98500);
  });

  it("resets status to draft when important fields change", async () => {
    prismaMock.trip.findUnique.mockResolvedValue({
      id: "trip_1",
      userId: "user_1",
      parkId: "park_1",
      tripDate: new Date("2026-05-28T00:00:00.000Z"),
      departAt: "08:00",
      originText: "Chiang Mai",
      transportMode: "CAR",
      travelerCount: 2,
      weatherCondition: "CLEAR",
      estimatedTravelMinutes: 120,
      mockSunsetTime: "18:30",
      status: "EVALUATED",
      notes: null,
      createdAt: new Date("2026-05-20T08:00:00.000Z"),
      updatedAt: new Date("2026-05-20T08:30:00.000Z"),
      park: {
        id: "park_1",
        nameTh: "Doi Inthanon",
        nameEn: "Doi Inthanon",
        province: "Chiang Mai",
        openTime: "06:00",
        closeTime: "18:00",
        coverImageUrl: null,
      },
      evaluations: [],
      weatherSnapshots: [],
      routeSnapshots: [],
    });
    prismaMock.trip.update.mockResolvedValue({
      id: "trip_1",
      userId: "user_1",
      tripDate: new Date("2026-05-28T00:00:00.000Z"),
      departAt: "09:00",
      originText: "Chiang Mai",
      transportMode: "CAR",
      travelerCount: 2,
      weatherCondition: "CLEAR",
      estimatedTravelMinutes: 120,
      mockSunsetTime: "18:30",
      status: "DRAFT",
      notes: null,
      createdAt: new Date("2026-05-20T08:00:00.000Z"),
      updatedAt: new Date("2026-05-20T08:40:00.000Z"),
      park: {
        id: "park_1",
        nameTh: "Doi Inthanon",
        nameEn: "Doi Inthanon",
        province: "Chiang Mai",
        openTime: "06:00",
        closeTime: "18:00",
        coverImageUrl: null,
      },
      evaluations: [],
      weatherSnapshots: [],
      routeSnapshots: [],
    });

    const result = await updateTripForCurrentUser("trip_1", {
      departAt: "09:00",
    });

    expect(prismaMock.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          departAt: "09:00",
          status: "DRAFT",
        }),
      }),
    );
    expect(result.status).toBe("DRAFT");
  });

  it("soft deletes by setting status to cancelled", async () => {
    prismaMock.trip.findUnique.mockResolvedValue({
      id: "trip_1",
      userId: "user_1",
      parkId: "park_1",
      tripDate: new Date("2026-05-28T00:00:00.000Z"),
      departAt: "08:00",
      originText: "Chiang Mai",
      transportMode: "CAR",
      travelerCount: 2,
      weatherCondition: "CLEAR",
      estimatedTravelMinutes: 120,
      mockSunsetTime: "18:30",
      status: "DRAFT",
      notes: null,
      createdAt: new Date("2026-05-20T08:00:00.000Z"),
      updatedAt: new Date("2026-05-20T08:30:00.000Z"),
      park: {
        id: "park_1",
        nameTh: "Doi Inthanon",
        nameEn: "Doi Inthanon",
        province: "Chiang Mai",
        openTime: "06:00",
        closeTime: "18:00",
        coverImageUrl: null,
      },
      evaluations: [],
      weatherSnapshots: [],
      routeSnapshots: [],
    });
    prismaMock.trip.update.mockResolvedValue({
      id: "trip_1",
      userId: "user_1",
      tripDate: new Date("2026-05-28T00:00:00.000Z"),
      departAt: "08:00",
      originText: "Chiang Mai",
      transportMode: "CAR",
      travelerCount: 2,
      weatherCondition: "CLEAR",
      estimatedTravelMinutes: 120,
      mockSunsetTime: "18:30",
      status: "CANCELLED",
      notes: null,
      createdAt: new Date("2026-05-20T08:00:00.000Z"),
      updatedAt: new Date("2026-05-20T08:40:00.000Z"),
      park: {
        id: "park_1",
        nameTh: "Doi Inthanon",
        nameEn: "Doi Inthanon",
        province: "Chiang Mai",
        openTime: "06:00",
        closeTime: "18:00",
        coverImageUrl: null,
      },
      evaluations: [],
      weatherSnapshots: [],
      routeSnapshots: [],
    });

    const result = await cancelTripForCurrentUser("trip_1");

    expect(prismaMock.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "CANCELLED" },
      }),
    );
    expect(result.status).toBe("CANCELLED");
  });
});
