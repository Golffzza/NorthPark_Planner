import { resolveVisitSchedule, type VisitSchedule } from "./timeline";

/** No external caller's review flag can authorize production visiting-hour evidence. */
export const TIME_RUBRIC_VERSION = "E1.1-TIME-CANDIDATE";
export type ScheduleClaim = {
  schedules: readonly VisitSchedule[];
  sourceId?: string;
  reviewStatus?: "VERIFIED" | "PENDING" | "REJECTED";
};
export type TimeResult = {
  status: "KNOWN" | "UNKNOWN";
  T: number | null;
  arrivalAt: Date;
  openingWindowMinutes: number | null;
  remainingVisitMinutes: number | null;
  waitingUntil: Date | null;
  advisory: "WAIT_FOR_OPENING" | "AFTER_FINAL_SESSION" | "SCHEDULED_CLOSED" | null;
  rubricVersion: typeof TIME_RUBRIC_VERSION;
  missingReasons: string[];
};

/** Pure arithmetic for vetted test fixtures; NOT a trusted-evidence gateway. */
export function calculateTimeFromScheduleFixture(input: {
  arrivalAt: Date; timeZone: string; schedules: readonly VisitSchedule[];
}): TimeResult {
  const resolved = resolveVisitSchedule(input);
  const base = { arrivalAt: input.arrivalAt, openingWindowMinutes: resolved.openingWindowMinutes ?? null,
    remainingVisitMinutes: resolved.remainingVisitMinutes ?? null, waitingUntil: null as Date | null,
    advisory: null as TimeResult["advisory"], rubricVersion: TIME_RUBRIC_VERSION };
  if (resolved.status === "UNKNOWN") return { ...base, status: "UNKNOWN", T: null,
    missingReasons: [resolved.reason ?? "SCHEDULE_UNKNOWN"] };
  if (resolved.status === "CLOSED_SCHEDULED") return { ...base, status: "KNOWN", T: 0,
    advisory: "SCHEDULED_CLOSED", missingReasons: [] };
  const window = resolved.openingWindowMinutes;
  const remaining = resolved.remainingVisitMinutes;
  if (!Number.isFinite(window) || !Number.isFinite(remaining) || !window || window <= 0 || remaining == null) {
    return { ...base, status: "UNKNOWN", T: null, missingReasons: ["INVALID_OPENING_WINDOW"] };
  }
  const waitingUntil = !resolved.isOpenAtArrival ? resolved.nextOpeningAt ?? null : null;
  return { ...base, status: "KNOWN", T: 100 * Math.max(0, Math.min(1, remaining / window)),
    waitingUntil, advisory: waitingUntil ? "WAIT_FOR_OPENING"
      : remaining === 0 ? "AFTER_FINAL_SESSION" : null, missingReasons: [] };
}

/** Fail-closed until a server-owned, reviewed and dated visiting-hours registry exists. */
export function scoreTimeV2(input: {
  arrivalAt: Date; timeZone: string; claim?: ScheduleClaim | null;
}): TimeResult {
  if (!Number.isFinite(input.arrivalAt.getTime())) throw new Error("Invalid arrivalAt");
  return { status: "UNKNOWN", T: null, arrivalAt: input.arrivalAt,
    openingWindowMinutes: null, remainingVisitMinutes: null, waitingUntil: null,
    advisory: null, rubricVersion: TIME_RUBRIC_VERSION,
    missingReasons: ["NO_TRUSTED_SCHEDULE_REGISTRY"] };
}
