import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { TripForm } from "@/components/trips/trip-form";
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
          compact
          eyebrow="วางแผนท่องเที่ยว"
          title="สร้างทริปใหม่"
          description="กรอกข้อมูลจุดเริ่มต้น วันเดินทาง และพาหนะ เพื่อคำนวณความพร้อมและความปลอดภัย"
        />
        <TripForm mode="create" parks={parks} initialParkId={initialParkId} />
      </div>
    </AppShell>
  );
}
