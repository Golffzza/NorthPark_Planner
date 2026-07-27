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
    });
  });
});
