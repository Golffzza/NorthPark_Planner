import { SuitabilityLevelBadge } from "@/components/evaluation/suitability-level-badge";
import type { EvaluationHistoryItem } from "@/lib/presenters/trip-result-view";
import { formatThaiDateTime } from "@/lib/utils/date";

type EvaluationHistoryListProps = {
  history: EvaluationHistoryItem[];
};

export function EvaluationHistoryList({ history }: EvaluationHistoryListProps) {
  return (
    <section className="soft-card rounded-[34px] px-5 py-6 sm:px-7">
      <span className="guide-chip">Evaluation Timeline</span>
      <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
        ประวัติการประเมิน
      </h2>

      <div className="mt-5 space-y-4">
        {history.map((item, index) => (
          <article key={item.id} className="relative dashboard-card rounded-[28px] px-4 py-4 sm:px-5">
            {index < history.length - 1 ? (
              <span className="absolute bottom-[-1rem] left-8 top-[4.5rem] w-px bg-[linear-gradient(180deg,rgba(45,122,103,0.28),rgba(45,122,103,0.02))]" />
            ) : null}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-sm font-semibold text-[var(--brand-strong)]">
                  {index + 1}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                      {item.totalScore}/100
                    </p>
                    {item.isLatest ? (
                      <span className="inline-flex rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
                        Latest
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{formatThaiDateTime(item.evaluatedAt)}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{item.summary}</p>
                </div>
              </div>
              <SuitabilityLevelBadge level={item.level} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
