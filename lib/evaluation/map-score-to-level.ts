import { SCORE_LEVELS } from "./constants";
import type { EvaluationLevel } from "./types";

export function mapScoreToLevel(score: number): EvaluationLevel {
  const clampedScore = Math.max(0, Math.min(100, score));
  const matchedLevel = SCORE_LEVELS.find((entry) => clampedScore >= entry.min);

  return matchedLevel?.level ?? "NEEDS_ADJUSTMENT";
}
