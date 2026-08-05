import type { FactorScoreViewModel } from "@/lib/presenters/trip-result-view";

type FactorScoreCardProps = {
  factor: FactorScoreViewModel;
};

function getTone(score: number) {
  if (score >= 80) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (score >= 60) {
    return "bg-teal-50 text-teal-700";
  }

  if (score >= 40) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-rose-50 text-rose-700";
}

export function FactorScoreCard({ factor }: FactorScoreCardProps) {
  return (
    <article className="dashboard-card rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--foreground)]">{factor.label}</h3>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {factor.weightLabel}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-[var(--muted)]">{factor.description}</p>
        </div>
        <span className={`inline-flex shrink-0 rounded-full px-3.5 py-1 text-sm font-bold shadow-xs ${getTone(factor.score)}`}>
          {factor.score}
        </span>
      </div>
    </article>
  );
}
