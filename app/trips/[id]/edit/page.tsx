import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { TripForm } from "@/components/trips/trip-form";
import { listParkOptions } from "@/lib/services/park-service";
import { getTripDetailForCurrentUser, NotFoundError } from "@/lib/services/trip-service";

type EditTripPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditTripPage({ params }: EditTripPageProps) {
  const { id } = await params;

  try {
    const [trip, parks] = await Promise.all([getTripDetailForCurrentUser(id), listParkOptions()]);

    return (
      <AppShell>
        <div className="space-y-6">
          <TripForm mode="edit" parks={parks} trip={trip} />
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
