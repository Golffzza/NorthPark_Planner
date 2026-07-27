type RecommendationListProps = {
  items: string[];
};

export function RecommendationList({ items }: RecommendationListProps) {
  return (
    <section className="soft-card rounded-[34px] px-5 py-6 sm:px-7">
      <span className="guide-chip">Safety Recommendations</span>
      <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
        คำแนะนำเพื่อปรับแผน
      </h2>

      <div className="mt-5 space-y-3">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="dashboard-card rounded-[24px] px-4 py-4">
            <div className="flex gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-sm font-semibold text-[var(--brand-strong)]">
                {index + 1}
              </span>
              <p className="text-sm leading-7 text-[var(--foreground)]">{item}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
