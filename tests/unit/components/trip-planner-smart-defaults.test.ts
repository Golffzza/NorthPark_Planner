import { describe, expect, it } from "vitest";
import { addDays, fromYMD, toYMD } from "@/lib/date";

function computeDefaultTripDate(referenceDate: Date = new Date()): string {
  const dayOfWeek = referenceDate.getDay(); // 0 is Sunday, 6 is Saturday
  let daysToAdd = (6 - dayOfWeek + 7) % 7;
  if (daysToAdd === 0) {
    daysToAdd = 1; // tomorrow Sunday
  }
  const defaultDate = addDays(referenceDate, daysToAdd);
  return toYMD(defaultDate);
}

describe("Trip Planner Smart Defaults", () => {
  it("picks upcoming Saturday when today is Monday through Friday", () => {
    // Wednesday (2026-10-14) -> Saturday (2026-10-17)
    const wednesday = new Date(2026, 9, 14); // month is 0-indexed: 9 = Oct
    const defaultDate = computeDefaultTripDate(wednesday);
    expect(defaultDate).toBe("2026-10-17");
  });

  it("picks tomorrow Sunday when today is Saturday", () => {
    // Saturday (2026-10-17) -> Sunday (2026-10-18)
    const saturday = new Date(2026, 9, 17);
    const defaultDate = computeDefaultTripDate(saturday);
    expect(defaultDate).toBe("2026-10-18");
  });

  it("picks upcoming Saturday when today is Sunday", () => {
    // Sunday (2026-10-11) -> Saturday (2026-10-17)
    const sunday = new Date(2026, 9, 11);
    const defaultDate = computeDefaultTripDate(sunday);
    expect(defaultDate).toBe("2026-10-17");
  });

  it("ensures default trip date is always in the future and strictly within 16 days", () => {
    const today = new Date();
    const defaultDateStr = computeDefaultTripDate(today);
    const defaultDateObj = fromYMD(defaultDateStr);

    const diffDays = Math.ceil(
      (defaultDateObj.getTime() - today.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24),
    );
    expect(diffDays).toBeGreaterThanOrEqual(1);
    expect(diffDays).toBeLessThanOrEqual(7);
  });
});
