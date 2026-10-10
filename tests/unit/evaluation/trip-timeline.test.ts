import { describe, expect, it } from "vitest";

import { getTripTimeline } from "@/lib/evaluation/trip-timeline";
import { evaluateHardConstraints } from "@/lib/evaluation/evaluate-hard-constraints";
import { scoreTimeSuitability } from "@/lib/evaluation/score-time-suitability";

const tripDate = new Date("2026-06-12T00:00:00.000Z");
const timeZone = "Asia/Bangkok";

describe("trip arrival timeline", () => {
  it("calculates a same-day arrival as a real instant", () => {
    const result = getTripTimeline({ tripDate, timeZone, departAt: "08:00", estimatedTravelMinutes: 120 });
    expect(result.arrivalAt.toISOString()).toBe("2026-06-12T03:00:00.000Z");
    expect(result.arrivalTime).toBe("10:00");
    expect(result.dayOffset).toBe(0);
  });

  it("keeps a cross-midnight arrival on the following date", () => {
    const input = { tripDate, timeZone, departAt: "23:00", estimatedTravelMinutes: 120 };
    const result = getTripTimeline(input);
    expect(result.arrivalAt.toISOString()).toBe("2026-06-12T18:00:00.000Z");
    expect(result.dayOffset).toBe(1);
    expect(evaluateHardConstraints({ ...input, parkCloseTime: "18:00" })).toEqual([]);
  });

  it("handles a long trip arriving two calendar days later", () => {
    const result = getTripTimeline({ tripDate, timeZone, departAt: "23:00", estimatedTravelMinutes: 27 * 60 });
    expect(result.arrivalTime).toBe("02:00");
    expect(result.dayOffset).toBe(2);
    expect(result.arrivalAt.toISOString()).toBe("2026-06-13T19:00:00.000Z");
  });

  it("warns just after stored close time without blocking at the boundary", () => {
    const base = { tripDate, timeZone, departAt: "17:00", parkCloseTime: "18:00" };
    expect(evaluateHardConstraints({ ...base, estimatedTravelMinutes: 60 })).toEqual([]);
    expect(evaluateHardConstraints({ ...base, estimatedTravelMinutes: 61 })).toMatchObject([
      { code: "ARRIVAL_AFTER_PARK_CLOSE", severity: "WARNING" },
    ]);
  });

  it("compares sunset only on the same calendar date", () => {
    const base = { tripDate, timeZone, departAt: "16:30", estimatedTravelMinutes: 60,
      parkOpenTime: "06:00", parkCloseTime: "20:00" };
    expect(scoreTimeSuitability({ ...base, sunsetAt: new Date("2026-06-12T11:00:00.000Z") })).toBe(65);
    const overnight = { ...base, departAt: "23:00", estimatedTravelMinutes: 20 * 60 };
    expect(getTripTimeline({ ...overnight, sunsetAt: new Date("2026-06-12T11:00:00.000Z") }).sunsetAt).toBeUndefined();
  });
});
