import { describe, expect, it } from "vitest";

import { evaluateTripDraft } from "@/lib/services/evaluation-service";

describe("evaluateTripDraft", () => {
  it("แจ้งเตือนโดยไม่บล็อกเมื่อถึงหลังเวลาท่องเที่ยวที่บันทึกไว้", () => {
    const result = evaluateTripDraft({
      weatherCondition: "CLEAR",
      estimatedTravelMinutes: 300,
      departAt: "14:00",

      parkOpenTime: "08:00",
      parkCloseTime: "18:00",

      travelerCount: 1,
      transportMode: "CAR",

      parkName: "Test Park",
    });

    expect(result.canProceed).toBe(true);

    expect(
      result.constraints.some(
        (constraint) =>
          constraint.code ===
          "ARRIVAL_AFTER_PARK_CLOSE",
      ),
    ).toBe(true);
    expect(result.constraints[0].severity).toBe("WARNING");
    expect(result.constraints[0].message).toContain("ตรวจสอบ");
  });

  it("เมื่อปรับเวลาออกให้เร็วขึ้น แผนควรผ่านได้", () => {
    const blockedPlan = evaluateTripDraft({
      weatherCondition: "CLEAR",
      estimatedTravelMinutes: 300,
      departAt: "14:00",

      parkOpenTime: "08:00",
      parkCloseTime: "18:00",

      travelerCount: 1,
      transportMode: "CAR",

      parkName: "Test Park",
    });

    expect(blockedPlan.canProceed).toBe(true);

    const adjustedPlan = evaluateTripDraft({
      weatherCondition: "CLEAR",
      estimatedTravelMinutes: 300,
      departAt: "08:00",

      parkOpenTime: "08:00",
      parkCloseTime: "18:00",

      travelerCount: 1,
      transportMode: "CAR",

      parkName: "Test Park",
    });

    expect(adjustedPlan.canProceed).toBe(true);
    expect(adjustedPlan.constraints).toHaveLength(0);
  });

  it("Draft evaluation ต้องคืน factor explanation ครบ", () => {
    const result = evaluateTripDraft({
      weatherCondition: "LIGHT_RAIN",
      estimatedTravelMinutes: 240,
      departAt: "08:00",

      parkOpenTime: "08:00",
      parkCloseTime: "18:00",

      travelerCount: 2,
      transportMode: "CAR",

      parkName: "Test Park",
    });

    expect(result.factors.weather.reason).toBeTruthy();
    expect(result.factors.duration.reason).toBeTruthy();
    expect(result.factors.time.reason).toBeTruthy();

    expect(
      result.factors.userProfile.reason,
    ).toBeTruthy();
  });

  it("Public transport ที่ยังไม่มีข้อมูลรถตรงควรใช้สถานะ unknown", () => {
    const result = evaluateTripDraft({
      weatherCondition: "CLEAR",
      estimatedTravelMinutes: 180,
      departAt: "08:00",

      parkOpenTime: "08:00",
      parkCloseTime: "18:00",

      travelerCount: 1,
      transportMode: "PUBLIC_TRANSPORT",

      parkName: "Test Park",
    });

    expect(result.userProfileScore).toBe(70);

    expect(
      result.factors.userProfile.reason,
    ).toBeTruthy();
  });

  it("จำนวนผู้เดินทางไม่ควรเปลี่ยนคะแนนรวม", () => {
    const baseInput = {
      weatherCondition: "CLEAR" as const,
      estimatedTravelMinutes: 180,
      departAt: "08:00",

      parkOpenTime: "08:00",
      parkCloseTime: "18:00",

      transportMode: "CAR" as const,

      parkName: "Test Park",
    };

    const solo = evaluateTripDraft({
      ...baseInput,
      travelerCount: 1,
    });

    const group = evaluateTripDraft({
      ...baseInput,
      travelerCount: 4,
    });

    expect(solo.totalScore).toBe(
      group.totalScore,
    );
  });

  it("แต่จำนวนผู้เดินทางสามารถเปลี่ยน recommendation ได้", () => {
    const baseInput = {
      weatherCondition: "CLEAR" as const,
      estimatedTravelMinutes: 180,
      departAt: "08:00",

      parkOpenTime: "08:00",
      parkCloseTime: "18:00",

      transportMode: "CAR" as const,

      parkName: "Test Park",
    };

    const solo = evaluateTripDraft({
      ...baseInput,
      travelerCount: 1,
    });

    const group = evaluateTripDraft({
      ...baseInput,
      travelerCount: 4,
    });

    expect(solo.recommendation).not.toBe(
      group.recommendation,
    );
  });
});
