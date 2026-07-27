import { getEvaluationLevelLabel } from "@/lib/constants/trip-form-options";

type SuitabilityLevelBadgeProps = {
  level: string;
};

const LEVEL_STYLES: Record<string, string> = {
  EXCELLENT: "bg-emerald-100 text-emerald-800 border-emerald-200",
  GOOD: "bg-teal-100 text-teal-800 border-teal-200",
  MODERATE: "bg-amber-100 text-amber-800 border-amber-200",
  NEEDS_ADJUSTMENT: "bg-rose-100 text-rose-800 border-rose-200",
};

export function SuitabilityLevelBadge({ level }: SuitabilityLevelBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.18em] uppercase ${
        LEVEL_STYLES[level] ?? "border-[var(--border-strong)] bg-white/80 text-[var(--foreground)]"
      }`}
    >
      {getEvaluationLevelLabel(level)}
    </span>
  );
}
