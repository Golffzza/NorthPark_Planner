import { describe, expect, it } from "vitest";

import { getTripTimeContext } from "@/components/trips/trip-time-picker";

describe("TripTimePicker helper functions", () => {
  it("returns appropriate period descriptions for different hours", () => {
    const morning = getTripTimeContext("06:30");
    expect(morning.period).toContain("เช้าตรู่");
    expect(morning.icon).toBe("🌅");

    const regularMorning = getTripTimeContext("07:30");
    expect(regularMorning.period).toContain("ช่วงเช้า");
    expect(regularMorning.icon).toBe("🚗");

    const afternoon = getTripTimeContext("14:00");
    expect(afternoon.period).toContain("ช่วงบ่าย");
    expect(afternoon.icon).toBe("🌤️");

    const evening = getTripTimeContext("17:30");
    expect(evening.period).toContain("ช่วงเย็น");
    expect(evening.icon).toBe("🌇");
  });

  it("handles empty time string gracefully", () => {
    const empty = getTripTimeContext("");
    expect(empty.label).toContain("แตะเพื่อเลือกเวลาออกเดินทาง");
  });
});
