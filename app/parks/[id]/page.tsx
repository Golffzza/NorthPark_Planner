import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { AttractionList } from "@/components/parks/attraction-list";
import { ParkBottomNavigation } from "@/components/parks/park-bottom-navigation";
import { ParkDetailHero } from "@/components/parks/park-detail-hero";
import { ParkFeeCard } from "@/components/parks/park-fee-card";
import { ParkMapCard } from "@/components/parks/park-map-card";
import { WarningList } from "@/components/parks/warning-list";
import { getParkDetail, NotFoundError } from "@/lib/services/park-service";

type ParkDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ParkDetailPage({ params }: ParkDetailPageProps) {
  const { id } = await params;

  try {
    const park = await getParkDetail(id);

    return (
      <AppShell>
        <div className="space-y-6">
          <ParkDetailHero park={park} />
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <AttractionList attractions={park.attractions} />
            <WarningList warnings={park.warnings} />
          </div>
          <ParkFeeCard park={park} />
          <ParkMapCard park={park} />
          <ParkBottomNavigation parkId={park.id} />
        </div>
      </AppShell>
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }
}
