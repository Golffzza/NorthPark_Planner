import Link from "next/link";
import { notFound } from "next/navigation";

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
            eyebrow="Safety Dashboard"
            title={`ผลประเมินทริปไป ${trip.park.nameTh}`}
            description="สรุปคะแนนรวม ระดับความเหมาะสม คะแนนย่อย คำแนะนำ และ timeline การประเมินในหน้าที่ออกแบบเป็น safety score dashboard โดยเฉพาะ"
            actions={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/trips/${trip.id}`}
                  className="ghost-button inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-[var(--foreground)]"
                >
                  กลับไป Trip Detail
                </Link>
                <Link
                  href={`/trips/${trip.id}/edit`}
                  className="glass-button inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
                >
                  แก้ไขทริป
                </Link>
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
