import { describe, expect, it } from "vitest";

import { SunsetCalculationError, calculateSunsetSnapshot } from "@/lib/integrations/sun/sunset-service";

describe("calculateSunsetSnapshot", () => {
  it("returns a deterministic sunset snapshot for the same place and date", () => {
    const input = {
      latitude: 18.5883,
      longitude: 98.4871,
      tripDate: new Date("2026-06-12T00:00:00.000Z"),
      timezone: "Asia/Bangkok",
    };

    const first = calculateSunsetSnapshot(input);
    const second = calculateSunsetSnapshot(input);

    expect(first.sunsetAt.toISOString()).toBe(second.sunsetAt.toISOString());
    expect(first.sunsetLocalTime).toMatch(/^\d{2}:\d{2}$/);
    expect(first.timezone).toBe("Asia/Bangkok");
    expect(Number(first.sunsetLocalTime.slice(0, 2))).toBeGreaterThanOrEqual(17);
    expect(Number(first.sunsetLocalTime.slice(0, 2))).toBeLessThanOrEqual(19);
  });

  it("rejects invalid coordinates", () => {
    expect(() =>
      calculateSunsetSnapshot({
        latitude: 999,
        longitude: 98.4871,
        tripDate: new Date("2026-06-12T00:00:00.000Z"),
        timezone: "Asia/Bangkok",
      }),
    ).toThrow(SunsetCalculationError);
  });
});
