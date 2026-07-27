import { AppShell } from "@/components/layout/app-shell";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function TripsLoading() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="glass-panel h-40 animate-pulse rounded-[32px] bg-white/60" />
        <LoadingSkeleton rows={4} />
      </div>
    </AppShell>
  );
}
