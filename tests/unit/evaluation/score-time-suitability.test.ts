import { describe, expect, it } from "vitest";

import { scoreTimeSuitability } from "@/lib/evaluation/score-time-suitability";

describe("scoreTimeSuitability", () => {
  it("lowers the score when arrival is near sunset", () => {
    const safeArrivalScore = scoreTimeSuitability({
      departAt: "07:00",
      estimatedTravelMinutes: 120,
      mockSunsetTime: "18:30",
      parkOpenTime: "06:00",
      parkCloseTime: "18:00",
    });

    const riskyArrivalScore = scoreTimeSuitability({
      departAt: "15:30",
      estimatedTravelMinutes: 120,
      mockSunsetTime: "18:30",
      parkOpenTime: "06:00",
      parkCloseTime: "18:00",
    });

    expect(safeArrivalScore).toBeGreaterThan(riskyArrivalScore);
  });
});
