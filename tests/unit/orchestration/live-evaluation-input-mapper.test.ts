import { describe, expect, it } from "vitest";

import { mapLatestSnapshotsToEvaluationInput } from "@/lib/orchestration/live-evaluation-input-mapper";

describe("mapLatestSnapshotsToEvaluationInput", () => {
  it("maps latest snapshots into the existing evaluation engine input shape", () => {
    const input = mapLatestSnapshotsToEvaluationInput({
      trip: {
        departAt: "08:15",
        travelerCount: 3,
        transportMode: "CAR",
        park: {
          nameTh: "อุทยานแห่งชาติดอยอินทนนท์",
          openTime: "06:00",
          closeTime: "18:00",
        },
      },
      weatherSnapshot: {
        weatherCondition: "LIGHT_RAIN",
      },
      routeSnapshot: {
        durationSeconds: 7260,
      },
      sunsetSnapshot: {
        sunsetAt: new Date("2026-06-12T11:43:00.000Z"),
        timezone: "Asia/Bangkok",
      },
    });

    expect(input).toEqual({
      weatherCondition: "LIGHT_RAIN",
      estimatedTravelMinutes: 121,
      departAt: "08:15",
      mockSunsetTime: "18:43",
      parkOpenTime: "06:00",
      parkCloseTime: "18:00",
      travelerCount: 3,
      transportMode: "CAR",
      hasDirectPublicTransit: true,
      parkName: "อุทยานแห่งชาติดอยอินทนนท์",
    });
  });

  it("applies public transport duration multiplier correctly", () => {
    const input = mapLatestSnapshotsToEvaluationInput({
      trip: {
        departAt: "08:00",
        travelerCount: 1,
        transportMode: "PUBLIC_TRANSPORT",
        park: {
          nameTh: "อุทยานแห่งชาติแม่เมย",
          openTime: "06:00",
          closeTime: "18:00",
        },
      },
      weatherSnapshot: {
        weatherCondition: "CLEAR",
      },
      routeSnapshot: {
        durationSeconds: 3600, // 60 mins base
      },
      sunsetSnapshot: {
        sunsetAt: new Date("2026-06-12T11:43:00.000Z"),
        timezone: "Asia/Bangkok",
      },
    });

    expect(input.estimatedTravelMinutes).toBe(96); // 60 * 1.6
    expect(input.hasDirectPublicTransit).toBe(false);
  });
});
