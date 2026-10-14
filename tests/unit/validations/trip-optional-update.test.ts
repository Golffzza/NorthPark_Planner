import { describe, expect, it } from "vitest";

import { parseTripCreateInput } from "@/lib/validations/trip-create";
import { parseTripUpdateInput } from "@/lib/validations/trip-update";

describe("optional travel updates", () => {
  it("allows clearing travel fields on an existing trip", () => {
    expect(parseTripUpdateInput({
      tripDate: null, departAt: null, originText: null, transportMode: null,
      travelerCount: null, weatherCondition: null, estimatedTravelMinutes: null,
    })).toEqual({
      tripDate: null, departAt: null, originText: null, transportMode: null,
      travelerCount: null, weatherCondition: null, estimatedTravelMinutes: null,
    });
  });

  it("keeps ordinary Trip creation strict", () => {
    expect(() => parseTripCreateInput({ parkId: "park-1" })).toThrow();
  });
});
