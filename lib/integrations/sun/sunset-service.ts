type SunsetSnapshotInput = {
  latitude: number;
  longitude: number;
  tripDate: Date;
  timezone: string;
};

export type CalculatedSunsetSnapshot = {
  source: "SYSTEM";
  timezone: string;
  sunsetAt: Date;
  sunsetLocalTime: string;
};

export class SunsetCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SunsetCalculationError";
  }
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function normalizeDegrees(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function normalizeHours(value: number) {
  const normalized = value % 24;
  return normalized < 0 ? normalized + 24 : normalized;
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const second = Number(parts.find((part) => part.type === "second")?.value);
  const zonedTime = Date.UTC(year, month - 1, day, hour, minute, second);

  return (zonedTime - date.getTime()) / 60_000;
}

function getDayOfYear(year: number, month: number, day: number) {
  const start = Date.UTC(year, 0, 0);
  const current = Date.UTC(year, month - 1, day);

  return Math.floor((current - start) / 86_400_000);
}

function floorDiv(value: number, divisor: number) {
  return Math.floor(value / divisor);
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) {
  let guess = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let index = 0; index < 3; index += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(new Date(guess), timeZone);
    const nextGuess = Date.UTC(year, month - 1, day, hour, minute, 0) - offsetMinutes * 60_000;

    if (nextGuess === guess) {
      break;
    }

    guess = nextGuess;
  }

  return new Date(guess);
}

function formatTime(hours: number, minutes: number) {
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function calculateSunsetSnapshot(input: SunsetSnapshotInput): CalculatedSunsetSnapshot {
  if (
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude) ||
    input.latitude < -90 ||
    input.latitude > 90 ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    throw new SunsetCalculationError("Invalid coordinates");
  }

  const { year, month, day } = getDatePartsInTimeZone(input.tripDate, input.timezone);
  const dayOfYear = getDayOfYear(year, month, day);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const timezoneOffsetHours = getTimeZoneOffsetMinutes(noonUtc, input.timezone) / 60;
  // NOAA's simplified sunrise/sunset formula treats west longitudes as positive,
  // so we invert our standard east-positive coordinates before applying it.
  const longitudeHour = -input.longitude / 15;
  const approximateTime = dayOfYear + (18 - longitudeHour) / 24;
  const meanAnomaly = 0.9856 * approximateTime - 3.289;
  const trueLongitude = normalizeDegrees(
    meanAnomaly +
      1.916 * Math.sin(toRadians(meanAnomaly)) +
      0.02 * Math.sin(2 * toRadians(meanAnomaly)) +
      282.634,
  );
  let rightAscension = normalizeDegrees(toDegrees(Math.atan(0.91764 * Math.tan(toRadians(trueLongitude)))));
  const trueLongitudeQuadrant = Math.floor(trueLongitude / 90) * 90;
  const rightAscensionQuadrant = Math.floor(rightAscension / 90) * 90;

  rightAscension = (rightAscension + trueLongitudeQuadrant - rightAscensionQuadrant) / 15;

  const sinDeclination = 0.39782 * Math.sin(toRadians(trueLongitude));
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosHourAngle =
    (Math.cos(toRadians(90.833)) -
      sinDeclination * Math.sin(toRadians(input.latitude))) /
    (cosDeclination * Math.cos(toRadians(input.latitude)));

  if (cosHourAngle < -1 || cosHourAngle > 1) {
    throw new SunsetCalculationError("Sunset cannot be calculated for the provided coordinates");
  }

  const hourAngle = toDegrees(Math.acos(cosHourAngle));
  const localHour = (360 - hourAngle) / 15;
  const localMeanTime = localHour + rightAscension - 0.06571 * approximateTime - 6.622;
  const universalTime = normalizeHours(localMeanTime - longitudeHour);
  const localTimeHours = universalTime + timezoneOffsetHours;
  const roundedLocalMinutes = Math.round(localTimeHours * 60);
  const dayCarry = floorDiv(roundedLocalMinutes, 1_440);
  const minuteOfDay = ((roundedLocalMinutes % 1_440) + 1_440) % 1_440;
  const localDate = new Date(Date.UTC(year, month - 1, day + dayCarry));
  const localYear = localDate.getUTCFullYear();
  const localMonth = localDate.getUTCMonth() + 1;
  const localDay = localDate.getUTCDate();
  const sunsetHour = Math.floor(minuteOfDay / 60);
  const sunsetMinute = minuteOfDay % 60;

  return {
    source: "SYSTEM",
    timezone: input.timezone,
    sunsetAt: zonedDateTimeToUtc(
      localYear,
      localMonth,
      localDay,
      sunsetHour,
      sunsetMinute,
      input.timezone,
    ),
    sunsetLocalTime: formatTime(sunsetHour, sunsetMinute),
  };
}
