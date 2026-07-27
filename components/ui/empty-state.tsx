import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({ title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <section className="glass-panel app-section overflow-hidden rounded-[34px] px-6 py-10 text-center sm:px-10 sm:py-12">
      <div className="relative z-10 mx-auto max-w-lg">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="park-media-placeholder flex h-14 w-14 items-center justify-center rounded-[22px] text-sm font-semibold text-[var(--brand-strong)]">
            Guide
          </div>
        </div>
        <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">{description}</p>
        {actionLabel && actionHref ? (
          <Link
            href={actionHref}
            className="glass-button mt-7 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
