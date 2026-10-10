// ./lib/orchestration/trip-live-evaluation-orchestrator.ts

import { prisma } from "@/lib/db/prisma";

import { mapEvaluationToDto } from "@/lib/mappers/evaluation-dto";

import {
  evaluateAndSaveTripForCurrentUser,
} from "@/lib/services/evaluation-service";

import {
  assertTripCanBeEvaluated,
  getTripForCurrentUser,
} from "@/lib/services/trip-service";

import {
  mapLatestSnapshotsToEvaluationInput,
} from "./live-evaluation-input-mapper";

type MissingLiveSnapshotCode =
  | "missing_weather_snapshot"
  | "missing_route_snapshot"
  | "missing_sunset_snapshot";

type StaleLiveSnapshotCode =
  | "stale_weather_snapshot"
  | "stale_route_snapshot"
  | "stale_sunset_snapshot";

export class MissingLiveSnapshotError extends Error {
  code: MissingLiveSnapshotCode;

  constructor(
    message: string,
    code: MissingLiveSnapshotCode,
  ) {
    super(message);

    this.name = "MissingLiveSnapshotError";
    this.code = code;
  }
}

export class StaleLiveSnapshotError extends Error {
  code: StaleLiveSnapshotCode;

  constructor(
    message: string,
    code: StaleLiveSnapshotCode,
  ) {
    super(message);

    this.name = "StaleLiveSnapshotError";
    this.code = code;
  }
}

export type EvaluateLiveTripResult = {
  tripId: string;
  data: ReturnType<typeof mapEvaluationToDto>;
};

function toCoordinateNumber(
  value:
    | { toNumber(): number }
    | number
    | null
    | undefined,
) {
  if (typeof value === "number") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    typeof value.toNumber === "function"
  ) {
    return value.toNumber();
  }

  return null;
}

function coordinatesMatch(
  left:
    | { toNumber(): number }
    | number
    | null
    | undefined,
  right:
    | { toNumber(): number }
    | number
    | null
    | undefined,
) {
  const leftNumber = toCoordinateNumber(left);
  const rightNumber = toCoordinateNumber(right);

  if (
    leftNumber === null ||
    rightNumber === null
  ) {
    return false;
  }

  /*
   * พิกัดจาก Trip/Park และ Snapshot อาจผ่าน Prisma Decimal
   * จึงไม่ควรเทียบ floating point ด้วย ===
   *
   * 0.00001 degree ≈ ระดับประมาณ 1 เมตร
   */
  return Math.abs(leftNumber - rightNumber) <= 0.00001;
}

function formatCalendarDateInTimeZone(
  date: Date,
  timeZone: string,
) {
  const formatter = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );

  const parts = formatter.formatToParts(date);

  const year = parts.find(
    (part) => part.type === "year",
  )?.value;

  const month = parts.find(
    (part) => part.type === "month",
  )?.value;

  const day = parts.find(
    (part) => part.type === "day",
  )?.value;

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function assertWeatherSnapshotMatchesTrip(args: {
  trip: Awaited<
    ReturnType<typeof getTripForCurrentUser>
  >;
  weatherSnapshot: {
    forecastAt: Date;
    timezone: string;
    latitude:
      | { toNumber(): number }
      | number;
    longitude:
      | { toNumber(): number }
      | number;
  };
}) {
  const {
    trip,
    weatherSnapshot,
  } = args;

  const parkLatitude =
    toCoordinateNumber(trip.park.latitude);

  const parkLongitude =
    toCoordinateNumber(trip.park.longitude);

  if (
    parkLatitude === null ||
    parkLongitude === null
  ) {
    throw new StaleLiveSnapshotError(
      "Current park coordinates are unavailable",
      "stale_weather_snapshot",
    );
  }

  const tripDate =
    formatCalendarDateInTimeZone(
      trip.tripDate,
      weatherSnapshot.timezone,
    );

  const forecastDate =
    formatCalendarDateInTimeZone(
      weatherSnapshot.forecastAt,
      weatherSnapshot.timezone,
    );

  const dateMatches =
    tripDate !== null &&
    forecastDate !== null &&
    tripDate === forecastDate;

  const latitudeMatches =
    coordinatesMatch(
      weatherSnapshot.latitude,
      parkLatitude,
    );

  const longitudeMatches =
    coordinatesMatch(
      weatherSnapshot.longitude,
      parkLongitude,
    );

  if (
    !dateMatches ||
    !latitudeMatches ||
    !longitudeMatches
  ) {
    throw new StaleLiveSnapshotError(
      "Weather snapshot does not match the current trip. Please sync weather again.",
      "stale_weather_snapshot",
    );
  }
}

function assertRouteSnapshotMatchesTrip(args: {
  trip: Awaited<
    ReturnType<typeof getTripForCurrentUser>
  >;
  routeSnapshot: {
    originLat:
      | { toNumber(): number }
      | number;
    originLng:
      | { toNumber(): number }
      | number;
    destinationLat:
      | { toNumber(): number }
      | number;
    destinationLng:
      | { toNumber(): number }
      | number;
  };
}) {
  const {
    trip,
    routeSnapshot,
  } = args;

  const originLat =
    toCoordinateNumber(trip.originLat);

  const originLng =
    toCoordinateNumber(trip.originLng);

  const destinationLat =
    toCoordinateNumber(trip.park.latitude);

  const destinationLng =
    toCoordinateNumber(trip.park.longitude);

  if (
    originLat === null ||
    originLng === null ||
    destinationLat === null ||
    destinationLng === null
  ) {
    throw new StaleLiveSnapshotError(
      "Current trip route coordinates are unavailable",
      "stale_route_snapshot",
    );
  }

  const matches =
    coordinatesMatch(
      routeSnapshot.originLat,
      originLat,
    ) &&
    coordinatesMatch(
      routeSnapshot.originLng,
      originLng,
    ) &&
    coordinatesMatch(
      routeSnapshot.destinationLat,
      destinationLat,
    ) &&
    coordinatesMatch(
      routeSnapshot.destinationLng,
      destinationLng,
    );

  if (!matches) {
    throw new StaleLiveSnapshotError(
      "Route snapshot does not match the current trip. Please sync the route again.",
      "stale_route_snapshot",
    );
  }
}

function assertSunsetSnapshotMatchesTrip(args: {
  trip: Awaited<
    ReturnType<typeof getTripForCurrentUser>
  >;
  sunsetSnapshot: {
    sunsetAt: Date;
    timezone: string;
    latitude:
      | { toNumber(): number }
      | number;
    longitude:
      | { toNumber(): number }
      | number;
  };
}) {
  const {
    trip,
    sunsetSnapshot,
  } = args;

  const parkLatitude =
    toCoordinateNumber(trip.park.latitude);

  const parkLongitude =
    toCoordinateNumber(trip.park.longitude);

  if (
    parkLatitude === null ||
    parkLongitude === null
  ) {
    throw new StaleLiveSnapshotError(
      "Current park coordinates are unavailable",
      "stale_sunset_snapshot",
    );
  }

  const tripDate =
    formatCalendarDateInTimeZone(
      trip.tripDate,
      sunsetSnapshot.timezone,
    );

  const sunsetDate =
    formatCalendarDateInTimeZone(
      sunsetSnapshot.sunsetAt,
      sunsetSnapshot.timezone,
    );

  const dateMatches =
    tripDate !== null &&
    sunsetDate !== null &&
    tripDate === sunsetDate;

  const latitudeMatches =
    coordinatesMatch(
      sunsetSnapshot.latitude,
      parkLatitude,
    );

  const longitudeMatches =
    coordinatesMatch(
      sunsetSnapshot.longitude,
      parkLongitude,
    );

  if (
    !dateMatches ||
    !latitudeMatches ||
    !longitudeMatches
  ) {
    throw new StaleLiveSnapshotError(
      "Sunset snapshot does not match the current trip. Please sync sunset again.",
      "stale_sunset_snapshot",
    );
  }
}

export async function evaluateLiveTripForCurrentUser(
  tripId: string,
  snapshotIds?: {
    weatherSnapshotId: string;
    routeSnapshotId: string;
    sunsetSnapshotId: string;
  },
): Promise<EvaluateLiveTripResult> {
  const trip =
    await getTripForCurrentUser(tripId);
  assertTripCanBeEvaluated(trip);

  const [
    weatherSnapshot,
    routeSnapshot,
    sunsetSnapshot,
  ] = await Promise.all([
    prisma.weatherSnapshot.findFirst({
      where: {
        tripId: trip.id,
        ...(snapshotIds ? { id: snapshotIds.weatherSnapshotId } : {}),
      },
      ...(!snapshotIds ? { orderBy: { createdAt: "desc" as const } } : {}),
    }),

    prisma.routeSnapshot.findFirst({
      where: {
        tripId: trip.id,
        ...(snapshotIds ? { id: snapshotIds.routeSnapshotId } : {}),
      },
      ...(!snapshotIds ? { orderBy: { createdAt: "desc" as const } } : {}),
    }),

    prisma.sunsetSnapshot.findFirst({
      where: {
        tripId: trip.id,
        ...(snapshotIds ? { id: snapshotIds.sunsetSnapshotId } : {}),
      },
      ...(!snapshotIds ? { orderBy: { createdAt: "desc" as const } } : {}),
    }),
  ]);

  if (!weatherSnapshot) {
    throw new MissingLiveSnapshotError(
      "Weather snapshot is required for live evaluation",
      "missing_weather_snapshot",
    );
  }

  if (!routeSnapshot) {
    throw new MissingLiveSnapshotError(
      "Route snapshot is required for live evaluation",
      "missing_route_snapshot",
    );
  }

  if (!sunsetSnapshot) {
    throw new MissingLiveSnapshotError(
      "Sunset snapshot is required for live evaluation",
      "missing_sunset_snapshot",
    );
  }

  /*
   * Snapshot consistency guard
   *
   * ก่อนใช้ snapshot ล่าสุด ต้องยืนยันก่อนว่า
   * snapshot นั้นยังตรงกับ Trip ปัจจุบัน
   * ไม่ใช่ข้อมูลจากแผนก่อนแก้ไข
   */

  assertWeatherSnapshotMatchesTrip({
    trip,
    weatherSnapshot,
  });

  assertRouteSnapshotMatchesTrip({
    trip,
    routeSnapshot,
  });

  assertSunsetSnapshotMatchesTrip({
    trip,
    sunsetSnapshot,
  });

  /*
   * Source of truth:
   * Live snapshots → Evaluation input
   *
   * รวมถึง:
   * - transport duration multiplier
   * - direct public transit info
   * - local sunset time
   */
  const evaluationInput =
    mapLatestSnapshotsToEvaluationInput({
      trip,
      weatherSnapshot,
      routeSnapshot,
      sunsetSnapshot,
    });

  /*
   * ส่งต่อเข้า centralized evaluation pipeline
   *
   * Engine
   * + factors
   * + constraints
   * + LLM explanation
   * + DB persistence
   */
  return evaluateAndSaveTripForCurrentUser(
    trip.id,
    evaluationInput,
    {
      weatherSnapshotId: weatherSnapshot.id,
      routeSnapshotId: routeSnapshot.id,
      sunsetSnapshotId: sunsetSnapshot.id,
    },
  );
}
