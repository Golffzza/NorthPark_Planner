import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { TripForm } from "@/components/trips/trip-form";
import { buildMiniAppEntryPath } from "@/lib/line/mini-app-links";
import { listParkOptions } from "@/lib/services/park-service";

type NewTripPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewTripPage({ searchParams }: NewTripPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialParkId = typeof resolvedSearchParams.parkId === "string" ? resolvedSearchParams.parkId : undefined;
  const parks = await listParkOptions();

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="New Trip"
          title="วางแผนทริปใหม่"
          description="planner แบบ step-by-step สำหรับ LINE MINI App ใช้กรอกข้อมูลที่จำเป็นต่อการเดินทางจริง พร้อมเตรียมทริปให้พร้อมสำหรับ live safety evaluation"
        />
        <section className="glass-panel rounded-[28px] px-4 py-4 text-sm text-[var(--muted)]">
          Rich Menu entry พร้อมใช้งาน:
          <span className="ml-2 font-semibold text-[var(--foreground)]">วางแผนทริป</span>
          <span className="ml-2 font-mono text-xs text-[var(--brand-strong)]">{buildMiniAppEntryPath("planTrip")}</span>
        </section>
        <TripForm mode="create" parks={parks} initialParkId={initialParkId} />
      </div>
    </AppShell>
  );
}
