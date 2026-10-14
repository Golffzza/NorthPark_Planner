import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";

import { IncompleteTripInformationError, assertTripEvaluationReady, missingTripEvaluationFields } from "@/lib/services/trip-evaluation-readiness";

const complete = {
  tripDate: new Date("2026-11-20T00:00:00.000Z"), departAt: "07:00", originText: "เชียงใหม่",
  originLat: new Prisma.Decimal(18.7), originLng: new Prisma.Decimal(98.9), transportMode: "CAR", travelerCount: 2,
  weatherCondition: "CLOUDY", estimatedTravelMinutes: 120,
} as const;

describe("trip evaluation readiness", () => {
  it("reports missing data for a saved plan instead of inventing defaults", () => {
    const incomplete = Object.fromEntries(Object.keys(complete).map((key) => [key, null]));
    expect(missingTripEvaluationFields(incomplete, "manual")).toEqual([
      "tripDate", "departAt", "originText", "transportMode", "travelerCount", "weatherCondition", "estimatedTravelMinutes",
    ]);
    expect(() => assertTripEvaluationReady(incomplete, "manual")).toThrow(IncompleteTripInformationError);
    expect(missingTripEvaluationFields(incomplete, "live")).toContain("originLat");
  });

  it("allows complete legacy manual trips and live trips with coordinates", () => {
    expect(missingTripEvaluationFields(complete, "manual")).toEqual([]);
    expect(missingTripEvaluationFields(complete, "live")).toEqual([]);
    expect(() => assertTripEvaluationReady(complete, "manual")).not.toThrow();
  });
});
