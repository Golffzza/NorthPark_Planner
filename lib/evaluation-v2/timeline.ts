/** Pure E2 calendar calculations. Schedule evidence is not a live open/closed declaration. */
type LocalParts = { year: number; month: number; day: number; hour: number; minute: number };
type VisitInterval = { open: string; close: string; closesNextDay?: boolean };
export type VisitSchedule = { serviceDate: string; intervals: VisitInterval[]; sourceId: string };

function assertDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
    throw new Error("Invalid local date");
  }
}

function parseClock(value: string): [number, number] {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("Invalid local time");
  return [Number(value.slice(0, 2)), Number(value.slice(3, 5))];
}

function localParts(instant: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(instant);
  const number = (kind: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === kind)?.value);
  return { year: number("year"), month: number("month"), day: number("day"),
    hour: number("hour"), minute: number("minute") };
}

function key(parts: LocalParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function addCalendarDays(date: string, days: number): string {
  assertDate(date);
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Rejects missing or repeated DST wall times instead of choosing an arbitrary instant. */
function localInstant(date: string, clock: string, timeZone: string): Date {
  assertDate(date);
  const [hour, minute] = parseClock(clock);
  const wallUtc = Date.parse(`${date}T${clock}:00Z`);
  const offsets = new Set<number>();
  for (let step = -6; step <= 6; step += 1) {
    const candidate = wallUtc + step * 6 * 3_600_000;
    const local = localParts(new Date(candidate), timeZone);
    offsets.add(Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute) - candidate);
  }
  const matches = [...offsets].map((offset) => new Date(wallUtc - offset)).filter((candidate) => {
    const local = localParts(candidate, timeZone);
    return key(local) === date && local.hour === hour && local.minute === minute;
  });
  if (matches.length !== 1) throw new Error("Ambiguous or nonexistent local time");
  return matches[0];
}

export function buildEvaluationTimeline(input: {
  departureDate: string; departAt: string; timeZone: string; routeDurationSeconds: number;
}) {
  if (!Number.isFinite(input.routeDurationSeconds) || input.routeDurationSeconds < 0) {
    throw new Error("Invalid provider route duration");
  }
  const departureAt = localInstant(input.departureDate, input.departAt, input.timeZone);
  const arrivalAt = new Date(departureAt.getTime() + input.routeDurationSeconds * 1000);
  const arrivalLocalDate = key(localParts(arrivalAt, input.timeZone));
  const dayOffset = (Date.parse(`${arrivalLocalDate}T00:00:00Z`) - Date.parse(`${input.departureDate}T00:00:00Z`)) / 86_400_000;
  return { departureAt, arrivalAt, arrivalLocalDate, dayOffset, timeZone: input.timeZone,
    durationSource: "ROUTING_PROVIDER" as const };
}

type ResolvedInterval = { start: Date; end: Date };
function resolveIntervals(schedule: VisitSchedule, timeZone: string): ResolvedInterval[] {
  assertDate(schedule.serviceDate);
  if (!schedule.sourceId.trim()) throw new Error("Missing visit schedule provenance");
  const intervals = schedule.intervals.map((interval) => {
    const start = localInstant(schedule.serviceDate, interval.open, timeZone);
    const closeDate = interval.closesNextDay ? addCalendarDays(schedule.serviceDate, 1) : schedule.serviceDate;
    const end = localInstant(closeDate, interval.close, timeZone);
    if (end <= start) throw new Error("Invalid visit interval");
    return { start, end };
  }).sort((a, b) => a.start.getTime() - b.start.getTime());
  for (let index = 1; index < intervals.length; index += 1) {
    if (intervals[index].start < intervals[index - 1].end) throw new Error("Overlapping visit intervals");
    if (intervals[index].start.getTime() === intervals[index - 1].end.getTime()) {
      intervals[index].start = intervals[index - 1].start;
      intervals.splice(index - 1, 1);
      index -= 1;
    }
  }
  return intervals;
}

export type VisitScheduleResult = {
  status: "OK" | "CLOSED_SCHEDULED" | "UNKNOWN";
  serviceDate?: string;
  sourceId?: string;
  openingWindowMinutes?: number;
  remainingVisitMinutes?: number;
  isOpenAtArrival?: boolean;
  nextOpeningAt?: Date | null;
  reason?: "SCHEDULE_MISSING" | "SCHEDULE_CONFLICT";
};

export function resolveVisitSchedule(input: {
  arrivalAt: Date; timeZone: string; schedules: readonly VisitSchedule[];
}): VisitScheduleResult {
  if (!Number.isFinite(input.arrivalAt.getTime())) throw new Error("Invalid arrival instant");
  const arrivalDate = key(localParts(input.arrivalAt, input.timeZone));
  const previousDate = addCalendarDays(arrivalDate, -1);
  const relevant = input.schedules.filter((schedule) => schedule.serviceDate === arrivalDate || schedule.serviceDate === previousDate);
  const current = relevant.filter((schedule) => schedule.serviceDate === arrivalDate);
  if (current.length > 1 || relevant.filter((schedule) => schedule.serviceDate === previousDate).length > 1) {
    return { status: "UNKNOWN", reason: "SCHEDULE_CONFLICT" };
  }
  try {
    const previous = relevant.find((schedule) => schedule.serviceDate === previousDate);
    const previousIntervals = previous ? resolveIntervals(previous, input.timeZone) : [];
    const currentIntervals = current[0] ? resolveIntervals(current[0], input.timeZone) : [];
    const overnight = previous && previousIntervals.some((interval) =>
      interval.start <= input.arrivalAt && input.arrivalAt < interval.end);
    if (overnight && currentIntervals.some((interval) => interval.start <= input.arrivalAt && input.arrivalAt < interval.end)) {
      return { status: "UNKNOWN", reason: "SCHEDULE_CONFLICT" };
    }
    const selected = overnight ? previous : current[0];
    if (!selected) return { status: "UNKNOWN", reason: "SCHEDULE_MISSING" };
    if (selected.intervals.length === 0) return { status: "CLOSED_SCHEDULED", serviceDate: selected.serviceDate,
      sourceId: selected.sourceId, openingWindowMinutes: 0, remainingVisitMinutes: 0, isOpenAtArrival: false,
      nextOpeningAt: null };
    const intervals = overnight ? previousIntervals : currentIntervals;
    const openingWindowMinutes = intervals.reduce((sum, interval) => sum + (interval.end.getTime() - interval.start.getTime()) / 60_000, 0);
    const remainingVisitMinutes = intervals.reduce((sum, interval) => sum + Math.max(0,
      (interval.end.getTime() - Math.max(input.arrivalAt.getTime(), interval.start.getTime())) / 60_000), 0);
    const isOpenAtArrival = intervals.some((interval) => interval.start <= input.arrivalAt && input.arrivalAt < interval.end);
    const nextOpeningAt = intervals.find((interval) => interval.start > input.arrivalAt)?.start ?? null;
    return { status: "OK", serviceDate: selected.serviceDate, sourceId: selected.sourceId,
      openingWindowMinutes, remainingVisitMinutes, isOpenAtArrival, nextOpeningAt };
  } catch {
    return { status: "UNKNOWN", reason: "SCHEDULE_CONFLICT" };
  }
}
