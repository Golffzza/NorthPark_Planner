import type { FactorStatus } from "./types";

/** Shared score bands for individual evaluation factors, not overall trip levels. */
export function getFactorStatus(score: number): FactorStatus {
  if (score >= 80) return "GOOD";
  if (score >= 60) return "CAUTION";
  return "RISK";
}
