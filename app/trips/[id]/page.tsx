import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { CancelTripButton } from "@/components/trips/cancel-trip-button";
import { EvaluateLiveTripButton } from "@/components/trips/evaluate-live-trip-button";
import { EvaluateTripButton } from "@/components/trips/evaluate-trip-button";
import { TripStatusBadge } from "@/components/trips/trip-status-badge";
import {
  getEvaluationLevelLabel,
  getTransportModeLabel,
  getWeatherConditionLabel,
} from "@/lib/constants/trip-form-options";
import { getTripDetailForCurrentUser, NotFoundError } from "@/lib/services/trip-service";
import { formatThaiDate } from "@/lib/utils/date";

type TripDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatCoordinate(value: number | null) {
  return value === null ? "-" : value.toFixed(4);
}

function formatTemperature(value: number | null | undefined) {
  return typeof value === "number" ? `${value.toFixed(1)}°C` : null;
}

function formatDistance(distanceMeters: number | undefined) {
  if (typeof distanceMeters !== "number") {
    return null;
  }

  return `${(distanceMeters / 1000).toFixed(1)} กม.`;
}

function formatTravelDuration(durationSeconds: number | undefined) {
  if (typeof durationSeconds !== "number") {
    return null;
  }

  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${totalMinutes} นาที`;
  }

  if (minutes === 0) {
    return `${hours} ชม.`;
  }

  return `${hours} ชม. ${minutes} นาที`;
}

function getScoreTheme(score: number) {
  if (score >= 80) {
    return {
      strokeColor: "#10b981",
      badgeBg: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40",
      accentText: "text-emerald-800 dark:text-emerald-300",
      dotColor: "bg-emerald-500",
      statusLabel: "เหมาะสมมาก",
    };
  }
  if (score >= 60) {
    return {
      strokeColor: "#06b6d4",
      badgeBg: "bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border-cyan-500/40",
      accentText: "text-cyan-800 dark:text-cyan-300",
      dotColor: "bg-cyan-500",
      statusLabel: "เหมาะสม",
    };
  }
  if (score >= 40) {
    return {
      strokeColor: "#f59e0b",
      badgeBg: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40",
      accentText: "text-amber-800 dark:text-amber-300",
      dotColor: "bg-amber-500",
      statusLabel: "ปานกลาง",
    };
  }
  return {
    strokeColor: "#f43f5e",
    badgeBg: "bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40",
    accentText: "text-rose-800 dark:text-rose-300",
    dotColor: "bg-rose-500",
    statusLabel: "ควรปรับแผน",
  };
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { id } = await params;

  try {
    const trip = await getTripDetailForCurrentUser(id);
    const latestEvaluation = trip.evaluations[0];
    const displayedWeatherCondition = trip.latestWeatherSnapshot?.weatherCondition ?? trip.weatherCondition;
    const displayedTemperature = formatTemperature(trip.latestWeatherSnapshot?.temperatureC);
    const displayedDistance = formatDistance(trip.latestRouteSnapshot?.distanceMeters);
    const displayedTravelDuration =
      formatTravelDuration(trip.latestRouteSnapshot?.durationSeconds) ?? `${trip.estimatedTravelMinutes} นาที`;

    const score = latestEvaluation?.totalScore ?? 0;
    const theme = getScoreTheme(score);
    const gaugeSize = 88;
    const strokeWidth = 7;
    const radius = (gaugeSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progressOffset = circumference - (score / 100) * circumference;

    return (
      <AppShell>
        <div className="space-y-6">
          <PageHeader
            compact
            eyebrow="รายละเอียดทริป"
            title={`ทริป: ${trip.park.nameTh}`}
            description="ดูข้อมูลการเดินทาง สภาพอากาศล่าสุด และประเมินความปลอดภัยของทริป"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/trips"
                  className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-emerald-100 bg-slate-100/90 hover:bg-slate-200/90 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 border border-slate-300/80 dark:border-emerald-500/40 backdrop-blur-md shadow-2xs active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  <span>กลับไปทริปของฉัน</span>
                </Link>
                <TripStatusBadge status={trip.status} />
              </div>
            }
          />

          {/* Hero Card */}
          <section className="relative overflow-hidden rounded-[32px] sm:rounded-[36px] border border-slate-200/80 dark:border-emerald-500/20 bg-white/95 dark:bg-[#071712]/95 shadow-xl shadow-emerald-950/5 dark:shadow-black/50 backdrop-blur-xl">
            {/* Header with gradient mesh */}
            <div className="relative overflow-hidden border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-emerald-900/90 via-teal-950/80 to-slate-950/90 p-6 sm:p-8 text-white">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/20 text-[10px]">
                      📍
                    </span>
                    <span>จังหวัด{trip.park.province}</span>
                  </div>
                  <h1 className="mt-2 text-xl sm:text-2xl lg:text-4xl font-black font-heading tracking-tight text-white leading-tight whitespace-nowrap truncate" title={trip.park.nameTh}>
                    {trip.park.nameTh}
                  </h1>
                  <p className="mt-2 text-xs sm:text-sm text-emerald-100/80 font-medium">
                    📅 วางแผนไว้สำหรับวันที่ {formatThaiDate(trip.tripDate)} • ออกเดินทางเวลา {trip.departAt} น.
                  </p>
                </div>

                {latestEvaluation ? (
                  <div className="rounded-[26px] bg-black/40 border border-white/10 p-4 sm:p-5 backdrop-blur-md lg:min-w-[20rem] shadow-lg">
                    <div className="flex items-center gap-4">
                      {/* SVG Gauge */}
                      <div className="relative shrink-0 flex items-center justify-center">
                        <svg width={gaugeSize} height={gaugeSize} className="rotate-[-90deg]">
                          <circle
                            cx={gaugeSize / 2}
                            cy={gaugeSize / 2}
                            r={radius}
                            stroke="rgba(255,255,255,0.15)"
                            strokeWidth={strokeWidth}
                            className="fill-none"
                          />
                          <circle
                            cx={gaugeSize / 2}
                            cy={gaugeSize / 2}
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
                          <span className="text-xl font-black font-heading text-white leading-none">
                            {score}
                          </span>
                          <span className="text-[10px] font-semibold text-white/60 leading-none mt-0.5">
                            /100
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold font-heading ${theme.badgeBg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${theme.dotColor} animate-pulse`} />
                          {theme.statusLabel}
                        </span>
                        <p className="mt-2 text-xs leading-relaxed text-emerald-100/90 line-clamp-3">
                          {latestEvaluation.summary}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Metric Tiles Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-5 sm:p-7 bg-slate-50/50 dark:bg-black/20">
              <div className="rounded-2xl p-4 bg-white dark:bg-emerald-950/30 border border-slate-200/60 dark:border-emerald-800/30 shadow-2xs">
                <span className="text-xs font-semibold text-slate-600 dark:text-emerald-300/70 flex items-center gap-1.5">
                  <span>📅</span> วันเดินทาง
                </span>
                <p className="mt-1.5 text-sm sm:text-base font-bold font-heading text-slate-800 dark:text-white">
                  {formatThaiDate(trip.tripDate)}
                </p>
                <p className="text-xs text-slate-700 dark:text-emerald-200/60 mt-0.5">ออก {trip.departAt} น.</p>
              </div>

              <div className="rounded-2xl p-4 bg-white dark:bg-emerald-950/30 border border-slate-200/60 dark:border-emerald-800/30 shadow-2xs">
                <span className="text-xs font-semibold text-slate-600 dark:text-emerald-300/70 flex items-center gap-1.5">
                  <span>🚗</span> ยานพาหนะ
                </span>
                <p className="mt-1.5 text-sm sm:text-base font-bold font-heading text-slate-800 dark:text-white truncate">
                  {getTransportModeLabel(trip.transportMode)}
                </p>
                <p className="text-xs text-slate-700 dark:text-emerald-200/60 mt-0.5">ผู้ร่วมทริป {trip.travelerCount} คน</p>
              </div>

              <div className="rounded-2xl p-4 bg-white dark:bg-emerald-950/30 border border-slate-200/60 dark:border-emerald-800/30 shadow-2xs">
                <span className="text-xs font-semibold text-slate-600 dark:text-emerald-300/70 flex items-center gap-1.5">
                  <span>📍</span> จุดเริ่มต้น
                </span>
                <p className="mt-1.5 text-sm sm:text-base font-bold font-heading text-slate-800 dark:text-white truncate">
                  {trip.originText}
                </p>
                <p className="text-xs text-slate-700 dark:text-emerald-200/60 mt-0.5">
                  พิกัด {formatCoordinate(trip.originLat)}, {formatCoordinate(trip.originLng)}
                </p>
              </div>

              <div className="rounded-2xl p-4 bg-white dark:bg-emerald-950/30 border border-slate-200/60 dark:border-emerald-800/30 shadow-2xs">
                <span className="text-xs font-semibold text-slate-600 dark:text-emerald-300/70 flex items-center gap-1.5">
                  <span>⏱️</span> ระยะเวลาเดินทาง
                </span>
                <p className="mt-1.5 text-sm sm:text-base font-bold font-heading text-slate-800 dark:text-white">
                  {displayedTravelDuration}
                </p>
                <p className="text-xs text-slate-700 dark:text-emerald-200/60 mt-0.5">
                  {displayedDistance ?? "คำนวณจาก OSRM"}
                </p>
              </div>

              <div className="rounded-2xl p-4 bg-white dark:bg-emerald-950/30 border border-slate-200/60 dark:border-emerald-800/30 shadow-2xs">
                <span className="text-xs font-semibold text-slate-600 dark:text-emerald-300/70 flex items-center gap-1.5">
                  <span>🌤️</span> สภาพอากาศ
                </span>
                <p className="mt-1.5 text-sm sm:text-base font-bold font-heading text-slate-800 dark:text-white">
                  {getWeatherConditionLabel(displayedWeatherCondition)}
                </p>
                <p className="text-xs text-slate-700 dark:text-emerald-200/60 mt-0.5">
                  {displayedTemperature ?? "อุณหภูมิปกติ"}
                </p>
              </div>

              <div className="rounded-2xl p-4 bg-white dark:bg-emerald-950/30 border border-slate-200/60 dark:border-emerald-800/30 shadow-2xs">
                <span className="text-xs font-semibold text-slate-600 dark:text-emerald-300/70 flex items-center gap-1.5">
                  <span>⏰</span> เวลาทำการอุทยาน
                </span>
                <p className="mt-1.5 text-sm sm:text-base font-bold font-heading text-slate-800 dark:text-white">
                  {trip.park.openTime} - {trip.park.closeTime} น.
                </p>
                <p className="text-xs text-slate-700 dark:text-emerald-200/60 mt-0.5">เปิดให้บริการทุกวัน</p>
              </div>
            </div>
          </section>

          {/* Action Bar */}
          <section className="relative overflow-hidden rounded-[28px] border border-slate-200/80 dark:border-emerald-500/20 bg-white/90 dark:bg-[#071712]/90 p-4 sm:p-5 shadow-sm backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <EvaluateLiveTripButton tripId={trip.id} />
                <EvaluateTripButton tripId={trip.id} />
                {latestEvaluation ? (
                  <Link
                    href={`/trips/${trip.id}/result`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-bold font-heading text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 shadow-sm shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>ดูหน้ารายงานผล & คำแนะนำ</span>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Link>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/trips/${trip.id}/edit`}
                  className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-emerald-100 bg-slate-100 dark:bg-emerald-950/70 hover:bg-slate-200 dark:hover:bg-emerald-900/60 border border-slate-300/80 dark:border-emerald-700/50 shadow-2xs active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span>แก้ไขทริป</span>
                </Link>
                <CancelTripButton tripId={trip.id} variant="compact" />
              </div>
            </div>
          </section>
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
