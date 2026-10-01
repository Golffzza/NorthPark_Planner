import { SuitabilityLevelBadge } from "@/components/evaluation/suitability-level-badge";
import type { EvaluationHistoryItem } from "@/lib/presenters/trip-result-view";
import { formatThaiDateTime } from "@/lib/utils/date";

type EvaluationHistoryListProps = {
  history: EvaluationHistoryItem[];
};

export function EvaluationHistoryList({ history }: EvaluationHistoryListProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <section className="soft-card relative overflow-hidden rounded-[32px] sm:rounded-[34px] px-5 py-6 sm:px-7">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 text-sm">
          ⏱️
        </span>
        <span className="guide-chip">ลำดับประวัติการประเมิน</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mt-3.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[var(--foreground)]">
            ประวัติการประเมินทริป ({history.length} ครั้ง)
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[var(--muted)]">
            บันทึกการประเมินและการอัปเดตข้อมูลสภาพอากาศย้อนหลัง
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3.5">
        {history.map((item, index) => (
          <article
            key={item.id}
            className={`dashboard-card relative overflow-hidden rounded-[26px] p-4 sm:p-5 transition-all duration-200 ${
              item.isLatest ? "border-emerald-500/40 shadow-sm" : ""
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-black font-heading text-sm shadow-xs ${
                  item.isLatest
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-950/20"
                    : "bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                }`}>
                  #{history.length - index}
                </span>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-black font-heading text-[var(--foreground)]">
                      {item.totalScore}
                      <span className="text-xs font-normal text-[var(--muted)]"> / 100 คะแนน</span>
                    </span>
                    {item.isLatest ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold font-heading uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ล่าสุด
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-[var(--muted)]">
                    {formatThaiDateTime(item.evaluatedAt)}
                  </p>

                  <p className="text-xs sm:text-sm leading-relaxed text-[var(--foreground)] pt-1">
                    {item.summary}
                  </p>
                </div>
              </div>

              <div className="self-start sm:self-auto shrink-0 pl-13 sm:pl-0">
                <SuitabilityLevelBadge level={item.level} size="sm" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

