// ./lib/orchestration/live-snapshot-consistency.ts

type CoordinateValue =
  | number
  | {
      toNumber(): number;
    }
  | null
  | undefined;

export type MissingLiveSnapshotCode =
  | "missing_weather_snapshot"
  | "missing_route_snapshot"
  | "missing_sunset_snapshot";

export type StaleLiveSnapshotCode =
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

type TripSnapshotContext = {
  tripDate: Date;

  originLat: CoordinateValue;
  originLng: CoordinateValue;

  park: {
    latitude: CoordinateValue;
    longitude: CoordinateValue;
  };
};

type WeatherSnapshotContext = {
  forecastAt: Date;
  timezone: string;

  latitude: CoordinateValue;
  longitude: CoordinateValue;
};

type RouteSnapshotContext = {
  originLat: CoordinateValue;
  originLng: CoordinateValue;

  destinationLat: CoordinateValue;
  destinationLng: CoordinateValue;
};

type SunsetSnapshotContext = {
  sunsetAt: Date;
  timezone: string;

  latitude: CoordinateValue;
  longitude: CoordinateValue;
};

type AssertLiveSnapshotsArgs = {
  trip: TripSnapshotContext;

  weatherSnapshot:
    | WeatherSnapshotContext
    | null
    | undefined;

  routeSnapshot:
    | RouteSnapshotContext
    | null
    | undefined;

  sunsetSnapshot:
    | SunsetSnapshotContext
    | null
    | undefined;
};

/*
 * ประมาณ 0.00001 degree ≈ ระดับ 1 เมตร
 *
 * ใช้ tolerance แทน ===
 * เพราะพิกัดอาจผ่าน Prisma Decimal / floating point
 */
const COORDINATE_TOLERANCE = 0.00001;

function toCoordinateNumber(
  value: CoordinateValue,
): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (
    value &&
    typeof value === "object" &&
    typeof value.toNumber === "function"
  ) {
    const converted = value.toNumber();

    return Number.isFinite(converted)
      ? converted
      : null;
  }

  return null;
}

export function coordinatesMatch(
  left: CoordinateValue,
  right: CoordinateValue,
) {
  const leftNumber =
    toCoordinateNumber(left);

  const rightNumber =
    toCoordinateNumber(right);

  if (
    leftNumber === null ||
    rightNumber === null
  ) {
    return false;
  }

  return (
    Math.abs(leftNumber - rightNumber) <=
    COORDINATE_TOLERANCE
  );
}

export function formatCalendarDateInTimeZone(
  date: Date,
  timeZone: string,
) {
  const formatter =
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const parts =
    formatter.formatToParts(date);

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

export function assertWeatherSnapshotMatchesTrip(
  trip: TripSnapshotContext,
  weatherSnapshot: WeatherSnapshotContext,
) {
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
      trip.park.latitude,
    );

  const longitudeMatches =
    coordinatesMatch(
      weatherSnapshot.longitude,
      trip.park.longitude,
    );

  if (
    !dateMatches ||
    !latitudeMatches ||
    !longitudeMatches
  ) {
    throw new StaleLiveSnapshotError(
      "Weather snapshot does not match the current trip",
      "stale_weather_snapshot",
    );
  }
}

export function assertRouteSnapshotMatchesTrip(
  trip: TripSnapshotContext,
  routeSnapshot: RouteSnapshotContext,
) {
  const matches =
    coordinatesMatch(
      routeSnapshot.originLat,
      trip.originLat,
    ) &&
    coordinatesMatch(
      routeSnapshot.originLng,
      trip.originLng,
    ) &&
    coordinatesMatch(
      routeSnapshot.destinationLat,
      trip.park.latitude,
    ) &&
    coordinatesMatch(
      routeSnapshot.destinationLng,
      trip.park.longitude,
    );

  if (!matches) {
    throw new StaleLiveSnapshotError(
      "Route snapshot does not match the current trip",
      "stale_route_snapshot",
    );
  }
}

export function assertSunsetSnapshotMatchesTrip(
  trip: TripSnapshotContext,
  sunsetSnapshot: SunsetSnapshotContext,
) {
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
      trip.park.latitude,
    );

  const longitudeMatches =
    coordinatesMatch(
      sunsetSnapshot.longitude,
      trip.park.longitude,
    );

  if (
    !dateMatches ||
    !latitudeMatches ||
    !longitudeMatches
  ) {
    throw new StaleLiveSnapshotError(
      "Sunset snapshot does not match the current trip",
      "stale_sunset_snapshot",
    );
  }
}

export function assertLiveSnapshotsMatchTrip(
  args: AssertLiveSnapshotsArgs,
) {
  const {
    trip,
    weatherSnapshot,
    routeSnapshot,
    sunsetSnapshot,
  } = args;

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

  assertWeatherSnapshotMatchesTrip(
    trip,
    weatherSnapshot,
  );

  assertRouteSnapshotMatchesTrip(
    trip,
    routeSnapshot,
  );

  assertSunsetSnapshotMatchesTrip(
    trip,
    sunsetSnapshot,
  );
}