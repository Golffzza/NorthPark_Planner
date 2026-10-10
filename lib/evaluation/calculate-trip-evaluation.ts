//* ./lib/evaluation/calculate-trip-evaluation.ts

import { EVALUATION_WEIGHTS } from "./constants";

import { buildFactorReasons } from "./build-factor-reasons";
import { buildRecommendations } from "./build-recommendations";
import { evaluateHardConstraints } from "./evaluate-hard-constraints";
import { findWeakestFactor } from "./find-weakest-factor";
import { mapScoreToLevel } from "./map-score-to-level";
import { scoreDuration } from "./score-duration";
import { scoreTimeSuitability } from "./score-time-suitability";
import { scoreUserProfile } from "./score-user-profile";
import { scoreWeather } from "./score-weather";

import type {
  FactorStatus,
  TripEvaluationInput,
  TripEvaluationResult,
} from "./types";

function clampScore(score: number): number {
  return Math.max(
    0,
    Math.min(100, Math.round(score)),
  );
}

function getFactorStatus(
  score: number,
): FactorStatus {
  if (score >= 80) {
    return "GOOD";
  }

  if (score >= 60) {
    return "CAUTION";
  }

  return "RISK";
}

const levelThaiLabels: Record<string, string> = {
  EXCELLENT: "พร้อมตามแผน",
  GOOD: "เดินทางได้ แต่มีจุดที่ควรตรวจสอบ",
  MODERATE: "ควรปรับบางส่วนก่อนเดินทาง",
  NEEDS_ADJUSTMENT: "ควรปรับแผน",
};

const factorThaiLabels: Record<string, string> = {
  weather: "สภาพอากาศ",
  duration: "ระยะเวลาเดินทาง",
  time: "ช่วงเวลาที่คาดว่าจะถึง",
  userProfile: "การเข้าถึงด้วยพาหนะ",
};

export function calculateTripEvaluation(
  input: TripEvaluationInput,
): TripEvaluationResult {
  const weatherScore = scoreWeather(
    input.weatherCondition,
  );

  const durationScore = scoreDuration(
    input.estimatedTravelMinutes,
  );

  const timeScore = scoreTimeSuitability({
    tripDate: input.tripDate,
    timeZone: input.timeZone,
    sunsetAt: input.sunsetAt,
    departAt: input.departAt,
    estimatedTravelMinutes:
      input.estimatedTravelMinutes,
    mockSunsetTime: input.mockSunsetTime,
    parkOpenTime: input.parkOpenTime,
    parkCloseTime: input.parkCloseTime,
  });

  /**
   * ชื่อ function และ field ยังเป็น userProfile
   * เพื่อรักษา compatibility กับระบบเดิม
   *
   * แต่ logic ภายในตอนนี้คือ transport/accessibility
   * และ travelerCount ไม่มีผลต่อคะแนนแล้ว
   */
  const userProfileScore = scoreUserProfile(
    input.travelerCount,
    input.transportMode,
    {
      hasDirectPublicTransit:
        input.hasDirectPublicTransit,
      weatherCondition: input.weatherCondition,
    },
  );

  const constraints = evaluateHardConstraints({
    tripDate: input.tripDate,
    timeZone: input.timeZone,
    departAt: input.departAt,
    estimatedTravelMinutes:
      input.estimatedTravelMinutes,
    parkCloseTime: input.parkCloseTime,
  });

  const hasBlockingConstraint = constraints.some(
    (constraint) =>
      constraint.severity === "BLOCKING",
  );

  const totalScore = clampScore(
    weatherScore * EVALUATION_WEIGHTS.weather +
      durationScore *
        EVALUATION_WEIGHTS.duration +
      timeScore * EVALUATION_WEIGHTS.time +
      userProfileScore *
        EVALUATION_WEIGHTS.userProfile,
  );

  const calculatedLevel =
    mapScoreToLevel(totalScore);

  /**
   * ถ้ามี hard constraint
   * ห้ามให้คะแนนรวมจาก factor อื่นกลบข้อจำกัดจริง
   */
  const level = hasBlockingConstraint
    ? "NEEDS_ADJUSTMENT"
    : calculatedLevel;

  const weakestFactor = findWeakestFactor({
    weatherScore,
    durationScore,
    timeScore,
    userProfileScore,
  });

  const reasons = buildFactorReasons({
    tripDate: input.tripDate,
    timeZone: input.timeZone,
    weatherCondition: input.weatherCondition,
    estimatedTravelMinutes:
      input.estimatedTravelMinutes,
    departAt: input.departAt,
    transportMode: input.transportMode,
    hasDirectPublicTransit:
      input.hasDirectPublicTransit,
  });

  const recommendation =
    buildRecommendations({
      weakestFactor,
      weatherCondition:
        input.weatherCondition,
      estimatedTravelMinutes:
        input.estimatedTravelMinutes,
      departAt: input.departAt,
      transportMode: input.transportMode,
      travelerCount: input.travelerCount,
      hasDirectPublicTransit:
        input.hasDirectPublicTransit,
      parkName: input.parkName,
    });

  const levelText =
    levelThaiLabels[level] ??
    "ควรตรวจสอบแผน";

  const factorText =
    factorThaiLabels[weakestFactor] ??
    "ข้อมูลการเดินทาง";

  let summary: string;

  if (hasBlockingConstraint) {
    summary =
      constraints.find(
        (constraint) =>
          constraint.severity === "BLOCKING",
      )?.message ??
      "แผนการเดินทางปัจจุบันมีเงื่อนไขที่ควรปรับก่อนออกเดินทาง";
  } else {
    summary = `ผลการประเมินอยู่ในระดับ "${levelText}" โดยปัจจัยด้าน${factorText}เป็นปัจจัยที่ควรให้ความสำคัญมากที่สุดในแผนปัจจุบัน`;
  }

  return {
    totalScore,
    level,

    canProceed: !hasBlockingConstraint,

    weatherScore,
    durationScore,
    timeScore,
    userProfileScore,

    factors: {
      weather: {
        score: weatherScore,
        status: getFactorStatus(weatherScore),
        reason: reasons.weather,
      },

      duration: {
        score: durationScore,
        status: getFactorStatus(durationScore),
        reason: reasons.duration,
      },

      time: {
        score: timeScore,
        status: getFactorStatus(timeScore),
        reason: reasons.time,
      },

      userProfile: {
        score: userProfileScore,
        status: getFactorStatus(
          userProfileScore,
        ),
        reason: reasons.userProfile,
      },
    },

    constraints,

    weakestFactor,
    summary,
    recommendation,

    evaluatedAt: new Date().toISOString(),
  };
}
