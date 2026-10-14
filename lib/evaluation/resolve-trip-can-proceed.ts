import type { EvaluationConstraint } from "./types";

/** Legacy evaluations may lack canProceed, while constraints still carry blocking evidence. */
export function resolveTripCanProceed(
  storedCanProceed: boolean | null | undefined,
  constraints: Pick<EvaluationConstraint, "severity">[],
): boolean {
  if (storedCanProceed === false) return false;
  if (constraints.some((constraint) => constraint.severity === "BLOCKING")) return false;
  return storedCanProceed ?? true;
}
