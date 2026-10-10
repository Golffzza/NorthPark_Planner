import type { TripEvaluationInput } from "./types";

type TimelineInput = Pick<TripEvaluationInput,
  "tripDate" | "timeZone" | "departAt" | "estimatedTravelMinutes" | "sunsetAt" | "mockSunsetTime"
>;

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const number = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: number("year"), month: number("month"), day: number("day"),
    hour: number("hour"), minute: number("minute"), second: number("second") };
}

function localDateTimeToUtc(year: number, month: number, day: number,
  hour: number, minute: number, timeZone: string) {
  const wallTime = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wallTime;
  for (let index = 0; index < 3; index += 1) {
    const local = localParts(new Date(guess), timeZone);
    const offset = Date.UTC(local.year, local.month - 1, local.day,
      local.hour, local.minute, local.second) - guess;
    const next = wallTime - offset;
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}

function calendarKey(parts: ReturnType<typeof localParts>) {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

export function getTripTimeline(input: TimelineInput) {
  const timeZone = input.timeZone ?? "Asia/Bangkok";
  const tripDate = input.tripDate ?? new Date("2000-01-01T00:00:00.000Z");
  const date = localParts(tripDate, timeZone);
  const [hour, minute] = input.departAt.split(":").map(Number);
  const departureAt = localDateTimeToUtc(date.year, date.month, date.day, hour, minute, timeZone);
  const arrivalAt = new Date(departureAt.getTime() + Math.max(0, input.estimatedTravelMinutes) * 60_000);
  const arrival = localParts(arrivalAt, timeZone);
  const dayOffset = Math.round((calendarKey(arrival) - calendarKey(date)) / 86_400_000);
  const arrivalMinutes = arrival.hour * 60 + arrival.minute;

  let sunsetAt = input.sunsetAt;
  if (!sunsetAt && input.mockSunsetTime && dayOffset === 0) {
    const [sunsetHour, sunsetMinute] = input.mockSunsetTime.split(":").map(Number);
    sunsetAt = localDateTimeToUtc(date.year, date.month, date.day,
      sunsetHour, sunsetMinute, timeZone);
  }
  if (sunsetAt && calendarKey(localParts(sunsetAt, timeZone)) !== calendarKey(arrival)) {
    sunsetAt = undefined;
  }

  return { departureAt, arrivalAt, arrivalMinutes, dayOffset, sunsetAt,
    arrivalTime: `${String(arrival.hour).padStart(2, "0")}:${String(arrival.minute).padStart(2, "0")}` };
}
