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

    expect(result.toLowerCase()).toContain("weather");
  });
});
