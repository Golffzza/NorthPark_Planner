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
      className="relative mt-6 overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-500/25 bg-slate-900/95 p-1.5 sm:p-2 backdrop-blur-xl shadow-xl shadow-emerald-950/30 dark:border-emerald-500/25 dark:bg-emerald-950/85"
      aria-label="การนำทางส่วนท้ายของหน้า"
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-10 left-1/2 h-20 w-64 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-xl" />

      <div className="relative flex items-center justify-between gap-1.5 sm:gap-2">
        {/* 1. Back Button (Compact) */}
        <button
          type="button"
          onClick={handleBack}
          className="group flex h-10 sm:h-11 shrink-0 items-center justify-center gap-1 sm:gap-1.5 rounded-xl border border-white/15 bg-white/10 px-2.5 sm:px-3 text-xs sm:text-sm font-medium !text-slate-100 backdrop-blur-md transition-all duration-200 hover:border-emerald-400/40 hover:bg-emerald-500/15 hover:!text-white active:scale-95 cursor-pointer dark:border-white/15 dark:bg-white/5 dark:!text-slate-200 dark:hover:border-emerald-400/40 dark:hover:bg-emerald-900/40"
        >
          <svg
            className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 transition-transform duration-200 group-hover:-translate-x-1 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.4}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span className="!text-slate-100 whitespace-nowrap">ย้อนกลับ</span>
        </button>

        {/* 2. Main CTA Button: วางแผนทริป (ขยายเด่นชัด ตัวอักษรอยู่ในกรอบสวยงาม) */}
        <Link
          href={`/trips/new?parkId=${parkId}`}
          className="group relative flex flex-1 h-10 sm:h-11 min-w-0 items-center justify-center gap-1.5 sm:gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 px-3 sm:px-4 font-bold !text-[#032b21] shadow-md shadow-emerald-500/25 transition-all duration-200 hover:shadow-emerald-500/35 hover:brightness-105 active:scale-[0.98]"
        >
          {/* Subtle sheen highlight */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full duration-700 ease-out group-hover:translate-x-full transition-transform" />

          <span className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-lg bg-[#032b21]/15 transition-transform duration-200 group-hover:rotate-45">
            <svg
              className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#032b21]"
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

          <span className="text-xs sm:text-sm font-bold font-heading !text-[#032b21] tracking-tight whitespace-nowrap">
            <span className="xs:hidden">วางแผนทริป</span>
            <span className="hidden xs:inline">วางแผนทริปไปที่นี่</span>
          </span>

          <div className="hidden md:flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-[#032b21]/15 transition-transform duration-200 group-hover:translate-x-0.5">
            <svg
              className="h-3 w-3 text-[#032b21]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </Link>

        {/* 3. Scroll to top Button (Compact) */}
        <button
          type="button"
          onClick={handleScrollToTop}
          title="เลื่อนขึ้นบนสุด"
          aria-label="เลื่อนขึ้นบนสุด"
          className="group flex h-10 sm:h-11 shrink-0 items-center justify-center gap-1 sm:gap-1.5 rounded-xl border border-white/15 bg-white/10 px-2.5 sm:px-3 text-xs sm:text-sm font-medium !text-slate-100 backdrop-blur-md transition-all duration-200 hover:border-emerald-400/40 hover:bg-emerald-500/15 hover:!text-white active:scale-95 cursor-pointer dark:border-white/15 dark:bg-white/5 dark:!text-slate-200 dark:hover:border-emerald-400/40 dark:hover:bg-emerald-900/40"
        >
          <svg
            className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 transition-transform duration-200 group-hover:-translate-y-1 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.4}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
          </svg>
          <span className="!text-slate-100 whitespace-nowrap">ขึ้นบนสุด</span>
        </button>
      </div>
    </nav>
  );
}
