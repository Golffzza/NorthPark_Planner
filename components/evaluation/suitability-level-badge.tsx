import { getEvaluationLevelLabel } from "@/lib/constants/trip-form-options";

type SuitabilityLevelBadgeProps = {
  level: string;
  size?: "sm" | "md" | "lg";
};

const LEVEL_CONFIGS: Record<
  string,
  {
    badgeClass: string;
    dotClass: string;
    icon: string;
  }
> = {
  EXCELLENT: {
    badgeClass:
      "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 shadow-emerald-500/10",
    dotClass: "bg-emerald-400 animate-pulse",
    icon: "✓",
  },
  GOOD: {
    badgeClass:
      "bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/40 shadow-teal-500/10",
    dotClass: "bg-teal-400",
    icon: "✓",
  },
  MODERATE: {
    badgeClass:
      "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40 shadow-amber-500/10",
    dotClass: "bg-amber-400 animate-pulse",
    icon: "⚠️",
  },
  NEEDS_ADJUSTMENT: {
    badgeClass:
      "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/40 shadow-rose-500/10",
    dotClass: "bg-rose-400 animate-ping",
    icon: "!",
  },
};

export function SuitabilityLevelBadge({ level, size = "md" }: SuitabilityLevelBadgeProps) {
  const config = LEVEL_CONFIGS[level] ?? {
    badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700",
    dotClass: "bg-slate-400",
    icon: "•",
  };

  const sizeClasses = {
    sm: "px-2.5 py-1 text-[11px] gap-1.5",
    md: "px-3.5 py-1.5 text-xs gap-2",
    lg: "px-4 py-2 text-sm gap-2.5",
  }[size];

  return (
    <span
      className={`inline-flex items-center font-bold font-heading rounded-full border shadow-sm backdrop-blur-md transition-all ${sizeClasses} ${config.badgeClass}`}
    >
      <span className={`h-2 w-2 rounded-full shrink-0 ${config.dotClass}`} />
      <span>{getEvaluationLevelLabel(level)}</span>
    </span>
  );
}

