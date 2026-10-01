import Link from "next/link";
import { notFound } from "next/navigation";

import { CancelTripButton } from "@/components/trips/cancel-trip-button";
import { EvaluationHistoryList } from "@/components/evaluation/evaluation-history-list";
import { FactorBreakdown } from "@/components/evaluation/factor-breakdown";
import { PlanAdjustmentBanner } from "@/components/evaluation/plan-adjustment-banner";
import { RecommendationList } from "@/components/evaluation/recommendation-list";
import { ScoreHeroCard } from "@/components/evaluation/score-hero-card";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { getParkTransitInfo } from "@/lib/data/park-transit-info";
import { getTransportModeLabel, getWeatherConditionLabel } from "@/lib/constants/trip-form-options";
import { buildTripResultViewModel } from "@/lib/presenters/trip-result-view";
import { getTripDetailForCurrentUser, NotFoundError } from "@/lib/services/trip-service";
import { formatThaiDate } from "@/lib/utils/date";

type TripResultPageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

export default async function TripResultPage({ params }: TripResultPageProps) {
  const { id } = await params;

  try {
    const trip = await getTripDetailForCurrentUser(id);

    if (trip.evaluations.length === 0) {
      notFound();
    }

    const resultView = buildTripResultViewModel(trip);
    const displayedWeatherCondition = trip.latestWeatherSnapshot?.weatherCondition ?? trip.weatherCondition;
    const displayedTemperature = formatTemperature(trip.latestWeatherSnapshot?.temperatureC);
    const displayedDistance = formatDistance(trip.latestRouteSnapshot?.distanceMeters);
    const displayedTravelDuration =
      formatTravelDuration(trip.latestRouteSnapshot?.durationSeconds) ?? `${trip.estimatedTravelMinutes} นาที`;

    const transitInfo = getParkTransitInfo(trip.park.nameTh);

    return (
      <AppShell>
        <div className="space-y-6">
          <PageHeader
            compact
            eyebrow="ผลประเมินความปลอดภัย"
            title={`ผลประเมิน: ${trip.park.nameTh}`}
            description="สรุปคะแนนความพร้อม สภาพอากาศล่วงหน้า และคำแนะนำเพื่อการเดินทาง"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/trips/${trip.id}`}
                  className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-emerald-100 bg-slate-100/90 hover:bg-slate-200/90 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 border border-slate-300/80 dark:border-emerald-500/40 backdrop-blur-md shadow-2xs active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  <span>กลับหน้ารายละเอียด</span>
                </Link>
                <Link
                  href={`/trips/${trip.id}/edit`}
                  className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 shadow-sm transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span>แก้ไขทริป</span>
                </Link>
                <CancelTripButton tripId={trip.id} isCancelled={trip.status === "CANCELLED"} variant="compact" />
              </div>
            }
          />

          <ScoreHeroCard
            parkName={resultView.parkName}
            parkProvince={resultView.parkProvince}
            evaluation={resultView.latestEvaluation}
          />

          {/* Actionable Plan Adjustment & Reasoning Banner */}
          <PlanAdjustmentBanner trip={trip} />

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            {/* Left: Modern Trip Snapshot Cards */}
            <div className="soft-card relative overflow-hidden rounded-[32px] sm:rounded-[34px] px-5 py-6 sm:px-7">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 text-sm">
                  📋
                </span>
                <span className="guide-chip">Trip Snapshot</span>
              </div>

              <h2 className="mt-3.5 text-xl sm:text-2xl font-bold font-heading tracking-tight text-[var(--foreground)]">
                ข้อมูลแผนที่ใช้ในการประเมิน
              </h2>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[var(--muted)]">
                สรุปข้อมูลการเดินทางจริงและข้อมูลสภาพอากาศ ณ เวลาที่ทำการประเมิน
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {/* 1. Date Tile */}
                <div className="dashboard-card group relative overflow-hidden rounded-[24px] p-4 transition-all duration-200 hover:border-emerald-500/30">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-emerald-300/80">
                    <span>🗓️</span>
                    <span>วันออกเดินทาง</span>
                  </div>
                  <p className="mt-2 text-base font-bold font-heading text-[var(--foreground)]">
                    {formatThaiDate(trip.tripDate)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">กำหนดการเดินทาง</p>
                </div>

                {/* 2. Departure Time Tile */}
                <div className="dashboard-card group relative overflow-hidden rounded-[24px] p-4 transition-all duration-200 hover:border-emerald-500/30">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-emerald-300/80">
                    <span>⏰</span>
                    <span>เวลาออกเดินทาง</span>
                  </div>
                  <p className="mt-2 text-base font-bold font-heading text-[var(--foreground)]">
                    {trip.departAt} น.
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">เวลาเริ่มออกจากต้นทาง</p>
                </div>

                {/* 3. Weather Tile */}
                <div className="dashboard-card group relative overflow-hidden rounded-[24px] p-4 transition-all duration-200 hover:border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-emerald-300/80">
                      <span>🌤️</span>
                      <span>สภาพอากาศอุทยาน</span>
                    </div>
                    {displayedTemperature ? (
                      <span className="rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold font-heading">
                        {displayedTemperature}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-base font-bold font-heading text-[var(--foreground)] truncate">
                    {getWeatherConditionLabel(displayedWeatherCondition)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {displayedTemperature ? "พยากรณ์อากาศแบบ Live" : "สภาพอากาศที่ระบุ"}
                  </p>
                </div>

                {/* 4. Travel Duration Tile */}
                <div className="dashboard-card group relative overflow-hidden rounded-[24px] p-4 transition-all duration-200 hover:border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-emerald-300/80">
                      <span>🧭</span>
                      <span>ระยะเวลาเดินทาง</span>
                    </div>
                    {displayedDistance ? (
                      <span className="rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30 px-2 py-0.5 text-[10px] font-bold font-heading">
                        {displayedDistance}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-base font-bold font-heading text-[var(--foreground)]">
                    {displayedTravelDuration}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {displayedDistance ? "คำนวณจาก OSRM แผนที่จริง" : "เวลาประมาณการ"}
                  </p>
                </div>

                {/* 5. Transport & Group Tile */}
                <div className="dashboard-card group relative overflow-hidden rounded-[24px] p-4 sm:col-span-2 transition-all duration-200 hover:border-emerald-500/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 dark:bg-white/5 border border-emerald-500/20 text-lg shrink-0">
                        {trip.transportMode === "CAR" ? "🚗" : trip.transportMode === "MOTORCYCLE" ? "🏍️" : "🚌"}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-emerald-300/80">
                          ยานพาหนะ & คณะเดินทาง
                        </p>
                        <p className="mt-0.5 text-base font-bold font-heading text-[var(--foreground)]">
                          {getTransportModeLabel(trip.transportMode)} • {trip.travelerCount} คน
                        </p>
                      </div>
                    </div>

                    {trip.transportMode === "PUBLIC_TRANSPORT" ? (
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold font-heading ${transitInfo.hasDirectPublicTransit ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30" : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"}`}>
                        {transitInfo.hasDirectPublicTransit ? "✓ มีรถโดยสารตรง/สองแถว" : "⚠️ ไม่มีรถประจำทางตรง"}
                      </span>
                    ) : null}
                  </div>
                  {transitInfo.transitDescription ? (
                    <p className="mt-3 text-xs leading-relaxed text-[var(--muted)] border-t border-slate-200/50 dark:border-white/5 pt-2.5">
                      {transitInfo.transitDescription}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Right: Recommendations */}
            <RecommendationList items={resultView.recommendations} />
          </section>

          <FactorBreakdown factors={resultView.factorScores} />

          <EvaluationHistoryList history={resultView.history} />

          {/* Bottom Action Navigation */}
          <section className="soft-card rounded-[28px] p-4 sm:p-5 border border-slate-200/80 dark:border-emerald-500/20 bg-white/90 dark:bg-[#071712]/90 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
                <Link
                  href={`/trips/${trip.id}`}
                  className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-emerald-100 bg-slate-100/90 hover:bg-slate-200/90 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 border border-slate-300/80 dark:border-emerald-500/40 backdrop-blur-md shadow-2xs active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  <span>กลับหน้ารายละเอียด</span>
                </Link>
                <Link
                  href="/trips"
                  className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-emerald-100 bg-slate-100/90 hover:bg-slate-200/90 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 border border-slate-300/80 dark:border-emerald-500/40 backdrop-blur-md shadow-2xs active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z" />
                  </svg>
                  <span>กลับไปทริปของฉัน</span>
                </Link>
              </div>

              <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
                <Link
                  href={`/trips/${trip.id}/edit`}
                  className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 shadow-sm transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span>แก้ไขทริป</span>
                </Link>
                <CancelTripButton tripId={trip.id} isCancelled={trip.status === "CANCELLED"} variant="compact" />
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
