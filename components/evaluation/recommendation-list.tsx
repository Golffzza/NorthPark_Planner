type RecommendationListProps = {
  items: string[];
};

export function RecommendationList({ items }: RecommendationListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="soft-card relative overflow-hidden rounded-[32px] sm:rounded-[34px] px-5 py-6 sm:px-7">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 text-sm">
          💡
        </span>
        <span className="guide-chip">ข้อแนะนำความปลอดภัย</span>
      </div>

      <h2 className="mt-3.5 text-xl sm:text-2xl font-bold font-heading tracking-tight text-[var(--foreground)]">
        ข้อแนะนำเพื่อปรับปรุงแผน
      </h2>
      <p className="mt-1 text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
        ปฏิบัติตามคำแนะนำเหล่านี้เพื่อความปลอดภัยสูงสุดในการท่องเที่ยว
      </p>

      <div className="mt-5 space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="dashboard-card group relative overflow-hidden rounded-[24px] p-4 transition-all duration-200 hover:border-amber-500/40"
          >
            <div className="flex gap-3.5 items-start">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-black font-heading border border-amber-500/20 shadow-xs">
                {index + 1}
              </span>
              <p className="text-xs sm:text-sm leading-relaxed text-[var(--foreground)] font-medium pt-0.5">
                {item}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

