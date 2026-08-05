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

  it.each([
    ["18:00", 60, "18:30", 15],
    ["17:45", 60, "20:00", 20],
    ["17:00", 30, "20:00", 35],
    ["16:00", 30, "20:00", 55],
    ["04:30", 30, "20:00", 60],
    ["05:30", 30, "20:00", 75],
    ["08:00", 60, "20:00", 90],
  ])("scores departure %s with %i travel minutes and closing at %s as %i", (departAt, estimatedTravelMinutes, parkCloseTime, expected) => {
    expect(
      scoreTimeSuitability({
        departAt,
        estimatedTravelMinutes,
        parkOpenTime: "06:00",
        parkCloseTime,
      }),
    ).toBe(expected);
  });
});
