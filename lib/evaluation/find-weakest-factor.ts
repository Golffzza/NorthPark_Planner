import type { WeakestFactor } from "./types";

type FactorScores = {
  weatherScore: number;
  durationScore: number;
  timeScore: number;
  userProfileScore: number;
};

export function findWeakestFactor(scores: FactorScores): WeakestFactor {
  const rankedFactors: Array<{ factor: WeakestFactor; score: number }> = [
    { factor: "weather", score: scores.weatherScore },
    { factor: "duration", score: scores.durationScore },
    { factor: "time", score: scores.timeScore },
    { factor: "userProfile", score: scores.userProfileScore },
  ];

  rankedFactors.sort((left, right) => left.score - right.score);

  return rankedFactors[0].factor;
}
