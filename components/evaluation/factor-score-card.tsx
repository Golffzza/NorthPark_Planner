import type { FactorScoreViewModel } from "@/lib/presenters/trip-result-view";

type FactorScoreCardProps = {
  factor: FactorScoreViewModel;
};

function getFactorTheme(score: number) {
  if (score >= 80) {
    return {
      barColor: "bg-gradient-to-r from-emerald-500 to-teal-400",
      badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
      pillClass: "bg-emerald-600 text-white shadow-emerald-900/30",
    };
  }
  if (score >= 60) {
    return {
      barColor: "bg-gradient-to-r from-teal-500 to-cyan-400",
      badgeClass: "bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30",
      pillClass: "bg-teal-600 text-white shadow-teal-900/30",
    };
  }
  if (score >= 40) {
    return {
      barColor: "bg-gradient-to-r from-amber-500 to-yellow-400",
      badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
      pillClass: "bg-amber-600 text-white shadow-amber-900/30",
    };
  }
  return {
    barColor: "bg-gradient-to-r from-rose-500 to-pink-500",
    badgeClass: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30",
    pillClass: "bg-rose-600 text-white shadow-rose-900/30",
  };
}

function getFactorIcon(key: string) {
  switch (key) {
    case "weather":
      return "🌤️";
    case "duration":
      return "🚗";
    case "time":
      return "⏰";
    case "profile":
      return "👤";
    default:
      return "📊";
  }
}

export function FactorScoreCard({ factor }: FactorScoreCardProps) {
  const theme = getFactorTheme(factor.score);
  const icon = getFactorIcon(factor.key);

  return (
    <article className="dashboard-card relative overflow-hidden rounded-[26px] p-5 transition-all duration-200 hover:border-emerald-500/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 dark:bg-white/5 border border-white/10 text-base shrink-0 shadow-xs">
            {icon}
          </span>
          <div>
            <h3 className="text-base font-bold font-heading text-[var(--foreground)]">{factor.label}</h3>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-emerald-300/80">
              น้ำหนัก {factor.weightLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`inline-flex items-center justify-center rounded-full px-3 py-0.5 text-sm font-black font-heading shadow-sm ${theme.pillClass}`}>
            {factor.score}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">/ 100</span>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-black/40 border border-slate-300/40 dark:border-white/5">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${theme.barColor}`}
          style={{ width: `${Math.max(4, Math.min(100, factor.score))}%` }}
        />
      </div>

      <p className="mt-3 text-xs sm:text-[13px] leading-relaxed text-[var(--muted)]">
        {factor.description}
      </p>
    </article>
  );
}

