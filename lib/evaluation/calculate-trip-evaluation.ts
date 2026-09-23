import { EVALUATION_WEIGHTS } from "./constants";
import { buildRecommendations } from "./build-recommendations";
import { findWeakestFactor } from "./find-weakest-factor";
import { mapScoreToLevel } from "./map-score-to-level";
import { scoreDuration } from "./score-duration";
import { scoreTimeSuitability } from "./score-time-suitability";
import { scoreUserProfile } from "./score-user-profile";
import { scoreWeather } from "./score-weather";
import type { TripEvaluationInput, TripEvaluationResult } from "./types";

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

const levelThaiLabels: Record<string, string> = {
  EXCELLENT: "เหมาะสมมาก",
  GOOD: "เหมาะสม",
  MODERATE: "ปานกลาง",
  NEEDS_ADJUSTMENT: "ควรปรับแผน",
};

const factorThaiLabels: Record<string, string> = {
  weather: "สภาพอากาศ",
  duration: "ระยะเวลาเดินทาง",
  time: "ช่วงเวลาเดินทางและแสงอาทิตย์",
  userProfile: "ความพร้อมของผู้เดินทางและพาหนะ",
};

export function calculateTripEvaluation(input: TripEvaluationInput): TripEvaluationResult {
  const weatherScore = scoreWeather(input.weatherCondition);
  const durationScore = scoreDuration(input.estimatedTravelMinutes);
  const timeScore = scoreTimeSuitability({
    departAt: input.departAt,
    estimatedTravelMinutes: input.estimatedTravelMinutes,
    mockSunsetTime: input.mockSunsetTime,
    parkOpenTime: input.parkOpenTime,
    parkCloseTime: input.parkCloseTime,
  });
  const userProfileScore = scoreUserProfile(input.travelerCount, input.transportMode, {
    hasDirectPublicTransit: input.hasDirectPublicTransit,
    weatherCondition: input.weatherCondition,
  });

  const totalScore = clampScore(
    weatherScore * EVALUATION_WEIGHTS.weather +
      durationScore * EVALUATION_WEIGHTS.duration +
      timeScore * EVALUATION_WEIGHTS.time +
      userProfileScore * EVALUATION_WEIGHTS.userProfile,
  );

  const weakestFactor = findWeakestFactor({
    weatherScore,
    durationScore,
    timeScore,
    userProfileScore,
  });

  const recommendation = buildRecommendations({
    weakestFactor,
    weatherCondition: input.weatherCondition,
    estimatedTravelMinutes: input.estimatedTravelMinutes,
    departAt: input.departAt,
    transportMode: input.transportMode,
    travelerCount: input.travelerCount,
    hasDirectPublicTransit: input.hasDirectPublicTransit,
    parkName: input.parkName,
  });

  const level = mapScoreToLevel(totalScore);
  const levelText = levelThaiLabels[level] ?? "ปานกลาง";
  const factorText = factorThaiLabels[weakestFactor] ?? "สภาพอากาศ";
  const summary = `ผลการประเมินความเหมาะสมทริปอยู่ในเกณฑ์ "${levelText}" โดยมีปัจจัยด้าน${factorText}ที่ควรให้ความสำคัญหรือปรับแผนมากที่สุด`;

  return {
    totalScore,
    level,
    weatherScore,
    durationScore,
    timeScore,
    userProfileScore,
    weakestFactor,
    summary,
    recommendation,
  };
}
