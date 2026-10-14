import { describe, expect, it } from "vitest";

import { calculateTripEvaluation } from "@/lib/evaluation/calculate-trip-evaluation";
import { scoreDuration } from "@/lib/evaluation/score-duration";
import type { TripEvaluationInput } from "@/lib/evaluation/types";

const base: TripEvaluationInput = {
  weatherCondition: "CLEAR",
  estimatedTravelMinutes: 120,
  departAt: "08:00",
  parkOpenTime: "06:00",
  parkCloseTime: "18:00",
  mockSunsetTime: "18:30",
  travelerCount: 2,
  transportMode: "CAR",
};

describe("evaluation contract regression", () => {
  it("uses the agreed 35/25/20/20 weights", () => {
    const result = calculateTripEvaluation(base);
    expect(result.totalScore).toBe(Math.round(
      result.weatherScore * 0.35 +
      result.durationScore * 0.25 +
      result.timeScore * 0.20 +
      result.userProfileScore * 0.20,
    ));
  });

  it("keeps duration transitions smooth at interpolation boundaries", () => {
    for (const minute of [90, 180, 300, 420, 600]) {
      expect(Math.abs(scoreDuration(minute) - scoreDuration(minute + 1))).toBeLessThanOrEqual(1);
      expect(Math.abs(scoreDuration(minute) - scoreDuration(minute - 1))).toBeLessThanOrEqual(1);
    }
  });

  it("changes weather without applying another penalty to accessibility", () => {
    const clear = calculateTripEvaluation(base);
    const storm = calculateTripEvaluation({ ...base, weatherCondition: "STORM" });
    expect(storm.weatherScore).toBeLessThan(clear.weatherScore);
    expect(storm.userProfileScore).toBe(clear.userProfileScore);
    expect(storm.durationScore).toBe(clear.durationScore);
    expect(storm.timeScore).toBe(clear.timeScore);
  });

  it("uses estimated arrival rather than departure alone for time suitability", () => {
    const earlierArrival = calculateTripEvaluation(base);
    const laterArrival = calculateTripEvaluation({
      ...base,
      estimatedTravelMinutes: 600,
    });
    expect(laterArrival.timeScore).toBeLessThan(earlierArrival.timeScore);
  });

  it("does not use traveler count in any factor score", () => {
    const solo = calculateTripEvaluation({ ...base, travelerCount: 1 });
    const group = calculateTripEvaluation({ ...base, travelerCount: 6 });
    expect(group.totalScore).toBe(solo.totalScore);
    expect(group.weatherScore).toBe(solo.weatherScore);
    expect(group.durationScore).toBe(solo.durationScore);
    expect(group.timeScore).toBe(solo.timeScore);
    expect(group.userProfileScore).toBe(solo.userProfileScore);
    expect(group.recommendation).not.toBe(solo.recommendation);
  });

  it("keeps unverified closing hours advisory rather than inventing a blocking rule", () => {
    const result = calculateTripEvaluation({
      ...base,
      departAt: "17:00",
      estimatedTravelMinutes: 120,
    });
    expect(result.constraints).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "ARRIVAL_AFTER_PARK_CLOSE", severity: "WARNING" }),
    ]));
    expect(result.canProceed).toBe(true);
  });

  it("returns factor reasons and a recommendation independently of AI explanation", () => {
    const result = calculateTripEvaluation(base);
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.recommendation.length).toBeGreaterThan(0);
    for (const factor of Object.values(result.factors)) {
      expect(factor.reason.length).toBeGreaterThan(0);
      expect(["GOOD", "CAUTION", "RISK"]).toContain(factor.status);
    }
  });
});
