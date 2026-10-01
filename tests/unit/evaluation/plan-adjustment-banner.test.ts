import { describe, expect, it } from "vitest";
import { analyzePlanAdjustment } from "@/components/evaluation/plan-adjustment-banner";
import type { TripDetailDto } from "@/lib/mappers/trip-dto";

const baseMockTrip: TripDetailDto = {
  id: "trip-1",
  tripDate: "2026-10-15T00:00:00.000Z",
  departAt: "08:00",
  originText: "เชียงใหม่",
  originLat: 18.7883,
  originLng: 98.9853,
  transportMode: "CAR",
  travelerCount: 2,
  weatherCondition: "CLEAR",
  estimatedTravelMinutes: 60,
  mockSunsetTime: "18:00",
  notes: null,
  status: "EVALUATED",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  park: {
    id: "park-1",
    nameTh: "อุทยานแห่งชาติดอยอินทนนท์",
    nameEn: "Doi Inthanon",
    province: "เชียงใหม่",
    openTime: "05:30",
    closeTime: "16:30",
    coverImageUrl: null,
  },
  evaluations: [
    {
      id: "eval-1",
      tripId: "trip-1",
      totalScore: 85,
      level: "EXCELLENT",
      weatherScore: 90,
      durationScore: 85,
      timeScore: 85,
      userProfileScore: 80,
      summary: "แผนดีมาก",
      recommendation: "เตรียมตัว",
      evaluatedAt: "2026-10-01T00:00:00.000Z",
      createdAt: "2026-10-01T00:00:00.000Z",
    },
  ],
};

describe("analyzePlanAdjustment", () => {
  it("warns about storm / heavy rain weather and advises date adjustment", () => {
    const trip: TripDetailDto = {
      ...baseMockTrip,
      weatherCondition: "STORM",
    };
    const result = analyzePlanAdjustment(trip);
    expect(result.severity).toBe("DANGER");
    expect(result.type).toBe("WEATHER");
    expect(result.reasonText).toContain("พายุ");
  });

  it("warns about motorcycle in rainy / cloudy weather on mountain route", () => {
    const trip: TripDetailDto = {
      ...baseMockTrip,
      transportMode: "MOTORCYCLE",
      weatherCondition: "LIGHT_RAIN",
    };
    const result = analyzePlanAdjustment(trip);
    expect(result.severity).toBe("DANGER");
    expect(result.type).toBe("TRANSPORT");
    expect(result.recommendedAction).toContain("รถยนต์");
  });

  it("warns about late departure reaching near closing time", () => {
    const trip: TripDetailDto = {
      ...baseMockTrip,
      departAt: "15:30",
      estimatedTravelMinutes: 90,
    };
    const result = analyzePlanAdjustment(trip);
    expect(result.type).toBe("TIME");
    expect(result.reasonText).toContain("ปิดทำการ");
  });

  it("gives success banner when trip plan is highly suitable", () => {
    const result = analyzePlanAdjustment(baseMockTrip);
    expect(result.severity).toBe("SUCCESS");
    expect(result.headline).toContain("ทริปนี้ลงตัวมาก");
  });
});
