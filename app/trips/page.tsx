import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { TripCard } from "@/components/trips/trip-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buildTripsEntryPath, normalizeTripEntryTab } from "@/lib/line/mini-app-links";
import { listTripsForCurrentUser } from "@/lib/services/trip-service";

export const dynamic = "force-dynamic";

type TripsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TripsPage({ searchParams }: TripsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const activeTab = normalizeTripEntryTab(typeof resolvedSearchParams.tab === "string" ? resolvedSearchParams.tab : null);
  const trips = await listTripsForCurrentUser();

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          compact
          eyebrow="รายการทริป"
          title="ทริปของฉัน"
          description="รวมแผนเที่ยวทั้งหมด พร้อมคะแนนความพร้อม และทางลัดสร้างทริปใหม่"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/trips/demo/result"
                className="inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-emerald-100 bg-slate-100/90 hover:bg-slate-200/90 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 border border-slate-300/80 dark:border-emerald-500/40 backdrop-blur-md shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>ตัวอย่างผลประเมิน</span>
                <span>📊</span>
              </Link>
              <Link
                href="/trips/new"
                className="inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 shadow-sm shadow-emerald-950/30 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>+ สร้างทริปใหม่</span>
              </Link>
            </div>
          }
        />

        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/80 dark:border-emerald-500/20 shadow-md shadow-emerald-950/5 backdrop-blur-xl bg-white/90 dark:bg-gradient-to-r dark:from-[#0d271f]/90 dark:to-[#081813]/90">
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildTripsEntryPath("overview")}
              scroll={false}
              className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95 ${
                activeTab === "overview"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm font-bold"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-slate-600 dark:text-emerald-200/80 border border-slate-200/80 dark:border-emerald-800/40"
              }`}
            >
              ทริปทั้งหมด
            </Link>
            <Link
              href={buildTripsEntryPath("alerts")}
              scroll={false}
              className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95 ${
                activeTab === "alerts"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm font-bold"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-slate-600 dark:text-emerald-200/80 border border-slate-200/80 dark:border-emerald-800/40"
              }`}
            >
              แจ้งเตือน
            </Link>
          </div>
          <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-emerald-200/70">
            แสดงรายการทริปทั้งหมดที่คุณวางแผนไว้ พร้อมคะแนนความพร้อมและสถานะการเดินทาง
          </p>
        </section>

        {activeTab === "alerts" ? (
          <section className="soft-card rounded-[32px] px-5 py-5">
            <span className="guide-chip">Alerts Entry</span>
            <p className="mt-4 text-lg font-semibold text-[var(--foreground)]">เส้นทางเข้าแจ้งเตือนพร้อมแล้ว</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              หน้านี้ยังเป็น fallback ที่พาคุณกลับมาดูแผนล่าสุดหรือเริ่มวางทริปใหม่ได้ทันที โดยยังรักษา MINI
              App entry path เดิมไว้ครบ
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/trips/new"
                className="glass-button inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold"
              >
                วางแผนทริปใหม่
              </Link>
              <Link
                href="/parks"
                className="ghost-button inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--foreground)]"
              >
                สำรวจอุทยาน
              </Link>
            </div>
          </section>
        ) : null}

        {trips.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </section>
        ) : (
          <EmptyState
            title="ยังไม่มีทริปในระบบ"
            description="เริ่มสร้างทริปแรกของคุณเพื่อเก็บแผนการเดินทางและดู safety score ในรอบถัดไป"
            actionLabel="สร้างทริปแรก"
            actionHref="/trips/new"
          />
        )}
      </div>
    </AppShell>
  );
}
