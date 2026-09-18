import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({ title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <section className="glass-panel app-section relative overflow-hidden rounded-[32px] sm:rounded-[36px] px-6 py-10 text-center sm:px-10 sm:py-12 border border-white/60 dark:border-emerald-800/40 shadow-lg shadow-emerald-950/5 backdrop-blur-2xl bg-white/85 dark:bg-[#0b1c16]/90">
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-lg">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-slate-100 dark:to-emerald-950/40 p-3 ring-1 ring-emerald-500/30 dark:ring-emerald-400/20 shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 dark:bg-emerald-600 text-white shadow-md">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
              <path d="M11 8v6M8 11h6" />
            </svg>
          </div>
        </div>

        <h2 className="mt-5 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-emerald-200/80 font-normal">{description}</p>

        {actionLabel && actionHref ? (
          <Link
            href={actionHref}
            className="glass-button mt-6 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold shadow-md shadow-emerald-950/20 active:scale-95 transition-all"
          >
            <span>{actionLabel}</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
