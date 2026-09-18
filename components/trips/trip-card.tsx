import Link from "next/link";

import { CancelTripButton } from "@/components/trips/cancel-trip-button";
import { TripStatusBadge } from "@/components/trips/trip-status-badge";
import { getEvaluationLevelLabel } from "@/lib/constants/trip-form-options";
import type { TripListDto } from "@/lib/mappers/trip-dto";
import { formatThaiDate } from "@/lib/utils/date";

type TripCardProps = {
  trip: TripListDto;
};

export function TripCard({ trip }: TripCardProps) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-emerald-500/20 shadow-md shadow-emerald-950/5 backdrop-blur-xl bg-white/90 dark:bg-[#0a1e17]/90 transition-all duration-200 hover:-translate-y-0.5">
      <div className="nature-hero-mesh px-5 py-4 text-white border-b border-white/10 dark:border-emerald-800/20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              TRAVEL PASS
            </span>
            <h2
              className="mt-1 text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-snug break-words"
              title={trip.park.nameTh}
            >
              {trip.park.nameTh}
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-emerald-200/70 font-medium">{trip.park.province}</p>
          </div>
          <TripStatusBadge status={trip.status} />
        </div>
      </div>

      <div className="space-y-3.5 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl p-3 bg-slate-50/90 dark:bg-emerald-950/40 border border-slate-200/60 dark:border-emerald-800/30">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-emerald-300/70">วันเดินทาง</p>
            <p className="mt-1 text-sm sm:text-base font-bold text-slate-800 dark:text-white">{formatThaiDate(trip.tripDate)}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-emerald-200/70">ออกเดินทาง {trip.departAt}</p>
          </div>
          <div className="rounded-2xl p-3 bg-slate-50/90 dark:bg-emerald-950/40 border border-slate-200/60 dark:border-emerald-800/30">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-emerald-300/70">ผู้เดินทาง</p>
            <p className="mt-1 text-sm sm:text-base font-bold text-slate-800 dark:text-white">{trip.travelerCount} คน</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-emerald-200/70 truncate">{trip.originText}</p>
          </div>
        </div>

        {trip.latestEvaluation ? (
          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0d2a21] to-[#071913] border border-emerald-500/20 text-white shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80">คะแนนความปลอดภัยล่าสุด</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-white">{trip.latestEvaluation.totalScore}<span className="text-sm font-normal text-emerald-200/70">/100</span></p>
                <p className="mt-0.5 text-xs font-semibold text-emerald-300">
                  {getEvaluationLevelLabel(trip.latestEvaluation.level)}
                </p>
              </div>
              <div
                className="score-ring h-16 w-16"
                style={{ ["--score-angle" as string]: `${trip.latestEvaluation.totalScore * 3.6}deg` }}
              >
                <div className="score-ring-content">
                  <p className="text-base font-extrabold text-white">{trip.latestEvaluation.totalScore}</p>
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-emerald-100/80">{trip.latestEvaluation.summary}</p>
          </div>
        ) : (
          <div className="rounded-2xl p-3.5 bg-slate-50/90 dark:bg-emerald-950/40 border border-slate-200/60 dark:border-emerald-800/30">
            <p className="text-xs font-bold text-slate-700 dark:text-emerald-200">ยังไม่มีผลประเมินล่าสุด</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-emerald-200/70 leading-relaxed">
              เปิดดูข้อมูลเพื่ออัปเดตสภาพอากาศและประเมินความพร้อมก่อนออกเดินทาง
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Link
            href={`/trips/${trip.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-sm shadow-emerald-950/20 active:scale-95 transition-all"
          >
            <span>เปิดบัตรทริป</span>
            <span>→</span>
          </Link>

          {trip.status !== "CANCELLED" ? (
            <>
              <Link
                href={`/trips/${trip.id}/edit`}
                className="inline-flex items-center justify-center rounded-full px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-emerald-200 bg-slate-100 dark:bg-emerald-950/60 hover:bg-slate-200 dark:hover:bg-emerald-900/60 border border-slate-200/80 dark:border-emerald-800/40 active:scale-95 transition-all"
              >
                แก้ไข
              </Link>
              <CancelTripButton tripId={trip.id} variant="compact" />
            </>
          ) : (
            <span className="inline-flex items-center rounded-full bg-rose-100/80 dark:bg-rose-950/60 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40">
              ยกเลิกแล้ว
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
