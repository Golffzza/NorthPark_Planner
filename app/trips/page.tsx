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
          eyebrow="Trip Dashboard"
          title="ทริปของฉัน"
          description="รวมแผนเดินทางทั้งหมดในมุมมองแบบ travel pass พร้อมสถานะล่าสุด คะแนนประเมิน และทางลัดสำหรับเข้า planner จาก MINI App"
          actions={
            <Link
              href="/trips/new"
              className="glass-button inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
            >
              สร้างทริปใหม่
            </Link>
          }
        />

        <section className="glass-panel rounded-[30px] px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildTripsEntryPath("overview")}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === "overview"
                  ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                  : "bg-white/70 text-[var(--muted)]"
              }`}
            >
              ทริปทั้งหมด
            </Link>
            <Link
              href={buildTripsEntryPath("alerts")}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === "alerts"
                  ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                  : "bg-white/70 text-[var(--muted)]"
              }`}
            >
              แจ้งเตือน
            </Link>
          </div>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            ใช้เป็น dashboard หลักของทริปใน LINE MINI App ได้ โดยแท็บแจ้งเตือนยังคงเป็น fallback view
            สำหรับ sprint นี้
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
