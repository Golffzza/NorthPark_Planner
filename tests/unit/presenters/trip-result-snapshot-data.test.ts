import { describe, expect, it } from "vitest";

import type { TripDetailDto } from "@/lib/mappers/trip-dto";
import { getTripResultSnapshotData } from "@/lib/presenters/trip-result-snapshot-data";

const evaluation: TripDetailDto["evaluations"][number] = {
  id: "eval_1",
  tripId: "trip_1",
  weatherSnapshotId: "weather_1",
  routeSnapshotId: "route_1",
  sunsetSnapshotId: "sunset_1",
  totalScore: 80,
  level: "EXCELLENT",
  weatherScore: 80,
  durationScore: 80,
  timeScore: 80,
  userProfileScore: 80,
  summary: "summary",
  recommendation: "recommendation",
  evaluatedAt: "2026-06-12T06:00:00.000Z",
  createdAt: "2026-06-12T06:00:00.000Z",
  weatherSnapshot: {
    id: "weather_1",
    weatherCondition: "CLOUDY",
    temperatureC: 21,
    createdAt: "2026-06-12T05:00:00.000Z",
  },
  routeSnapshot: {
    id: "route_1",
    distanceMeters: 98000,
    durationSeconds: 7200,
    createdAt: "2026-06-12T05:00:00.000Z",
  },
  sunsetSnapshot: {
    id: "sunset_1",
    sunsetLocalTime: "18:43",
    createdAt: "2026-06-12T05:00:00.000Z",
  },
};

const trip: TripDetailDto = {
  id: "trip_1",
  tripDate: "2026-06-12T00:00:00.000Z",
  departAt: "08:00",
  originText: "Chiang Mai",
  originLat: 18.7883,
  originLng: 98.9853,
  transportMode: "CAR",
  travelerCount: 2,
  weatherCondition: "CLEAR",
  estimatedTravelMinutes: 120,
  mockSunsetTime: null,
  notes: null,
  status: "EVALUATED",
  createdAt: "2026-06-12T04:00:00.000Z",
  updatedAt: "2026-06-12T06:00:00.000Z",
  park: {
    id: "park_1",
    nameTh: "อุทยานแห่งชาติดอยอินทนนท์",
    nameEn: null,
    province: "เชียงใหม่",
    openTime: "06:00",
    closeTime: "18:00",
    coverImageUrl: null,
  },
  evaluations: [evaluation],
  latestWeatherSnapshot: {
    id: "weather_2",
    weatherCondition: "STORM",
    temperatureC: 15,
    createdAt: "2026-06-12T07:00:00.000Z",
  },
  latestRouteSnapshot: {
    id: "route_2",
    distanceMeters: 110000,
    durationSeconds: 9000,
    createdAt: "2026-06-12T07:00:00.000Z",
  },
};

describe("result snapshot provenance", () => {
  it("keeps an evaluation associated with its bound snapshots after newer snapshots exist", () => {
    const beforeNewSnapshots = getTripResultSnapshotData({
      ...trip,
      latestWeatherSnapshot: undefined,
      latestRouteSnapshot: undefined,
    }, evaluation);

    // Simulate a later sync adding weather_2 and route_2 to the trip.
    const afterNewSnapshots = getTripResultSnapshotData(trip, evaluation);

    expect(afterNewSnapshots).toEqual(beforeNewSnapshots);
    expect(afterNewSnapshots).toEqual({
      weatherCondition: "CLOUDY",
      temperatureC: 21,
      distanceMeters: 98000,
      durationSeconds: 7200,
      fallbackTravelMinutes: null,
    });
  });

  it("keeps historical evaluations without snapshot IDs readable without using newer snapshots", () => {
    const historical = {
      ...evaluation,
      weatherSnapshotId: null,
      routeSnapshotId: null,
      sunsetSnapshotId: null,
      weatherSnapshot: null,
      routeSnapshot: null,
      sunsetSnapshot: null,
    };

    expect(getTripResultSnapshotData(trip, historical)).toEqual({
      weatherCondition: "CLEAR",
      temperatureC: null,
      distanceMeters: null,
      durationSeconds: null,
      fallbackTravelMinutes: 120,
    });
  });

  it("does not substitute a newer snapshot when a bound relation is unavailable", () => {
    expect(getTripResultSnapshotData(trip, {
      ...evaluation,
      weatherSnapshot: null,
      routeSnapshot: null,
    })).toEqual({
      weatherCondition: null,
      temperatureC: null,
      distanceMeters: null,
      durationSeconds: null,
      fallbackTravelMinutes: null,
    });
  });
});
