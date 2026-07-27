import type { FactorScoreViewModel } from "@/lib/presenters/trip-result-view";

import { FactorScoreCard } from "./factor-score-card";

type FactorBreakdownProps = {
  factors: FactorScoreViewModel[];
};

export function FactorBreakdown({ factors }: FactorBreakdownProps) {
  return (
    <section className="soft-card rounded-[34px] px-5 py-6 sm:px-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="guide-chip">Factor Breakdown</span>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            คะแนนย่อยของแต่ละปัจจัย
          </h2>
        </div>
        <p className="text-sm text-[var(--muted)]">อากาศ เวลาเดินทาง เวลาถึง และปัจจัยผู้เดินทาง</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {factors.map((factor) => (
          <FactorScoreCard key={factor.key} factor={factor} />
        ))}
      </div>
    </section>
  );
}
