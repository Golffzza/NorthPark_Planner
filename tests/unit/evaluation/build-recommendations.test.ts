import { describe, expect, it } from "vitest";

import { buildRecommendations } from "@/lib/evaluation/build-recommendations";

describe("buildRecommendations", () => {
  it("returns weather guidance when weather is the weakest factor", () => {
    const result = buildRecommendations({
      weakestFactor: "weather",
      weatherCondition: "HEAVY_RAIN",
      estimatedTravelMinutes: 120,
      departAt: "08:00",
      transportMode: "CAR",
      travelerCount: 2,
    });

    expect(result).toContain("ฝนตกหนัก");
  });

  it.each([
    ["duration", "ระยะเวลาเดินทาง"],
    ["time", "เวลาเข้าถึง"],
    ["userProfile", "การเข้าถึงจุดหมาย"],
  ] as const)("returns guidance for the %s factor", (weakestFactor, expectedText) => {
    const result = buildRecommendations({
      weakestFactor,
      weatherCondition: "CLEAR",
      estimatedTravelMinutes: 120,
      departAt: "08:00",
      transportMode: "CAR",
      travelerCount: 2,
    });

    expect(result).toContain(expectedText);
  });
});
