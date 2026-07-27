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
    <article className="dashboard-card rounded-[28px] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">{factor.label}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{factor.description}</p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getTone(factor.score)}`}>
          {factor.score}
        </span>
      </div>
    </article>
  );
}
