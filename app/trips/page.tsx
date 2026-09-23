import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { TripCard } from "@/components/trips/trip-card";
import { EmptyState } from "@/components/ui/empty-state";
import { listTripsForCurrentUser } from "@/lib/services/trip-service";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
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
            <Link
              href="/trips/new"
              className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 shadow-sm shadow-emerald-950/30 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>+ สร้างทริปใหม่</span>
            </Link>
          }
        />

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
