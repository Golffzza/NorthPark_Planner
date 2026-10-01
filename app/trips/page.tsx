import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { TripsListView } from "@/components/trips/trips-list-view";
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
              className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-bold font-heading text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 shadow-sm shadow-emerald-950/30 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>+ สร้างทริปใหม่</span>
            </Link>
          }
        />

        <TripsListView trips={trips} />
      </div>
    </AppShell>
  );
}
