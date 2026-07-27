import Link from "next/link";

import { TripStatusBadge } from "@/components/trips/trip-status-badge";
import { getEvaluationLevelLabel } from "@/lib/constants/trip-form-options";
import type { TripListDto } from "@/lib/mappers/trip-dto";
import { formatThaiDate } from "@/lib/utils/date";

type TripCardProps = {
  trip: TripListDto;
};

export function TripCard({ trip }: TripCardProps) {
  return (
    <article className="soft-card overflow-hidden rounded-[34px]">
      <div className="nature-hero-mesh px-5 py-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/76">
              Travel Pass
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{trip.park.nameTh}</h2>
            <p className="mt-2 text-sm text-white/74">{trip.park.province}</p>
          </div>
          <TripStatusBadge status={trip.status} />
        </div>
      </div>

      <div className="ticket-divider space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="dashboard-card rounded-[24px] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">วันเดินทาง</p>
            <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{formatThaiDate(trip.tripDate)}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">ออกเดินทาง {trip.departAt}</p>
          </div>
          <div className="dashboard-card rounded-[24px] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">ผู้เดินทาง</p>
            <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{trip.travelerCount} คน</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{trip.originText}</p>
          </div>
        </div>

        {trip.latestEvaluation ? (
          <div className="deep-card rounded-[28px] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/72">Latest Safety Score</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{trip.latestEvaluation.totalScore}/100</p>
                <p className="mt-1 text-sm font-medium text-white/82">
                  {getEvaluationLevelLabel(trip.latestEvaluation.level)}
                </p>
              </div>
              <div
                className="score-ring h-20 w-20"
                style={{ ["--score-angle" as string]: `${trip.latestEvaluation.totalScore * 3.6}deg` }}
              >
                <div className="score-ring-content">
                  <p className="text-xl font-semibold text-[var(--foreground)]">{trip.latestEvaluation.totalScore}</p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-7 text-white/78">{trip.latestEvaluation.summary}</p>
          </div>
        ) : (
          <div className="dashboard-card rounded-[24px] px-4 py-4">
            <p className="text-sm font-medium text-[var(--foreground)]">ยังไม่มีผลประเมินล่าสุด</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              เปิดดู trip dashboard เพื่อ sync ข้อมูลจริงและประเมินความเหมาะสมก่อนออกเดินทาง
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Link
            href={`/trips/${trip.id}`}
            className="glass-button inline-flex flex-1 items-center justify-center rounded-full px-4 py-3 text-sm font-semibold"
          >
            เปิดบัตรทริป
          </Link>
          <Link
            href={`/trips/${trip.id}/edit`}
            className="ghost-button inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
          >
            แก้ไข
          </Link>
        </div>
      </div>
    </article>
  );
}
