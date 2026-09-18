"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buildMiniAppEntryPath } from "@/lib/line/mini-app-links";

type AppShellProps = {
  children: ReactNode;
};

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  );
}

function ParksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L4 15h5l-3 6h12l-3-6h5L12 3z" />
      <path d="M12 21v2" />
    </svg>
  );
}

function TripsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z" />
    </svg>
  );
}

function PlanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M12 14v4M10 16h4" />
    </svg>
  );
}

const navItems = [
  { href: "/", label: "หน้าหลัก", shortLabel: "Home", icon: HomeIcon },
  { href: buildMiniAppEntryPath("exploreParks"), label: "อุทยาน", shortLabel: "Parks", icon: ParksIcon },
  { href: buildMiniAppEntryPath("myTrips"), label: "ทริปของฉัน", shortLabel: "Trips", icon: TripsIcon },
  { href: buildMiniAppEntryPath("planTrip"), label: "วางแผน", shortLabel: "Plan", icon: PlanIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (pathname === href) {
    return true;
  }

  if (!pathname.startsWith(`${href}/`)) {
    return false;
  }

  if (href === "/trips" && pathname.startsWith("/trips/new")) {
    return false;
  }

  return true;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="app-backdrop min-h-screen relative overflow-x-hidden selection:bg-emerald-500/20">
      {/* Dynamic Ambient Background Accents & Topo Contours */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {/* Topographic Contour Map Pattern */}
        <div className="absolute inset-0 bg-topo-pattern opacity-[0.06] dark:opacity-[0.12] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_90%)]" />

        {/* Aurora Emerald Glow - Top Left */}
        <div className="absolute -top-28 -left-20 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-emerald-500/20 via-teal-600/15 to-transparent blur-[90px] animate-pulse-slow" />

        {/* Alpine Cyan Stream - Top Right */}
        <div className="absolute top-[8%] -right-24 h-[460px] w-[460px] rounded-full bg-gradient-to-bl from-cyan-500/18 via-teal-500/10 to-transparent blur-[100px] animate-float-slow" />

        {/* Sunset Mountain Gold / Amber Contrast Accent - Mid Right */}
        <div className="absolute top-[48%] -right-20 h-[380px] w-[380px] rounded-full bg-gradient-to-l from-amber-500/12 via-orange-500/5 to-transparent blur-[90px]" />

        {/* Midnight Forest Indigo - Bottom Left */}
        <div className="absolute bottom-[5%] -left-24 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-indigo-600/15 via-emerald-800/12 to-transparent blur-[110px]" />
      </div>

      <div className="app-safe-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:pb-10 sm:pt-5 relative z-10">
        <header className="glass-nav safe-top-offset sticky z-30 mb-4 rounded-2xl sm:rounded-full px-3.5 py-2.5 sm:mb-5 sm:px-5 sm:py-3 border border-white/60 dark:border-emerald-700/30 shadow-lg shadow-emerald-950/5 backdrop-blur-2xl bg-white/80 dark:bg-[#0c1e18]/85">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="group flex items-center gap-2.5 sm:gap-3 transition-transform active:scale-[0.98] min-w-0">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 p-2 shadow-md shadow-emerald-950/20 ring-1 ring-white/40 dark:ring-emerald-400/20">
                <svg width="20" height="20" className="h-5 w-5 text-emerald-100 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
                  <path d="M4.14 15.08 7 11l4.5 6" />
                </svg>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0c1e18]"></span>
                </span>
              </div>

              <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-extrabold tracking-tight text-base sm:text-lg leading-tight bg-gradient-to-r from-slate-900 via-emerald-900 to-teal-800 dark:from-white dark:via-emerald-200 dark:to-teal-300 bg-clip-text text-transparent">
                    NorthPark
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-300 ring-1 ring-emerald-600/20 dark:ring-emerald-400/30">
                    PLANNER
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs leading-tight text-slate-500 dark:text-emerald-200/70 font-medium truncate max-w-[210px] sm:max-w-md mt-0.5">
                  ระบบวางแผนท่องเที่ยวอุทยานแห่งชาติภาคเหนือ
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              <nav className="hidden items-center gap-2 sm:flex">
                {navItems.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                        active
                          ? "bg-gradient-to-b from-[var(--brand)] to-[var(--brand-strong)] text-white shadow-md dark:from-emerald-500 dark:to-teal-600 dark:text-white font-extrabold"
                          : "text-[var(--foreground)] hover:bg-white/70 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </header>


        <main className="flex-1">{children}</main>

        <nav className="glass-tabbar fixed inset-x-3 bottom-3 z-40 mx-auto max-w-lg rounded-full p-1.5 shadow-2xl backdrop-blur-2xl border border-white/40 dark:border-emerald-800/40 dark:bg-[#0b1c16]/90 sm:hidden">
          <div className="grid grid-cols-4 gap-1">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 rounded-full py-2 px-1 text-center transition-all duration-200 active:scale-95 ${
                    active
                      ? "bg-gradient-to-b from-[var(--brand)] to-[var(--brand-strong)] text-white shadow-lg shadow-emerald-900/25 dark:from-emerald-500 dark:to-teal-600 dark:text-white dark:shadow-emerald-500/25 font-bold"
                      : "text-slate-500 dark:text-emerald-200/60 hover:text-slate-900 dark:hover:text-emerald-100"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "scale-105" : "opacity-80"}`} />
                  <span className="text-[11px] font-medium leading-none tracking-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
