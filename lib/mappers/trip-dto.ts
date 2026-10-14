import type { Prisma } from "@prisma/client";

import { mapEvaluationToDto, type EvaluationDto } from "@/lib/mappers/evaluation-dto";

type TripParkSummary = {
  id: string;
  nameTh: string;
  nameEn: string | null;
  province: string;
  openTime: string;
  closeTime: string;
  coverImageUrl: string | null;
};

export type TripListDto = {
  id: string;
  tripDate: string | null;
  departAt: string | null;
  originText: string | null;
  originLat: number | null;
  originLng: number | null;
  transportMode: string | null;
  travelerCount: number | null;
  weatherCondition: string | null;
  estimatedTravelMinutes: number | null;
  mockSunsetTime: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  park: TripParkSummary;
  latestEvaluation?: {
    id: string;
    totalScore: number;
    level: string;
    summary: string;
    evaluatedAt: string;
  };
};

export type TripDetailEvaluationDto = EvaluationDto & {
  weatherSnapshot?: {
    id: string;
    weatherCondition: string;
    temperatureC: number | null;
    createdAt: string;
  } | null;
  routeSnapshot?: {
    id: string;
    distanceMeters: number;
    durationSeconds: number;
    createdAt: string;
  } | null;
  sunsetSnapshot?: {
    id: string;
    sunsetLocalTime: string;
    createdAt: string;
  } | null;
};

export type TripDetailDto = Omit<TripListDto, "latestEvaluation"> & {
  itineraryDays?: Array<{
    day: number;
    title: string;
    notes: string | null;
    items: Array<{ position: number; name: string; sourceReference: string | null; notes: string | null }>;
  }>;
  evaluations: TripDetailEvaluationDto[];
  latestWeatherSnapshot?: {
    id: string;
    weatherCondition: string;
    temperatureC: number | null;
    createdAt: string;
  };
  latestRouteSnapshot?: {
    id: string;
    distanceMeters: number;
    durationSeconds: number;
    createdAt: string;
  };
};

type TripListRecord = Prisma.TripGetPayload<{
  include: {
    park: {
      select: {
        id: true;
        nameTh: true;
        nameEn: true;
        province: true;
        openTime: true;
        closeTime: true;
        coverImageUrl: true;
      };
    };
    evaluations: {
      select: {
        id: true;
        totalScore: true;
        level: true;
        summary: true;
        evaluatedAt: true;
      };
    };
  };
}>;

type TripDetailRecord = Prisma.TripGetPayload<{
  include: {
    itineraryDays: { include: { items: true } };
    park: {
      select: {
        id: true;
        nameTh: true;
        nameEn: true;
        province: true;
        openTime: true;
        closeTime: true;
        coverImageUrl: true;
      };
    };
    evaluations: {
      include: {
        weatherSnapshot: {
          select: {
            id: true;
            weatherCondition: true;
            temperatureC: true;
            createdAt: true;
          };
        };
        routeSnapshot: {
          select: {
            id: true;
            distanceMeters: true;
            durationSeconds: true;
            createdAt: true;
          };
        };
        sunsetSnapshot: {
          select: {
            id: true;
            sunsetLocalTime: true;
            createdAt: true;
          };
        };
      };
    };
    weatherSnapshots: {
      select: {
        id: true;
        weatherCondition: true;
        temperatureC: true;
        createdAt: true;
      };
    };
    routeSnapshots: {
      select: {
        id: true;
        distanceMeters: true;
        durationSeconds: true;
        createdAt: true;
      };
    };
  };
}>;

function mapPark(park: TripListRecord["park"] | TripDetailRecord["park"]): TripParkSummary {
  return {
    id: park.id,
    nameTh: park.nameTh,
    nameEn: park.nameEn,
    province: park.province,
    openTime: park.openTime,
    closeTime: park.closeTime,
    coverImageUrl: park.coverImageUrl,
  };
}

export function mapTripToListDto(trip: TripListRecord): TripListDto {
  const latestEvaluation = trip.evaluations[0];

  return {
    id: trip.id,
    tripDate: trip.tripDate?.toISOString() ?? null,
    departAt: trip.departAt,
    originText: trip.originText,
    originLat: trip.originLat !== null ? Number(trip.originLat) : null,
    originLng: trip.originLng !== null ? Number(trip.originLng) : null,
    transportMode: trip.transportMode,
    travelerCount: trip.travelerCount,
    weatherCondition: trip.weatherCondition,
    estimatedTravelMinutes: trip.estimatedTravelMinutes,
    mockSunsetTime: trip.mockSunsetTime,
    notes: trip.notes,
    status: trip.status,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
    park: mapPark(trip.park),
    ...(latestEvaluation
      ? {
          latestEvaluation: {
            id: latestEvaluation.id,
            totalScore: latestEvaluation.totalScore,
            level: latestEvaluation.level,
            summary: latestEvaluation.summary,
            evaluatedAt: latestEvaluation.evaluatedAt.toISOString(),
          },
        }
      : {}),
  };
}

export function mapTripToDetailDto(trip: TripDetailRecord): TripDetailDto {
  const latestWeatherSnapshot = trip.weatherSnapshots?.[0];
  const latestRouteSnapshot = trip.routeSnapshots?.[0];

  return {
    id: trip.id,
    tripDate: trip.tripDate?.toISOString() ?? null,
    departAt: trip.departAt,
    originText: trip.originText,
    originLat: trip.originLat !== null ? Number(trip.originLat) : null,
    originLng: trip.originLng !== null ? Number(trip.originLng) : null,
    transportMode: trip.transportMode,
    travelerCount: trip.travelerCount,
    weatherCondition: trip.weatherCondition,
    estimatedTravelMinutes: trip.estimatedTravelMinutes,
    mockSunsetTime: trip.mockSunsetTime,
    notes: trip.notes,
    status: trip.status,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
    park: mapPark(trip.park),
    itineraryDays: (trip.itineraryDays ?? []).map((day) => ({
      day: day.dayNumber,
      title: day.title,
      notes: day.notes,
      items: day.items.map((item) => ({
        position: item.position,
        name: item.name,
        sourceReference: item.sourceReference,
        notes: item.notes,
      })),
    })),
    evaluations: trip.evaluations.map((evaluation) => ({
      ...mapEvaluationToDto(evaluation),
      weatherSnapshot: evaluation.weatherSnapshot
        ? {
            id: evaluation.weatherSnapshot.id,
            weatherCondition: evaluation.weatherSnapshot.weatherCondition,
            temperatureC: evaluation.weatherSnapshot.temperatureC,
            createdAt: evaluation.weatherSnapshot.createdAt.toISOString(),
          }
        : null,
      routeSnapshot: evaluation.routeSnapshot
        ? {
            id: evaluation.routeSnapshot.id,
            distanceMeters: evaluation.routeSnapshot.distanceMeters,
            durationSeconds: evaluation.routeSnapshot.durationSeconds,
            createdAt: evaluation.routeSnapshot.createdAt.toISOString(),
          }
        : null,
      sunsetSnapshot: evaluation.sunsetSnapshot
        ? {
            id: evaluation.sunsetSnapshot.id,
            sunsetLocalTime: evaluation.sunsetSnapshot.sunsetLocalTime,
            createdAt: evaluation.sunsetSnapshot.createdAt.toISOString(),
          }
        : null,
    })),
    ...(latestWeatherSnapshot
      ? {
          latestWeatherSnapshot: {
            id: latestWeatherSnapshot.id,
            weatherCondition: latestWeatherSnapshot.weatherCondition,
            temperatureC: latestWeatherSnapshot.temperatureC,
            createdAt: latestWeatherSnapshot.createdAt.toISOString(),
          },
        }
      : {}),
    ...(latestRouteSnapshot
      ? {
          latestRouteSnapshot: {
            id: latestRouteSnapshot.id,
            distanceMeters: latestRouteSnapshot.distanceMeters,
            durationSeconds: latestRouteSnapshot.durationSeconds,
            createdAt: latestRouteSnapshot.createdAt.toISOString(),
          },
        }
      : {}),
  };
}
