"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buildMiniAppEntryPath, listMiniAppEntryPoints } from "@/lib/line/mini-app-links";
import { useLiff } from "@/lib/line/use-liff";

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  { href: "/", label: "หน้าหลัก", shortLabel: "Home" },
  { href: buildMiniAppEntryPath("exploreParks"), label: "อุทยาน", shortLabel: "Parks" },
  { href: buildMiniAppEntryPath("myTrips"), label: "ทริปของฉัน", shortLabel: "Trips" },
  { href: buildMiniAppEntryPath("planTrip"), label: "วางแผน", shortLabel: "Plan" },
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
  const liff = useLiff();
  const entryPoints = listMiniAppEntryPoints();
  const showLiffBanner = liff.status === "notInLine" || liff.status === "error";

  return (
    <div className="app-backdrop min-h-screen">
      <div className="app-safe-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:pb-10 sm:pt-5">
        <header className="glass-nav safe-top-offset sticky z-30 mb-4 rounded-[30px] px-4 py-3 sm:mb-5 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Link href="/" className="guide-chip">
                NorthPark
              </Link>
              <p className="mt-2 truncate text-xs text-[var(--muted)] sm:text-sm">
                Forest glass companion for safer national park trips
              </p>
            </div>

            <nav className="hidden items-center gap-2 sm:flex">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                      active
                        ? "bg-[var(--brand-soft)] text-[var(--brand-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                        : "text-[var(--foreground)] hover:bg-white/70"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {liff.status === "loading" ? (
          <div className="mb-3 rounded-[22px] border border-white/70 bg-white/60 px-4 py-2.5 text-xs text-[var(--muted)] backdrop-blur-xl sm:text-sm">
            Preparing LINE MINI App shell...
          </div>
        ) : null}

        {showLiffBanner ? (
          <div className="mb-4 rounded-[24px] border border-white/72 bg-white/62 px-4 py-3 text-sm backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {liff.status === "error" ? "LINE shell unavailable" : "Browser mode"}
                </p>
                <p className="mt-1 text-xs leading-6 text-[var(--muted)] sm:text-sm">
                  {liff.message ?? "ยังใช้งานทุกหน้าหลักได้ตามปกติ พร้อมลิงก์เข้า MINI App entry ที่สำคัญ"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {entryPoints.slice(0, 3).map((entryPoint) => (
                  <Link
                    key={entryPoint.key}
                    href={entryPoint.path}
                    className="rounded-full border border-white/76 bg-white/78 px-3 py-2 text-xs font-semibold text-[var(--brand-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]"
                  >
                    {entryPoint.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <main className="flex-1">{children}</main>

        <nav className="glass-tabbar safe-bottom-nav fixed inset-x-4 z-40 rounded-[32px] px-3 py-3 sm:hidden">
          <div className="grid grid-cols-4 gap-2">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center rounded-[22px] px-2 py-2 text-center transition ${
                    active
                      ? "bg-white/84 text-[var(--brand-strong)] shadow-[0_10px_24px_rgba(32,95,82,0.14)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                    {item.shortLabel}
                  </span>
                  <span className="mt-1 text-[11px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
