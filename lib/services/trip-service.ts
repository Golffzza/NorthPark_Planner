import type { Prisma, TripEvaluation, TripStatus } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import type { TripEvaluationResult } from "@/lib/evaluation/types";
import { mapTripToDetailDto, mapTripToListDto, type TripDetailDto, type TripListDto } from "@/lib/mappers/trip-dto";
import { getParkDetail, NotFoundError } from "@/lib/services/park-service";
import type { TripCreateInput } from "@/lib/validations/trip-create";
import type { TripUpdateInput } from "@/lib/validations/trip-update";

export { NotFoundError };

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

const listTripInclude = {
  park: {
    select: {
      id: true,
      nameTh: true,
      nameEn: true,
      province: true,
      openTime: true,
      closeTime: true,
      coverImageUrl: true,
    },
  },
  evaluations: {
    select: {
      id: true,
      totalScore: true,
      level: true,
      summary: true,
      evaluatedAt: true,
    },
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
  },
} satisfies Prisma.TripInclude;

const detailTripInclude = {
  park: {
    select: {
      id: true,
      nameTh: true,
      nameEn: true,
      province: true,
      openTime: true,
      closeTime: true,
      coverImageUrl: true,
    },
  },
  evaluations: {
    orderBy: {
      createdAt: "desc" as const,
    },
  },
  weatherSnapshots: {
    select: {
      id: true,
      weatherCondition: true,
      temperatureC: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
  },
  routeSnapshots: {
    select: {
      id: true,
      distanceMeters: true,
      durationSeconds: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
  },
} satisfies Prisma.TripInclude;

type DetailTripRecord = Prisma.TripGetPayload<{
  include: typeof detailTripInclude;
}>;

const IMPORTANT_REEVALUATION_FIELDS = new Set([
  "parkId",
  "tripDate",
  "departAt",
  "originLat",
  "originLng",
  "weatherCondition",
  "estimatedTravelMinutes",
  "mockSunsetTime",
]);

export type TripWithParkForEvaluation = Prisma.TripGetPayload<{
  include: {
    park: {
      select: {
        id: true;
        openTime: true;
        closeTime: true;
        latitude: true;
        longitude: true;
      };
    };
  };
}>;

type InMemoryTripRecord = {
  id: string;
  userId: string;
  parkId: string;
  tripDate: Date;
  departAt: string;
  originText: string;
  originLat: number | null;
  originLng: number | null;
  transportMode: string;
  travelerCount: number;
  weatherCondition: string;
  estimatedTravelMinutes: number;
  mockSunsetTime: string | null;
  notes: string | null;
  status: TripStatus;
  createdAt: Date;
  updatedAt: Date;
  park: {
    id: string;
    nameTh: string;
    nameEn: string | null;
    province: string;
    openTime: string;
    closeTime: string;
    coverImageUrl: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  evaluations: TripEvaluation[];
  weatherSnapshots: Array<{
    id: string;
    weatherCondition: string;
    temperatureC: number | null;
    createdAt: Date;
  }>;
  routeSnapshots: Array<{
    id: string;
    distanceMeters: number;
    durationSeconds: number;
    createdAt: Date;
  }>;
};

const inMemoryTrips: InMemoryTripRecord[] = [];

export function saveEvaluationInMemory(tripId: string, evalData: TripEvaluationResult): TripEvaluation | null {
  const trip = inMemoryTrips.find((t) => t.id === tripId);
  if (trip) {
    const createdEvaluation: TripEvaluation = {
      id: `eval-${Date.now()}`,
      tripId,
      totalScore: evalData.totalScore,
      level: evalData.level,
      weatherScore: evalData.weatherScore,
      durationScore: evalData.durationScore,
      timeScore: evalData.timeScore,
      userProfileScore: evalData.userProfileScore,
      summary: evalData.summary,
      recommendation: evalData.recommendation,
      evaluatedAt: new Date(),
      createdAt: new Date(),
    };
    trip.evaluations.unshift(createdEvaluation);
    trip.status = "EVALUATED";
    return createdEvaluation;
  }
  return null;
}

export async function getTripForCurrentUser(tripId: string): Promise<TripWithParkForEvaluation> {
  const currentUser = await getCurrentUser();

  if (typeof prisma?.trip?.findUnique === "function") {
    try {
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          park: {
            select: {
              id: true,
              openTime: true,
              closeTime: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      });

      if (trip) {
        if (trip.userId !== currentUser.id) {
          throw new AuthorizationError("Forbidden");
        }

        return trip;
      }
    } catch (error) {
      if (error instanceof AuthorizationError) throw error;
      console.warn("[trip-service] Database query failed, using in-memory trip fallback for getTripForCurrentUser:", error);
    }
  }

  const memoryTrip = inMemoryTrips.find((t) => t.id === tripId);
  if (!memoryTrip) {
    throw new NotFoundError("Trip not found");
  }

  if (memoryTrip.userId !== currentUser.id) {
    throw new AuthorizationError("Forbidden");
  }

  return memoryTrip as unknown as TripWithParkForEvaluation;
}

export async function listTripsForCurrentUser(status?: TripStatus): Promise<TripListDto[]> {
  const currentUser = await getCurrentUser();

  if (typeof prisma?.trip?.findMany === "function") {
    try {
      const trips = await prisma.trip.findMany({
        where: {
          userId: currentUser.id,
          ...(status ? { status } : {}),
        },
        orderBy: [{ tripDate: "desc" }, { createdAt: "desc" }],
        include: listTripInclude,
      });

      if (trips.length > 0) {
        return trips.map(mapTripToListDto);
      }
    } catch (error) {
      console.warn("[trip-service] Database query failed, using in-memory trip fallback for listTripsForCurrentUser:", error);
    }
  }

  let userTrips = inMemoryTrips.filter((t) => t.userId === currentUser.id);
  if (status) {
    userTrips = userTrips.filter((t) => t.status === status);
  }
  userTrips.sort((a, b) => new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime());

  return userTrips.map((t) => mapTripToListDto(t as unknown as Parameters<typeof mapTripToListDto>[0]));
}

async function ensureActivePark(parkId: string): Promise<string> {
  if (typeof prisma?.park?.findUnique === "function") {
    try {
      const park = await prisma.park.findUnique({
        where: { id: parkId },
        select: {
          id: true,
          isActive: true,
        },
      });

      if (park) {
        if (!park.isActive) {
          throw new NotFoundError("Park not found");
        }
        return park.id;
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.warn("[trip-service] Database park findUnique lookup failed:", error);
    }
  }

  if (typeof prisma?.park?.findFirst === "function") {
    try {
      const park = await prisma.park.findFirst({
        where: {
          isActive: true,
          OR: [{ id: parkId }, { slug: parkId }],
        },
        select: {
          id: true,
          isActive: true,
        },
      });

      if (park) {
        return park.id;
      }
    } catch (error) {
      console.warn("[trip-service] Database park findFirst lookup failed:", error);
    }
  }

  try {
    const parkDetail = await getParkDetail(parkId);
    if (!parkDetail) {
      throw new NotFoundError("Park not found");
    }
    return parkDetail.id;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new NotFoundError("Park not found");
  }
}

async function getTripDetailRecordForCurrentUser(tripId: string): Promise<DetailTripRecord | InMemoryTripRecord> {
  const currentUser = await getCurrentUser();

  if (typeof prisma?.trip?.findUnique === "function") {
    try {
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: detailTripInclude,
      });

      if (trip) {
        if (trip.userId !== currentUser.id) {
          throw new AuthorizationError("Forbidden");
        }

        return trip;
      }
    } catch (error) {
      if (error instanceof AuthorizationError) throw error;
      console.warn("[trip-service] Database query failed, using in-memory detail fallback:", error);
    }
  }

  const memoryTrip = inMemoryTrips.find((t) => t.id === tripId);
  if (!memoryTrip) {
    throw new NotFoundError("Trip not found");
  }

  if (memoryTrip.userId !== currentUser.id) {
    throw new AuthorizationError("Forbidden");
  }

  return memoryTrip;
}

export async function createTripForCurrentUser(input: TripCreateInput): Promise<TripDetailDto> {
  const currentUser = await getCurrentUser();
  const resolvedParkId = await ensureActivePark(input.parkId);

  if (typeof prisma?.trip?.create === "function") {
    try {
      const trip = await prisma.trip.create({
        data: {
          userId: currentUser.id,
          parkId: resolvedParkId,
          tripDate: input.tripDate,
          departAt: input.departAt,
          originText: input.originText,
          originLat: input.originLat ?? null,
          originLng: input.originLng ?? null,
          transportMode: input.transportMode,
          travelerCount: input.travelerCount,
          weatherCondition: input.weatherCondition,
          estimatedTravelMinutes: input.estimatedTravelMinutes,
          mockSunsetTime: input.mockSunsetTime ?? null,
          notes: input.notes ?? null,
          status: "DRAFT",
        },
        include: detailTripInclude,
      });

      return mapTripToDetailDto(trip);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AuthorizationError) throw error;
      console.warn("[trip-service] Database query failed, creating in-memory trip fallback:", error);
    }
  }

  const parkDetail = await getParkDetail(resolvedParkId);
  const newMemoryTrip: InMemoryTripRecord = {
    id: `trip-${Date.now()}`,
    userId: currentUser.id,
    parkId: parkDetail.id,
    tripDate: input.tripDate,
    departAt: input.departAt,
    originText: input.originText,
    originLat: input.originLat ?? null,
    originLng: input.originLng ?? null,
    transportMode: input.transportMode,
    travelerCount: input.travelerCount,
    weatherCondition: input.weatherCondition,
    estimatedTravelMinutes: input.estimatedTravelMinutes,
    mockSunsetTime: input.mockSunsetTime ?? null,
    notes: input.notes ?? null,
    status: "DRAFT" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    park: {
      id: parkDetail.id,
      nameTh: parkDetail.nameTh,
      nameEn: parkDetail.nameEn,
      province: parkDetail.province,
      openTime: parkDetail.openTime,
      closeTime: parkDetail.closeTime,
      coverImageUrl: parkDetail.coverImageUrl,
      latitude: parkDetail.latitude,
      longitude: parkDetail.longitude,
    },
    evaluations: [],
    weatherSnapshots: [],
    routeSnapshots: [],
  };

  inMemoryTrips.unshift(newMemoryTrip);
  return mapTripToDetailDto(newMemoryTrip as unknown as Parameters<typeof mapTripToDetailDto>[0]);
}

export async function getTripDetailForCurrentUser(tripId: string): Promise<TripDetailDto> {
  const trip = await getTripDetailRecordForCurrentUser(tripId);

  return mapTripToDetailDto(trip as unknown as Parameters<typeof mapTripToDetailDto>[0]);
}

function shouldResetTripStatus(
  existingTrip: DetailTripRecord | InMemoryTripRecord,
  input: TripUpdateInput,
): boolean {
  return Object.entries(input).some(([key, value]) => {
    if (!IMPORTANT_REEVALUATION_FIELDS.has(key)) {
      return false;
    }

    const currentValue = (existingTrip as Record<string, unknown>)[key];

    if (currentValue instanceof Date && value instanceof Date) {
      return currentValue.getTime() !== value.getTime();
    }

    if (value === "") {
      return currentValue !== null;
    }

    return currentValue !== value;
  });
}

export async function updateTripForCurrentUser(
  tripId: string,
  input: TripUpdateInput,
): Promise<TripDetailDto> {
  const currentUser = await getCurrentUser();

  if (typeof prisma?.trip?.update === "function") {
    try {
      const trip = await getTripDetailRecordForCurrentUser(tripId);
      if (input.parkId) {
        await ensureActivePark(input.parkId);
      }

      const resetToDraft = shouldResetTripStatus(trip, input);
      const updatedTrip = await prisma.trip.update({
        where: { id: tripId },
        data: {
          ...(input.parkId ? { parkId: input.parkId } : {}),
          ...(input.tripDate ? { tripDate: input.tripDate } : {}),
          ...(input.departAt ? { departAt: input.departAt } : {}),
          ...(input.originText ? { originText: input.originText } : {}),
          ...("originLat" in input ? { originLat: input.originLat } : {}),
          ...("originLng" in input ? { originLng: input.originLng } : {}),
          ...(input.transportMode ? { transportMode: input.transportMode } : {}),
          ...(input.travelerCount ? { travelerCount: input.travelerCount } : {}),
          ...(input.weatherCondition ? { weatherCondition: input.weatherCondition } : {}),
          ...(input.estimatedTravelMinutes ? { estimatedTravelMinutes: input.estimatedTravelMinutes } : {}),
          ...("mockSunsetTime" in input
            ? {
                mockSunsetTime: input.mockSunsetTime === "" ? null : input.mockSunsetTime,
              }
            : {}),
          ...("notes" in input
            ? {
                notes: input.notes === "" ? null : input.notes,
              }
            : {}),
          ...(resetToDraft ? { status: "DRAFT" } : {}),
        },
        include: detailTripInclude,
      });

      return mapTripToDetailDto(updatedTrip);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AuthorizationError) throw error;
      console.warn("[trip-service] Database update failed, updating in-memory trip fallback:", error);
    }
  }

  const memoryTrip = inMemoryTrips.find((t) => t.id === tripId);
  if (!memoryTrip) {
    throw new NotFoundError("Trip not found");
  }
  if (memoryTrip.userId !== currentUser.id) {
    throw new AuthorizationError("Forbidden");
  }

  if (input.parkId && input.parkId !== memoryTrip.parkId) {
    const parkDetail = await getParkDetail(input.parkId);
    memoryTrip.parkId = input.parkId;
    memoryTrip.park = {
      id: parkDetail.id,
      nameTh: parkDetail.nameTh,
      nameEn: parkDetail.nameEn,
      province: parkDetail.province,
      openTime: parkDetail.openTime,
      closeTime: parkDetail.closeTime,
      coverImageUrl: parkDetail.coverImageUrl,
    };
  }

  if (input.tripDate) memoryTrip.tripDate = input.tripDate;
  if (input.departAt) memoryTrip.departAt = input.departAt;
  if (input.originText) memoryTrip.originText = input.originText;
  if ("originLat" in input) memoryTrip.originLat = input.originLat ?? null;
  if ("originLng" in input) memoryTrip.originLng = input.originLng ?? null;
  if (input.transportMode) memoryTrip.transportMode = input.transportMode;
  if (input.travelerCount) memoryTrip.travelerCount = input.travelerCount;
  if (input.weatherCondition) memoryTrip.weatherCondition = input.weatherCondition;
  if (input.estimatedTravelMinutes) memoryTrip.estimatedTravelMinutes = input.estimatedTravelMinutes;
  if ("mockSunsetTime" in input) {
    memoryTrip.mockSunsetTime = !input.mockSunsetTime ? null : input.mockSunsetTime;
  }
  if ("notes" in input) {
    memoryTrip.notes = !input.notes ? null : input.notes;
  }
  memoryTrip.updatedAt = new Date();

  return mapTripToDetailDto(memoryTrip as unknown as Parameters<typeof mapTripToDetailDto>[0]);
}

export async function cancelTripForCurrentUser(tripId: string): Promise<TripDetailDto> {
  const currentUser = await getCurrentUser();

  if (typeof prisma?.trip?.update === "function") {
    try {
      await getTripDetailRecordForCurrentUser(tripId);

      const cancelledTrip = await prisma.trip.update({
        where: { id: tripId },
        data: { status: "CANCELLED" },
        include: detailTripInclude,
      });

      return mapTripToDetailDto(cancelledTrip);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AuthorizationError) throw error;
      console.warn("[trip-service] Database cancel failed, updating in-memory trip fallback:", error);
    }
  }

  const memoryTrip = inMemoryTrips.find((t) => t.id === tripId);
  if (!memoryTrip) {
    throw new NotFoundError("Trip not found");
  }
  if (memoryTrip.userId !== currentUser.id) {
    throw new AuthorizationError("Forbidden");
  }

  memoryTrip.status = "CANCELLED";
  memoryTrip.updatedAt = new Date();

  return mapTripToDetailDto(memoryTrip as unknown as Parameters<typeof mapTripToDetailDto>[0]);
}
