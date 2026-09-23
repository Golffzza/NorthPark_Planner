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
      className="relative mt-8 overflow-hidden rounded-3xl border border-emerald-500/20 bg-slate-900/70 p-3 sm:p-3.5 backdrop-blur-xl shadow-2xl shadow-emerald-950/30 dark:border-emerald-500/20 dark:bg-emerald-950/50"
      aria-label="การนำทางส่วนท้ายของหน้า"
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-12 left-1/2 h-24 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-2xl" />

      <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Main CTA Button: วางแผนทริป */}
        <Link
          href={`/trips/new?parkId=${parkId}`}
          className="group relative flex flex-1 items-center justify-between sm:justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 px-6 py-3.5 text-sm sm:text-base font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:shadow-emerald-500/35 hover:brightness-105 active:scale-[0.98]"
        >
          {/* Subtle sheen highlight */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full duration-700 ease-out group-hover:translate-x-full transition-transform" />

          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-950/10 transition-transform duration-300 group-hover:rotate-45">
              <svg
                className="h-4 w-4 text-slate-950"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" />
              </svg>
            </span>
            <span className="tracking-tight font-extrabold">วางแผนทริปไปที่นี่</span>
          </div>

          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-950/10 transition-transform duration-300 group-hover:translate-x-1">
            <svg
              className="h-4 w-4 text-slate-950"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </Link>

        {/* Secondary Action Pills */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
          {/* Back Button */}
          <button
            type="button"
            onClick={handleBack}
            className="group flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-200 backdrop-blur-md transition-all duration-200 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white active:scale-95 cursor-pointer dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-900/50"
          >
            <svg
              className="h-4 w-4 text-emerald-400 transition-transform duration-200 group-hover:-translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.4}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>ย้อนกลับ</span>
          </button>

          {/* Scroll to top Button */}
          <button
            type="button"
            onClick={handleScrollToTop}
            title="เลื่อนขึ้นบนสุด"
            aria-label="เลื่อนขึ้นบนสุด"
            className="group flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-200 backdrop-blur-md transition-all duration-200 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white active:scale-95 cursor-pointer dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-900/50"
          >
            <svg
              className="h-4 w-4 text-emerald-400 transition-transform duration-200 group-hover:-translate-y-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.4}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
            <span>ขึ้นบนสุด</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
