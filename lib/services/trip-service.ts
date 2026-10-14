//* ./lib/services/trip-service.ts

import type { Prisma, TripStatus } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

import {
  mapTripToDetailDto,
  mapTripToListDto,
  type TripDetailDto,
  type TripListDto,
} from "@/lib/mappers/trip-dto";

import { NotFoundError } from "@/lib/services/park-service";

import type { TripCreateInput } from "@/lib/validations/trip-create";
import type { TripUpdateInput } from "@/lib/validations/trip-update";

export { NotFoundError };

export class ParkChangeConfirmationRequiredError extends Error {
  constructor() {
    super("การเปลี่ยนอุทยานจะล้างกิจกรรมในแผนเดิม กรุณายืนยันก่อนบันทึก");
    this.name = "ParkChangeConfirmationRequiredError";
  }
}

export class TripCancelledError extends Error {
  constructor() {
    super("ไม่สามารถแก้ไขทริปที่ยกเลิกแล้วได้");
    this.name = "TripCancelledError";
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
  itineraryDays: {
    orderBy: { dayNumber: "asc" as const },
    include: { items: { orderBy: { position: "asc" as const } } },
  },
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
    include: {
      weatherSnapshot: {
        select: {
          id: true,
          weatherCondition: true,
          temperatureC: true,
          createdAt: true,
        },
      },
      routeSnapshot: {
        select: {
          id: true,
          distanceMeters: true,
          durationSeconds: true,
          createdAt: true,
        },
      },
      sunsetSnapshot: {
        select: {
          id: true,
          sunsetLocalTime: true,
          createdAt: true,
        },
      },
    },
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

/**
 * Include สำหรับ Evaluation โดยเฉพาะ
 *
 * ดึง snapshot ล่าสุดมาให้ evaluation-service
 * เลือกใช้ข้อมูลจริงแทนค่าที่เก็บใน Trip ได้
 */
const evaluationTripInclude = {
  park: {
    select: {
      id: true,
      nameTh: true,

      openTime: true,
      closeTime: true,

      latitude: true,
      longitude: true,
    },
  },

  weatherSnapshots: {
    select: {
      id: true,
      weatherCondition: true,
      forecastAt: true,
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

  sunsetSnapshots: {
    select: {
      id: true,
      sunsetAt: true,
      sunsetLocalTime: true,
      timezone: true,
      createdAt: true,
    },

    orderBy: {
      createdAt: "desc" as const,
    },

    take: 1,
  },
} satisfies Prisma.TripInclude;

/**
 * Field เหล่านี้เปลี่ยนแล้วควรประเมินใหม่
 *
 * transportMode:
 * มีผลต่อ accessibility score
 *
 * travelerCount:
 * ถึงไม่กระทบคะแนนแล้ว
 * แต่มีผลต่อ recommendation
 */
const IMPORTANT_REEVALUATION_FIELDS = new Set([
  "parkId",
  "tripDate",
  "departAt",

  "originLat",
  "originLng",

  "transportMode",
  "travelerCount",

  "weatherCondition",
  "estimatedTravelMinutes",
  "mockSunsetTime",
]);

export type TripWithParkForEvaluation = Prisma.TripGetPayload<{
  include: typeof evaluationTripInclude;
}>;

export async function getTripForCurrentUser(
  tripId: string,
): Promise<TripWithParkForEvaluation> {
  const [currentUser, trip] = await Promise.all([
    getCurrentUser(),

    prisma.trip.findUnique({
      where: {
        id: tripId,
      },

      include: evaluationTripInclude,
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

export class CancelledTripEvaluationError extends Error {
  constructor() {
    super("Cancelled trips cannot be evaluated");
    this.name = "CancelledTripEvaluationError";
  }
}

export function assertTripCanBeEvaluated(trip: { status: TripStatus }) {
  if (trip.status === "CANCELLED") {
    throw new CancelledTripEvaluationError();
  }
}

export async function getTripIdForCurrentUser(tripId: string): Promise<string> {
  const [currentUser, trip] = await Promise.all([
    getCurrentUser(),
    prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true, userId: true, status: true },
    }),
  ]);

  if (!trip) {
    throw new NotFoundError("Trip not found");
  }

  if (trip.userId !== currentUser.id) {
    throw new AuthorizationError("Forbidden");
  }

  assertTripCanBeEvaluated(trip);

  return trip.id;
}

export async function listTripsForCurrentUser(
  status?: TripStatus,
): Promise<TripListDto[]> {
  const currentUser = await getCurrentUser();

  const trips = await prisma.trip.findMany({
    where: {
      userId: currentUser.id,

      ...(status
        ? {
            status,
          }
        : {}),
    },

    orderBy: [
      {
        tripDate: "desc",
      },
      {
        createdAt: "desc",
      },
    ],

    include: listTripInclude,
  });

  return trips.map(mapTripToListDto);
}

async function ensureActivePark(parkId: string) {
  const park = await prisma.park.findUnique({
    where: {
      id: parkId,
    },

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
      where: {
        id: tripId,
      },

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

export async function createTripForCurrentUser(
  input: TripCreateInput,
): Promise<TripDetailDto> {
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

export async function getTripDetailForCurrentUser(
  tripId: string,
): Promise<TripDetailDto> {
  const trip = await getTripDetailRecordForCurrentUser(tripId);

  return mapTripToDetailDto(trip);
}

function normalizeComparableValue(value: unknown): unknown {
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  ) {
    return (value as { toNumber(): number }).toNumber();
  }

  return value;
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

    const normalizedCurrent = normalizeComparableValue(currentValue);
    const normalizedIncoming = normalizeComparableValue(value);

    return normalizedCurrent !== normalizedIncoming;
  });
}

export async function updateTripForCurrentUser(
  tripId: string,
  input: TripUpdateInput,
): Promise<TripDetailDto> {
  const trip = await getTripDetailRecordForCurrentUser(tripId);

  if (trip.status === "CANCELLED") {
    throw new TripCancelledError();
  }

  if (input.parkId) {
    await ensureActivePark(input.parkId);
  }

  const parkChanged = input.parkId !== undefined && input.parkId !== trip.parkId;
  const mustClearItinerary = parkChanged && trip.itineraryDays.length > 0;

  if (mustClearItinerary && input.confirmParkChange !== true) {
    throw new ParkChangeConfirmationRequiredError();
  }

  const resetToDraft = shouldResetTripStatus(trip, input);

  // The status condition also protects against a concurrent cancellation.
  let updatedTrip;
  try {
    updatedTrip = await prisma.$transaction(async (tx) => {
      if (mustClearItinerary) {
        // Deleting days cascades to their items. Roll back if the trip update fails.
        await tx.tripItineraryDay.deleteMany({ where: { tripId } });
      }

      return tx.trip.update({
    where: {
      id: tripId,
      status: { not: "CANCELLED" },
    },

    data: {
      ...(input.parkId
        ? {
            parkId: input.parkId,
          }
        : {}),

      ...("tripDate" in input
        ? {
            tripDate: input.tripDate,
          }
        : {}),

      ...("departAt" in input
        ? {
            departAt: input.departAt,
          }
        : {}),

      ...("originText" in input
        ? {
            originText: input.originText,
          }
        : {}),

      ...("originLat" in input
        ? {
            originLat: input.originLat,
          }
        : {}),

      ...("originLng" in input
        ? {
            originLng: input.originLng,
          }
        : {}),

      ...("transportMode" in input
        ? {
            transportMode: input.transportMode,
          }
        : {}),

      ...("travelerCount" in input
        ? {
            travelerCount: input.travelerCount,
          }
        : {}),

      ...("weatherCondition" in input
        ? {
            weatherCondition: input.weatherCondition,
          }
        : {}),

      ...("estimatedTravelMinutes" in input
        ? {
            estimatedTravelMinutes: input.estimatedTravelMinutes,
          }
        : {}),

      ...("mockSunsetTime" in input
        ? {
            mockSunsetTime:
              input.mockSunsetTime === "" ? null : input.mockSunsetTime,
          }
        : {}),

      ...("notes" in input
        ? {
            notes: input.notes === "" ? null : input.notes,
          }
        : {}),

      ...(resetToDraft
        ? {
            status: "DRAFT",
          }
        : {}),
    },

    include: detailTripInclude,
      });
    });
  } catch (error) {
    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new TripCancelledError();
    }
    throw error;
  }

  return mapTripToDetailDto(updatedTrip);
}

export async function cancelTripForCurrentUser(
  tripId: string,
): Promise<TripDetailDto> {
  await getTripDetailRecordForCurrentUser(tripId);

  const cancelledTrip = await prisma.trip.update({
    where: {
      id: tripId,
    },

    data: {
      status: "CANCELLED",
    },

    include: detailTripInclude,
  });

  return mapTripToDetailDto(cancelledTrip);
}
