import { getTripStatusLabel } from "@/lib/constants/trip-form-options";

type TripStatusBadgeProps = {
  status: string;
};

const statusTone: Record<string, string> = {
  DRAFT: "bg-slate-100/95 text-slate-700 ring-slate-200",
  EVALUATED: "bg-emerald-100/95 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-rose-100/95 text-rose-700 ring-rose-200",
  COMPLETED: "bg-sky-100/95 text-sky-700 ring-sky-200",
};

export function TripStatusBadge({ status }: TripStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ${
        statusTone[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {getTripStatusLabel(status)}
    </span>
  );
}
