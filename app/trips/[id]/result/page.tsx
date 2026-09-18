import Link from "next/link";
import { notFound } from "next/navigation";

import { CancelTripButton } from "@/components/trips/cancel-trip-button";
import { EvaluationHistoryList } from "@/components/evaluation/evaluation-history-list";
import { FactorBreakdown } from "@/components/evaluation/factor-breakdown";
import { RecommendationList } from "@/components/evaluation/recommendation-list";
import { ScoreHeroCard } from "@/components/evaluation/score-hero-card";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { getWeatherConditionLabel } from "@/lib/constants/trip-form-options";
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
                  className="inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-emerald-100 bg-slate-100/90 hover:bg-slate-200/90 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 border border-slate-300/80 dark:border-emerald-500/40 backdrop-blur-md shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
                >
                  กลับหน้ารายละเอียด
                </Link>
                <Link
                  href={`/trips/${trip.id}/edit`}
                  className="inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 shadow-sm shadow-emerald-950/30 transition-all active:scale-[0.98] cursor-pointer"
                >
                  แก้ไขทริป
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

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="soft-card rounded-[34px] px-5 py-6 sm:px-7">
              <span className="guide-chip">Trip Snapshot</span>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                ข้อมูลแผนที่ใช้ในการประเมิน
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                ค่าด้านล่างคือข้อมูลตั้งต้นจากตัวทริป ส่วนการประเมินแบบ live จะอิง snapshot ล่าสุดที่ sync
                ไว้ก่อนสร้างผลลัพธ์ในแต่ละรอบ
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="dashboard-card rounded-[24px] px-4 py-4">
                  <p className="text-sm text-[var(--muted)]">วันเดินทาง</p>
                  <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                    {formatThaiDate(trip.tripDate)}
                  </p>
                </div>
                <div className="dashboard-card rounded-[24px] px-4 py-4">
                  <p className="text-sm text-[var(--muted)]">เวลาออกเดินทาง</p>
                  <p className="mt-1 text-base font-semibold text-[var(--foreground)]">{trip.departAt}</p>
                </div>
                <div className="dashboard-card rounded-[24px] px-4 py-4">
                  <p className="text-sm text-[var(--muted)]">สภาพอากาศของอุทยาน</p>
                  <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                    {getWeatherConditionLabel(displayedWeatherCondition)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{displayedTemperature ?? "ยังไม่มีข้อมูลอุณหภูมิ"}</p>
                </div>
                <div className="dashboard-card rounded-[24px] px-4 py-4">
                  <p className="text-sm text-[var(--muted)]">ระยะเวลาเดินทาง</p>
                  <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                    {displayedTravelDuration}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{displayedDistance ?? "ยังไม่มีข้อมูลระยะทาง"}</p>
                </div>
              </div>
            </div>

            <RecommendationList items={resultView.recommendations} />
          </section>

          <FactorBreakdown factors={resultView.factorScores} />

          <EvaluationHistoryList history={resultView.history} />
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
