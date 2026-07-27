import { describe, expect, it } from "vitest";

import type { TripDetailDto } from "@/lib/mappers/trip-dto";
import { buildTripResultViewModel } from "@/lib/presenters/trip-result-view";

const trip: TripDetailDto = {
  id: "trip_1",
  tripDate: "2026-06-12T00:00:00.000Z",
  departAt: "07:15",
  originText: "Chiang Mai",
  originLat: 18.7883,
  originLng: 98.9853,
  transportMode: "CAR",
  travelerCount: 3,
  weatherCondition: "CLEAR",
  estimatedTravelMinutes: 125,
  mockSunsetTime: "18:40",
  notes: "Updated family trip",
  status: "EVALUATED",
  createdAt: "2026-06-01T08:00:00.000Z",
  updatedAt: "2026-06-01T08:45:00.000Z",
  park: {
    id: "park_1",
    nameTh: "Doi Inthanon",
    nameEn: "Doi Inthanon",
    province: "Chiang Mai",
    openTime: "06:00",
    closeTime: "18:00",
    coverImageUrl: null,
  },
  evaluations: [
    {
      id: "eval_2",
      tripId: "trip_1",
      totalScore: 84,
      level: "EXCELLENT",
      weatherScore: 92,
      durationScore: 78,
      timeScore: 81,
      userProfileScore: 79,
      summary: "เหมาะสำหรับออกเดินทางในช่วงเช้าและยังมีเวลาเที่ยวในอุทยานได้ค่อนข้างสบาย",
      recommendation: "ควรเผื่อเวลาเดินทางเพิ่มอีกเล็กน้อย\nตรวจสอบสภาพอากาศก่อนออกเดินทาง",
      evaluatedAt: "2026-06-02T09:30:00.000Z",
      createdAt: "2026-06-02T09:30:00.000Z",
    },
    {
      id: "eval_1",
      tripId: "trip_1",
      totalScore: 68,
      level: "GOOD",
      weatherScore: 70,
      durationScore: 64,
      timeScore: 66,
      userProfileScore: 72,
      summary: "พอใช้ได้ แต่ควรปรับเวลาออกเดินทางให้เร็วขึ้น",
      recommendation: "ออกเดินทางให้เช้าขึ้น",
      evaluatedAt: "2026-06-01T09:00:00.000Z",
      createdAt: "2026-06-01T09:00:00.000Z",
    },
  ],
};

describe("buildTripResultViewModel", () => {
  it("builds a result page view model with factor cards, recommendations, and history", () => {
    const viewModel = buildTripResultViewModel(trip);

    expect(viewModel.tripId).toBe("trip_1");
    expect(viewModel.parkName).toBe("Doi Inthanon");
    expect(viewModel.latestEvaluation.id).toBe("eval_2");
    expect(viewModel.factorScores.map((item) => item.key)).toEqual([
      "weather",
      "duration",
      "time",
      "userProfile",
    ]);
    expect(viewModel.factorScores[0]).toMatchObject({
      key: "weather",
      label: "สภาพอากาศ",
      score: 92,
    });
    expect(viewModel.recommendations).toEqual([
      "ควรเผื่อเวลาเดินทางเพิ่มอีกเล็กน้อย",
      "ตรวจสอบสภาพอากาศก่อนออกเดินทาง",
    ]);
    expect(viewModel.history).toHaveLength(2);
    expect(viewModel.history[0]).toMatchObject({
      id: "eval_2",
      isLatest: true,
      totalScore: 84,
    });
    expect(viewModel.history[1]).toMatchObject({
      id: "eval_1",
      isLatest: false,
      totalScore: 68,
    });
  });
});
