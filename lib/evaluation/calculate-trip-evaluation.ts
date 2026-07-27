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
  const userProfileScore = scoreUserProfile(input.travelerCount, input.transportMode);

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
  });

  const level = mapScoreToLevel(totalScore);
  const summary = `Trip suitability is ${level.toLowerCase().replaceAll("_", " ")} with the ${weakestFactor} factor needing the most attention.`;

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
