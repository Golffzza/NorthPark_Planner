"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type ParkBottomNavigationProps = {
  parkId: string;
  fallbackHref?: string;
};

export function ParkBottomNavigation({
  parkId,
  fallbackHref = "/parks",
}: ParkBottomNavigationProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  const handleScrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <nav
      className="soft-card mt-8 rounded-[28px] sm:rounded-[34px] p-3 sm:p-4 border border-white/60 dark:border-emerald-800/40 shadow-lg shadow-emerald-950/5 backdrop-blur-2xl bg-white/85 dark:bg-[#0b1c16]/90"
      aria-label="การนำทางส่วนท้ายของหน้า"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        {/* Main CTA (Top on mobile, Center on desktop) */}
        <Link
          href={`/trips/new?parkId=${parkId}`}
          className="group order-1 sm:order-2 inline-flex sm:flex-[1.4] items-center justify-center gap-2.5 rounded-2xl sm:rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-500 dark:to-teal-600 px-6 py-3 text-sm sm:text-base font-extrabold text-white shadow-md shadow-emerald-950/20 ring-1 ring-white/20 dark:ring-emerald-300/30 transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 dark:bg-black/25 backdrop-blur-sm shadow-xs ring-1 ring-white/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fillOpacity="0.4" />
            </svg>
          </div>
          <span>วางแผนทริปไปที่นี่</span>
          <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>

        {/* Secondary buttons container on mobile (2 columns) */}
        <div className="order-2 sm:order-1 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5 sm:flex-1">
          {/* Back Button */}
          <button
            type="button"
            onClick={handleBack}
            className="group inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-full border border-slate-200/80 dark:border-emerald-800/40 bg-white/80 dark:bg-slate-900/80 px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-slate-700 dark:text-emerald-200/90 shadow-xs backdrop-blur-md transition-all hover:bg-emerald-50/80 dark:hover:bg-emerald-950/60 active:scale-[0.98] cursor-pointer sm:flex-1"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-emerald-950/90 text-slate-600 dark:text-emerald-300 ring-1 ring-slate-200 dark:ring-emerald-700/50 transition-transform duration-200 group-hover:-translate-x-0.5">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
            </div>
            <span>ย้อนกลับ</span>
          </button>

          {/* Scroll to top (Mobile only inside grid) */}
          <button
            type="button"
            onClick={handleScrollToTop}
            title="เลื่อนขึ้นบนสุด"
            aria-label="เลื่อนขึ้นบนสุด"
            className="group sm:hidden inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 dark:border-emerald-800/40 bg-white/80 dark:bg-slate-900/80 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-emerald-200/90 shadow-xs backdrop-blur-md transition-all hover:bg-emerald-50/80 dark:hover:bg-emerald-950/60 active:scale-[0.98] cursor-pointer"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-emerald-950/90 text-slate-600 dark:text-emerald-300 ring-1 ring-slate-200 dark:ring-emerald-700/50 transition-transform duration-200 group-hover:-translate-y-0.5">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
                />
              </svg>
            </div>
            <span>ขึ้นบนสุด</span>
          </button>
        </div>

        {/* Scroll To Top for desktop */}
        <button
          type="button"
          onClick={handleScrollToTop}
          title="เลื่อนขึ้นบนสุด"
          aria-label="เลื่อนขึ้นบนสุด"
          className="group hidden sm:inline-flex order-3 items-center justify-center gap-2 rounded-full border border-slate-200/80 dark:border-emerald-800/40 bg-white/80 dark:bg-slate-900/80 px-4 py-3 text-sm font-bold text-slate-700 dark:text-emerald-200/90 shadow-xs backdrop-blur-md transition-all hover:bg-emerald-50/80 dark:hover:bg-emerald-950/60 active:scale-[0.98] cursor-pointer sm:flex-initial"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-emerald-950/90 text-slate-600 dark:text-emerald-300 ring-1 ring-slate-200 dark:ring-emerald-700/50 transition-transform duration-200 group-hover:-translate-y-0.5">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
              />
            </svg>
          </div>
          <span>ขึ้นบนสุด</span>
        </button>
      </div>
    </nav>
  );
}
