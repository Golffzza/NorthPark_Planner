import { describe, expect, it } from "vitest";

import { buildEvaluationTimeline, resolveVisitSchedule } from "@/lib/evaluation-v2/timeline";

describe("Evaluation V2 timeline infrastructure", () => {
  it("builds a real departure and next-day arrival in the park timezone", () => {
    const timeline = buildEvaluationTimeline({ departureDate: "2026-10-17", departAt: "23:00",
      timeZone: "Asia/Bangkok", routeDurationSeconds: 3 * 3600 });
    expect(timeline.departureAt.toISOString()).toBe("2026-10-17T16:00:00.000Z");
    expect(timeline.arrivalAt.toISOString()).toBe("2026-10-17T19:00:00.000Z");
    expect(timeline.arrivalLocalDate).toBe("2026-10-18");
    expect(timeline.dayOffset).toBe(1);
    expect(timeline).not.toHaveProperty("sunsetAt");
  });

  it("counts only future visit intervals and reports waiting before opening", () => {
    const schedules = [{ serviceDate: "2026-10-17", intervals: [
      { open: "08:00", close: "12:00" }, { open: "13:00", close: "17:00" },
    ], sourceId: "verified-hours" }];
    const at = (time: string) => new Date(`2026-10-17T${time}:00+07:00`);
    const before = resolveVisitSchedule({ arrivalAt: at("07:00"), timeZone: "Asia/Bangkok", schedules });
    expect(before).toMatchObject({ status: "OK", openingWindowMinutes: 480,
      remainingVisitMinutes: 480, isOpenAtArrival: false, sourceId: "verified-hours" });
    expect(before.nextOpeningAt?.toISOString()).toBe("2026-10-17T01:00:00.000Z");
    expect(resolveVisitSchedule({ arrivalAt: at("11:00"), timeZone: "Asia/Bangkok", schedules }))
      .toMatchObject({ remainingVisitMinutes: 300 });
    expect(resolveVisitSchedule({ arrivalAt: at("12:30"), timeZone: "Asia/Bangkok", schedules }))
      .toMatchObject({ remainingVisitMinutes: 240, isOpenAtArrival: false });
    expect(resolveVisitSchedule({ arrivalAt: at("17:00"), timeZone: "Asia/Bangkok", schedules }))
      .toMatchObject({ remainingVisitMinutes: 0 });
  });

  it("uses the previous service day when arriving within an overnight interval", () => {
    const schedules = [{ serviceDate: "2026-10-17", intervals: [
      { open: "18:00", close: "02:00", closesNextDay: true },
    ], sourceId: "verified-night" }];
    expect(resolveVisitSchedule({ arrivalAt: new Date("2026-10-17T18:00:00Z"),
      timeZone: "Asia/Bangkok", schedules })).toMatchObject({
      status: "OK", serviceDate: "2026-10-17", openingWindowMinutes: 480,
      remainingVisitMinutes: 60, isOpenAtArrival: true,
    });
  });

  it("keeps missing and explicitly closed schedules separate", () => {
    const at = new Date("2026-10-17T11:00:00Z");
    expect(resolveVisitSchedule({ arrivalAt: at, timeZone: "Asia/Bangkok", schedules: [] }))
      .toMatchObject({ status: "UNKNOWN", reason: "SCHEDULE_MISSING" });
    expect(resolveVisitSchedule({ arrivalAt: at, timeZone: "Asia/Bangkok", schedules: [
      { serviceDate: "2026-10-17", intervals: [], sourceId: "closed-calendar" },
    ] })).toMatchObject({ status: "CLOSED_SCHEDULED", remainingVisitMinutes: 0 });
  });

  it("rejects invalid departure inputs instead of silently using mock values", () => {
    expect(() => buildEvaluationTimeline({ departureDate: "2026-10-17", departAt: "25:00",
      timeZone: "Asia/Bangkok", routeDurationSeconds: 100 })).toThrow();
    expect(() => buildEvaluationTimeline({ departureDate: "2026-10-17", departAt: "08:00",
      timeZone: "Asia/Bangkok", routeDurationSeconds: -1 })).toThrow();
    expect(() => buildEvaluationTimeline({ departureDate: "2026-03-08", departAt: "02:30",
      timeZone: "America/New_York", routeDurationSeconds: 0 })).toThrow();
    expect(() => buildEvaluationTimeline({ departureDate: "2026-11-01", departAt: "01:30",
      timeZone: "America/New_York", routeDurationSeconds: 0 })).toThrow();
  });

  it("rejects overlapping or contradictory visiting intervals as unknown", () => {
    const arrivalAt = new Date("2026-10-17T04:00:00Z");
    expect(resolveVisitSchedule({ arrivalAt, timeZone: "Asia/Bangkok", schedules: [{
      serviceDate: "2026-10-17", sourceId: "hours", intervals: [
        { open: "08:00", close: "12:00" }, { open: "11:00", close: "17:00" },
      ],
    }] })).toMatchObject({ status: "UNKNOWN", reason: "SCHEDULE_CONFLICT" });
    expect(resolveVisitSchedule({ arrivalAt, timeZone: "Asia/Bangkok", schedules: [{
      serviceDate: "2026-10-17", sourceId: "hours", intervals: [{ open: "18:00", close: "02:00" }],
    }] })).toMatchObject({ status: "UNKNOWN", reason: "SCHEDULE_CONFLICT" });
  });

  it("does not choose between two service days that are both open at arrival", () => {
    const arrivalAt = new Date("2026-10-17T18:00:00Z");
    expect(resolveVisitSchedule({ arrivalAt, timeZone: "Asia/Bangkok", schedules: [
      { serviceDate: "2026-10-17", sourceId: "night", intervals: [
        { open: "18:00", close: "02:00", closesNextDay: true },
      ] },
      { serviceDate: "2026-10-18", sourceId: "morning", intervals: [
        { open: "00:30", close: "03:00" },
      ] },
    ] })).toMatchObject({ status: "UNKNOWN", reason: "SCHEDULE_CONFLICT" });
  });
});
