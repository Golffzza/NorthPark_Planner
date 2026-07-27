import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTripResultViewModel } from "@/lib/presenters/trip-result-view";
import { evaluateTripForCurrentUser } from "@/lib/services/evaluation-service";
import {
  createTripForCurrentUser,
  getTripDetailForCurrentUser,
  updateTripForCurrentUser,
} from "@/lib/services/trip-service";

type ParkRecord = {
  id: string;
  nameTh: string;
  nameEn: string | null;
  province: string;
  openTime: string;
  closeTime: string;
  coverImageUrl: string | null;
  isActive: boolean;
};

type TripRecord = {
  id: string;
  userId: string;
  parkId: string;
  tripDate: Date;
  departAt: string;
  originText: string;
  transportMode: string;
  travelerCount: number;
  weatherCondition: string;
  estimatedTravelMinutes: number;
  mockSunsetTime: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type EvaluationRecord = {
  id: string;
  tripId: string;
  totalScore: number;
  level: string;
  weatherScore: number;
  durationScore: number;
  timeScore: number;
  userProfileScore: number;
  summary: string;
  recommendation: string;
  evaluatedAt: Date;
  createdAt: Date;
};

const state = vi.hoisted(() => ({
  park: null as ParkRecord | null,
  trip: null as TripRecord | null,
  evaluations: [] as EvaluationRecord[],
}));

function buildTripDetailRecord(trip: TripRecord, park: ParkRecord, evaluations: EvaluationRecord[]) {
  return {
    ...trip,
    park: {
      id: park.id,
      nameTh: park.nameTh,
      nameEn: park.nameEn,
      province: park.province,
      openTime: park.openTime,
      closeTime: park.closeTime,
      coverImageUrl: park.coverImageUrl,
    },
    evaluations,
  };
}

const prismaMock = vi.hoisted(() => ({
  park: {
    findUnique: vi.fn(),
  },
  trip: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const txMock = vi.hoisted(() => ({
  tripEvaluation: {
    create: vi.fn(),
  },
  trip: {
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

describe("trip planner evaluation flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    state.park = {
      id: "park_1",
      nameTh: "Doi Inthanon",
      nameEn: "Doi Inthanon",
      province: "Chiang Mai",
      openTime: "06:00",
      closeTime: "18:00",
      coverImageUrl: null,
      isActive: true,
    };
    state.trip = null;
    state.evaluations = [];

    authMock.getCurrentUser.mockResolvedValue({
      id: "user_1",
      displayName: "Demo User",
      role: "USER",
    });

    prismaMock.park.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (!state.park || state.park.id !== where.id) {
        return null;
      }

      return {
        id: state.park.id,
        isActive: state.park.isActive,
      };
    });

    prismaMock.trip.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      const createdAt = new Date("2026-06-01T08:00:00.000Z");
      state.trip = {
        id: "trip_1",
        userId: String(data.userId),
        parkId: String(data.parkId),
        tripDate: data.tripDate as Date,
        departAt: String(data.departAt),
        originText: String(data.originText),
        transportMode: String(data.transportMode),
        travelerCount: Number(data.travelerCount),
        weatherCondition: String(data.weatherCondition),
        estimatedTravelMinutes: Number(data.estimatedTravelMinutes),
        mockSunsetTime: (data.mockSunsetTime as string | null | undefined) ?? null,
        notes: (data.notes as string | null | undefined) ?? null,
        status: String(data.status),
        createdAt,
        updatedAt: createdAt,
      };

      return buildTripDetailRecord(state.trip, state.park!, state.evaluations);
    });

    prismaMock.trip.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (!state.trip || state.trip.id !== where.id || !state.park) {
        return null;
      }

      return buildTripDetailRecord(state.trip, state.park, state.evaluations);
    });

    prismaMock.trip.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      if (!state.trip || state.trip.id !== where.id || !state.park) {
        throw new Error("Trip not found in test state");
      }

      state.trip = {
        ...state.trip,
        ...data,
        tripDate: (data.tripDate as Date | undefined) ?? state.trip.tripDate,
        travelerCount: Number(data.travelerCount ?? state.trip.travelerCount),
        estimatedTravelMinutes: Number(
          data.estimatedTravelMinutes ?? state.trip.estimatedTravelMinutes,
        ),
        updatedAt: new Date("2026-06-01T08:30:00.000Z"),
      };

      return buildTripDetailRecord(state.trip, state.park, state.evaluations);
    });

    txMock.tripEvaluation.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      const createdEvaluation: EvaluationRecord = {
        id: `eval_${state.evaluations.length + 1}`,
        tripId: String(data.tripId),
        totalScore: Number(data.totalScore),
        level: String(data.level),
        weatherScore: Number(data.weatherScore),
        durationScore: Number(data.durationScore),
        timeScore: Number(data.timeScore),
        userProfileScore: Number(data.userProfileScore),
        summary: String(data.summary),
        recommendation: String(data.recommendation),
        evaluatedAt: data.evaluatedAt as Date,
        createdAt: data.evaluatedAt as Date,
      };

      state.evaluations = [createdEvaluation, ...state.evaluations];

      return createdEvaluation;
    });

    txMock.trip.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      if (!state.trip || state.trip.id !== where.id) {
        throw new Error("Trip not found in transaction");
      }

      state.trip = {
        ...state.trip,
        status: String(data.status),
        updatedAt: new Date("2026-06-01T08:45:00.000Z"),
      };

      return state.trip;
    });

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => Promise<unknown>) => {
      return callback(txMock);
    });
  });

  it("supports create, edit, evaluate, and reading the result-ready trip detail", async () => {
    const createdTrip = await createTripForCurrentUser({
      parkId: "park_1",
      tripDate: new Date("2026-06-12T00:00:00.000Z"),
      departAt: "06:30",
      originText: "Chiang Mai",
      transportMode: "CAR",
      travelerCount: 3,
      weatherCondition: "CLEAR",
      estimatedTravelMinutes: 110,
      mockSunsetTime: "18:40",
      notes: "Family trip",
    });

    expect(createdTrip.status).toBe("DRAFT");
    expect(createdTrip.park.id).toBe("park_1");

    const updatedTrip = await updateTripForCurrentUser(createdTrip.id, {
      departAt: "07:15",
      estimatedTravelMinutes: 125,
      notes: "Updated family trip",
    });

    expect(updatedTrip.departAt).toBe("07:15");
    expect(updatedTrip.estimatedTravelMinutes).toBe(125);

    const evaluationResult = await evaluateTripForCurrentUser(createdTrip.id);

    expect(evaluationResult.tripId).toBe(createdTrip.id);
    expect(evaluationResult.data.totalScore).toBeGreaterThanOrEqual(0);
    expect(evaluationResult.data.totalScore).toBeLessThanOrEqual(100);
    expect(evaluationResult.data.recommendation.length).toBeGreaterThan(0);

    const detail = await getTripDetailForCurrentUser(createdTrip.id);
    const resultView = buildTripResultViewModel(detail);

    expect(detail.status).toBe("EVALUATED");
    expect(detail.evaluations).toHaveLength(1);
    expect(detail.evaluations[0]).toMatchObject({
      id: evaluationResult.data.id,
      totalScore: evaluationResult.data.totalScore,
      level: evaluationResult.data.level,
      summary: evaluationResult.data.summary,
      recommendation: evaluationResult.data.recommendation,
    });
    expect(resultView.latestEvaluation.id).toBe(evaluationResult.data.id);
    expect(resultView.history).toHaveLength(1);
    expect(resultView.factorScores).toHaveLength(4);
  });
});
