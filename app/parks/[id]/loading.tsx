import { AppShell } from "@/components/layout/app-shell";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function ParkDetailLoading() {
  return (
    <AppShell>
      <LoadingSkeleton rows={3} variant="detail" />
    </AppShell>
  );
}
