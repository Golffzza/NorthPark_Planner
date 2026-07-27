import type { TripEvaluation } from "@prisma/client";

export type EvaluationDto = {
  id: string;
  tripId: string;
  totalScore: number;
  level: TripEvaluation["level"];
  weatherScore: number;
  durationScore: number;
  timeScore: number;
  userProfileScore: number;
  summary: string;
  recommendation: string;
  evaluatedAt: string;
  createdAt: string;
};

export function mapEvaluationToDto(evaluation: TripEvaluation): EvaluationDto {
  return {
    id: evaluation.id,
    tripId: evaluation.tripId,
    totalScore: evaluation.totalScore,
    level: evaluation.level,
    weatherScore: evaluation.weatherScore,
    durationScore: evaluation.durationScore,
    timeScore: evaluation.timeScore,
    userProfileScore: evaluation.userProfileScore,
    summary: evaluation.summary,
    recommendation: evaluation.recommendation,
    evaluatedAt: evaluation.evaluatedAt.toISOString(),
    createdAt: evaluation.createdAt.toISOString(),
  };
}
