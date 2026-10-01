import Link from "next/link";

import { CancelTripButton } from "@/components/trips/cancel-trip-button";
import { TripStatusBadge } from "@/components/trips/trip-status-badge";
import { getEvaluationLevelLabel, getTransportModeLabel, getWeatherConditionLabel } from "@/lib/constants/trip-form-options";
import type { TripListDto } from "@/lib/mappers/trip-dto";
import { formatThaiDate } from "@/lib/utils/date";

type TripCardProps = {
  trip: TripListDto;
};

function getScoreTheme(score: number) {
  if (score >= 80) {
    return {
      strokeColor: "#10b981", // emerald-500
      glowColor: "rgba(16, 185, 129, 0.25)",
      badgeBg: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
      cardBg: "from-emerald-950/40 via-teal-950/20 to-emerald-950/30 border-emerald-500/30",
      accentText: "text-emerald-800 dark:text-emerald-300",
      dotColor: "bg-emerald-500",
      statusLabel: "เหมาะสมมาก",
    };
  }
  if (score >= 60) {
    return {
      strokeColor: "#06b6d4", // cyan-500
      glowColor: "rgba(6, 182, 212, 0.25)",
      badgeBg: "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/30",
      cardBg: "from-cyan-950/40 via-slate-950/20 to-cyan-950/30 border-cyan-500/30",
      accentText: "text-cyan-800 dark:text-cyan-300",
      dotColor: "bg-cyan-500",
      statusLabel: "เหมาะสม",
    };
  }
  if (score >= 40) {
    return {
      strokeColor: "#f59e0b", // amber-500
      glowColor: "rgba(245, 158, 11, 0.25)",
      badgeBg: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
      cardBg: "from-amber-950/40 via-slate-950/20 to-amber-950/30 border-amber-500/30",
      accentText: "text-amber-800 dark:text-amber-300",
      dotColor: "bg-amber-500",
      statusLabel: "ปานกลาง",
    };
  }
  return {
    strokeColor: "#f43f5e", // rose-500
    glowColor: "rgba(244, 63, 94, 0.25)",
    badgeBg: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30",
    cardBg: "from-rose-950/40 via-slate-950/20 to-rose-950/30 border-rose-500/30",
    accentText: "text-rose-800 dark:text-rose-300",
    dotColor: "bg-rose-500",
    statusLabel: "ควรปรับแผน",
  };
}

function getTransportIcon(mode: string) {
  switch (mode) {
    case "MOTORCYCLE":
      return "🏍️";
    case "PUBLIC_TRANSPORT":
      return "🚌";
    case "OTHER":
      return "🚐";
    case "CAR":
    default:
      return "🚗";
  }
}

export function TripCard({ trip }: TripCardProps) {
  const evalData = trip.latestEvaluation;
  const score = evalData?.totalScore ?? 0;
  const theme = getScoreTheme(score);

  // SVG Gauge calculations
  const size = 68;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (score / 100) * circumference;

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-[30px] sm:rounded-[34px] border border-slate-200/80 dark:border-emerald-500/20 bg-white/95 dark:bg-[#071712]/95 shadow-md shadow-emerald-950/5 dark:shadow-black/50 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:border-emerald-500/40 hover:-translate-y-1">
      {/* Top Banner & Header */}
      <div>
        <div className="relative overflow-hidden border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50/60 dark:from-emerald-950/60 dark:via-teal-950/30 dark:to-slate-950/40 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 min-w-0">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/15 text-[10px] shrink-0">
                📍
              </span>
              <span className="truncate">จังหวัด{trip.park.province}</span>
            </div>
            <TripStatusBadge status={trip.status} />
          </div>
          <h2
            className="mt-2 text-base sm:text-lg md:text-xl font-extrabold font-heading text-slate-900 dark:text-white leading-snug tracking-tight whitespace-nowrap truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
            title={trip.park.nameTh}
          >
            {trip.park.nameTh}
          </h2>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Key Metric Tiles Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Tile 1: Date & Time */}
            <div className="rounded-2xl p-3 sm:p-3.5 bg-slate-50/80 dark:bg-emerald-950/30 border border-slate-200/60 dark:border-emerald-800/20">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-emerald-300/70 flex items-center gap-1">
                <span>📅</span> วันเดินทาง
              </span>
              <p className="mt-1 text-xs sm:text-sm font-bold font-heading text-slate-800 dark:text-white">
                {formatThaiDate(trip.tripDate)}
              </p>
              <p className="text-[11px] text-slate-700 dark:text-emerald-200/60 mt-0.5">
                ออก {trip.departAt} น.
              </p>
            </div>

            {/* Tile 2: Vehicle & Travelers */}
            <div className="rounded-2xl p-3 sm:p-3.5 bg-slate-50/80 dark:bg-emerald-950/30 border border-slate-200/60 dark:border-emerald-800/20">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-emerald-300/70 flex items-center gap-1">
                <span>{getTransportIcon(trip.transportMode)}</span> ยานพาหนะ
              </span>
              <p className="mt-1 text-xs sm:text-sm font-bold font-heading text-slate-800 dark:text-white truncate">
                {getTransportModeLabel(trip.transportMode)}
              </p>
              <p className="text-[11px] text-slate-700 dark:text-emerald-200/60 mt-0.5">
                ผู้ร่วมทริป {trip.travelerCount} คน
              </p>
            </div>
          </div>

          {/* Evaluation Score Card or Evaluation Prompt */}
          {evalData ? (
            <div
              className={`rounded-[24px] p-4 bg-gradient-to-br ${theme.cardBg} border backdrop-blur-md shadow-xs`}
            >
              <div className="flex items-center gap-4">
                {/* Modern Circular SVG Dial */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <svg width={size} height={size} className="rotate-[-90deg]">
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke="currentColor"
                      strokeWidth={strokeWidth}
                      className="text-slate-200 dark:text-white/10 fill-none"
                    />
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={theme.strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={progressOffset}
                      strokeLinecap="round"
                      className="fill-none transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-base sm:text-lg font-black font-heading text-slate-900 dark:text-white leading-none">
                      {score}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-600 dark:text-white/60 leading-none mt-0.5">
                      /100
                    </span>
                  </div>
                </div>

                {/* Score Details & Summary */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold font-heading ${theme.badgeBg}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${theme.dotColor} animate-pulse`} />
                      {theme.statusLabel}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-800 dark:text-emerald-100/90 leading-relaxed line-clamp-2">
                    {evalData.summary}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] p-4 bg-slate-50/90 dark:bg-emerald-950/20 border border-slate-200/60 dark:border-emerald-800/20 text-center">
              <p className="text-xs font-bold font-heading text-slate-700 dark:text-emerald-200">
                ⚡ ยังไม่มีผลประเมินความปลอดภัย
              </p>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-emerald-300/70">
                เปิดดูข้อมูลเพื่ออัปเดตสภาพอากาศสดและคำนวณคะแนนความพร้อม
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Action Buttons (Matching User Reference Mockup Exactly) */}
      <div className="border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 p-4 sm:p-5 space-y-2.5">
        {/* Top Button: ดูผลลัพธ์ในรูปแบบแผนที่ ✦ */}
        <Link
          href={`/trips/${trip.id}/result`}
          className="w-full h-11 px-4 inline-flex items-center justify-center gap-2 rounded-full text-xs sm:text-sm font-bold font-heading text-white bg-[#00cf8a] hover:bg-[#00be7e] shadow-sm shadow-emerald-950/20 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
        >
          <span>ดูผลลัพธ์ในรูปแบบแผนที่</span>
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
        </Link>

        {/* Bottom Row: 2 Equal Pill Buttons 50/50 */}
        {trip.status !== "CANCELLED" ? (
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href={`/trips/${trip.id}/edit`}
              className="w-full h-11 px-3 inline-flex items-center justify-center gap-2 rounded-full text-xs sm:text-sm font-bold font-heading whitespace-nowrap text-white bg-[#03231a] hover:bg-[#063326] border border-[#00a86b] shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              title="แก้ไขแผนที่"
            >
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              <span>แก้ไขแผนที่</span>
            </Link>
            <CancelTripButton tripId={trip.id} variant="full" />
          </div>
        ) : (
          <div className="w-full h-11 flex items-center justify-center rounded-full bg-rose-950/60 text-xs sm:text-sm font-bold font-heading text-rose-300 border border-rose-800/40">
            แผนที่นี้ถูกลบ/ยกเลิกแล้ว
          </div>
        )}
      </div>
    </article>
  );
}
