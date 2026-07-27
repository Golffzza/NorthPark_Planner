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
    expect(result.recommendation.toLowerCase()).toContain("weather");
  });
});
