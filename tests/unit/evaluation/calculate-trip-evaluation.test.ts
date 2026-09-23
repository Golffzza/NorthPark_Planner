import { describe, expect, it } from "vitest";

import { calculateTripEvaluation } from "@/lib/evaluation/calculate-trip-evaluation";

describe("calculateTripEvaluation", () => {
  it("keeps the final score within 0 to 100", () => {
    const result = calculateTripEvaluation({
      weatherCondition: "STORM",
      estimatedTravelMinutes: 720,
      departAt: "16:30",
      mockSunsetTime: "18:30",
      parkOpenTime: "06:00",
      parkCloseTime: "18:00",
      travelerCount: 1,
      transportMode: "MOTORCYCLE",
    });

    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it("makes recommendation match the weakest factor", () => {
    const result = calculateTripEvaluation({
      weatherCondition: "STORM",
      estimatedTravelMinutes: 90,
      departAt: "08:00",
      mockSunsetTime: "18:30",
      parkOpenTime: "06:00",
      parkCloseTime: "18:00",
      travelerCount: 4,
      transportMode: "CAR",
    });

    expect(result.weakestFactor).toBe("weather");
    expect(result.recommendation).toContain("สภาพอากาศ");
    expect(result.summary).toContain("สภาพอากาศ");
  });

  it("reduces score and warns when using public transport to a park with no direct transit", () => {
    const result = calculateTripEvaluation({
      weatherCondition: "CLEAR",
      estimatedTravelMinutes: 60,
      departAt: "08:00",
      mockSunsetTime: "18:30",
      parkOpenTime: "06:00",
      parkCloseTime: "18:00",
      travelerCount: 2,
      transportMode: "PUBLIC_TRANSPORT",
      hasDirectPublicTransit: false,
      parkName: "อุทยานแห่งชาติแม่เมย",
    });

    expect(result.userProfileScore).toBeLessThan(70);
    if (result.weakestFactor === "userProfile") {
      expect(result.recommendation).toContain("ไม่มีรถโดยสารประจำทาง");
    }
  });

  it("warns about motorcycle risk when weather has heavy rain", () => {
    const result = calculateTripEvaluation({
      weatherCondition: "HEAVY_RAIN",
      estimatedTravelMinutes: 60,
      departAt: "08:00",
      mockSunsetTime: "18:30",
      parkOpenTime: "06:00",
      parkCloseTime: "18:00",
      travelerCount: 1,
      transportMode: "MOTORCYCLE",
    });

    expect(result.userProfileScore).toBeLessThan(60);
  });
});
