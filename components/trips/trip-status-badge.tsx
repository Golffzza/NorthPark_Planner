import { getTripStatusLabel } from "@/lib/constants/trip-form-options";

type TripStatusBadgeProps = {
  status: string;
};

const statusTone: Record<string, string> = {
  DRAFT: "bg-slate-100/90 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 ring-slate-200/80 dark:ring-slate-700/50",
  EVALUATED: "bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 ring-emerald-200/80 dark:ring-emerald-500/40",
  CANCELLED: "bg-rose-100/90 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 ring-rose-200/80 dark:ring-rose-800/40",
  COMPLETED: "bg-teal-100/90 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 ring-teal-200/80 dark:ring-teal-500/40",
};

export function TripStatusBadge({ status }: TripStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 backdrop-blur-md shadow-2xs ${
        statusTone[status] ?? "bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 ring-slate-200 dark:ring-slate-700/50"
      }`}
    >
      {getTripStatusLabel(status)}
    </span>
  );
}
