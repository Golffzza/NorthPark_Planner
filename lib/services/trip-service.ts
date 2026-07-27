import type { Prisma, TripStatus } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { mapTripToDetailDto, mapTripToListDto, type TripDetailDto, type TripListDto } from "@/lib/mappers/trip-dto";
import type { TripCreateInput } from "@/lib/validations/trip-create";
import type { TripUpdateInput } from "@/lib/validations/trip-update";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

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

export async function getTripForCurrentUser(tripId: string): Promise<TripWithParkForEvaluation> {
  const [currentUser, trip] = await Promise.all([
    getCurrentUser(),
    prisma.trip.findUnique({
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
    }),
  ]);

  if (!trip) {
    throw new NotFoundError("Trip not found");
  }

  if (trip.userId !== currentUser.id) {
    throw new AuthorizationError("Forbidden");
  }

  return trip;
}

export async function listTripsForCurrentUser(status?: TripStatus): Promise<TripListDto[]> {
  const currentUser = await getCurrentUser();
  const trips = await prisma.trip.findMany({
    where: {
      userId: currentUser.id,
      ...(status ? { status } : {}),
    },
    orderBy: [{ tripDate: "desc" }, { createdAt: "desc" }],
    include: listTripInclude,
  });

  return trips.map(mapTripToListDto);
}

async function ensureActivePark(parkId: string) {
  const park = await prisma.park.findUnique({
    where: { id: parkId },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!park || !park.isActive) {
    throw new NotFoundError("Park not found");
  }
}

async function getTripDetailRecordForCurrentUser(tripId: string) {
  const [currentUser, trip] = await Promise.all([
    getCurrentUser(),
    prisma.trip.findUnique({
      where: { id: tripId },
      include: detailTripInclude,
    }),
  ]);

  if (!trip) {
    throw new NotFoundError("Trip not found");
  }

  if (trip.userId !== currentUser.id) {
    throw new AuthorizationError("Forbidden");
  }

  return trip;
}

export async function createTripForCurrentUser(input: TripCreateInput): Promise<TripDetailDto> {
  const currentUser = await getCurrentUser();
  await ensureActivePark(input.parkId);

  const trip = await prisma.trip.create({
    data: {
      userId: currentUser.id,
      parkId: input.parkId,
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
}

export async function getTripDetailForCurrentUser(tripId: string): Promise<TripDetailDto> {
  const trip = await getTripDetailRecordForCurrentUser(tripId);

  return mapTripToDetailDto(trip);
}

function shouldResetTripStatus(
  existingTrip: Awaited<ReturnType<typeof getTripDetailRecordForCurrentUser>>,
  input: TripUpdateInput,
): boolean {
  return Object.entries(input).some(([key, value]) => {
    if (!IMPORTANT_REEVALUATION_FIELDS.has(key)) {
      return false;
    }

    const currentValue = existingTrip[key as keyof typeof existingTrip];

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
}

export async function cancelTripForCurrentUser(tripId: string): Promise<TripDetailDto> {
  await getTripDetailRecordForCurrentUser(tripId);

  const cancelledTrip = await prisma.trip.update({
    where: { id: tripId },
    data: { status: "CANCELLED" },
    include: detailTripInclude,
  });

  return mapTripToDetailDto(cancelledTrip);
}
