import { Check, AlertTriangle, X } from "lucide-react";
import type { FactorScoreViewModel } from "@/lib/presenters/trip-result-view";

import { FactorScoreCard } from "./factor-score-card";

type FactorBreakdownProps = {
  factors: FactorScoreViewModel[];
};

export function FactorBreakdown({ factors }: FactorBreakdownProps) {
  return (
    <section className="soft-card rounded-[34px] px-5 py-6 sm:px-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="guide-chip">การ์ดปัจจัย 4 ด้าน</span>
          <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] font-heading text-[var(--foreground)]">
            ความพร้อมรายปัจจัย (Factor Breakdown)
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            สังเกตไอคอนสถานะและสี เพื่อนำคำแนะนำไปปรับแต่งแผนการเดินทางได้จริง
          </p>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--muted)]">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-300">
            <Check className="w-3.5 h-3.5" /> ปลอดภัย (≥75)
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-600 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" /> ควรระวัง (50–74)
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-rose-600 dark:text-rose-300">
            <X className="w-3.5 h-3.5" /> ควรปรับแผน (&lt;50)
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
        {factors.map((factor) => (
          <FactorScoreCard key={factor.key} factor={factor} />
        ))}
      </div>
    </section>
  );
}
