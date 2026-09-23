import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  compact?: boolean;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  compact = false,
}: PageHeaderProps) {
  if (compact) {
    return (
      <section className="relative overflow-hidden rounded-3xl p-4.5 sm:p-6 border border-white/80 dark:border-emerald-500/20 shadow-md shadow-emerald-950/5 backdrop-blur-xl bg-white/90 dark:bg-gradient-to-r dark:from-[#0d271f]/95 dark:to-[#081813]/95">
        {/* Decorative ambient glow */}
        <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/15 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 px-3 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-600/20 dark:ring-emerald-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{eyebrow}</span>
              </div>
            ) : null}
            <h1 className="mt-2 text-lg sm:text-xl md:text-2xl font-semibold tracking-normal text-slate-900 dark:text-white leading-snug font-heading">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-emerald-200/85 font-normal leading-relaxed break-words">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0 pt-1 sm:pt-0">{actions}</div> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl sm:rounded-[36px] px-6 py-6 sm:px-8 sm:py-8 border border-white/80 dark:border-emerald-500/25 shadow-xl shadow-emerald-950/8 backdrop-blur-2xl bg-white/90 dark:bg-gradient-to-b dark:from-[#0d271f] dark:to-[#081813]">
      {/* Decorative ambient glow */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-52 w-52 rounded-full bg-emerald-400/20 dark:bg-emerald-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-teal-400/20 dark:bg-teal-500/15 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-2">
          {eyebrow ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-600/20 dark:ring-emerald-400/30">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              </span>
              <span>{eyebrow}</span>
            </div>
          ) : null}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-normal text-slate-900 dark:text-white leading-tight font-heading">
            {title}
          </h1>
          {description ? (
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-emerald-100/90 font-normal break-words">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0 pt-1 sm:pt-0">{actions}</div> : null}
      </div>
    </section>
  );
}
