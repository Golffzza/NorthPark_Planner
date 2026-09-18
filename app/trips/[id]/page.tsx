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

    return (
      <AppShell>
        <div className="space-y-6">
          <PageHeader
            compact
            eyebrow="รายละเอียดทริป"
            title={`ทริปไป ${trip.park.nameTh}`}
            description="ดูข้อมูลการเดินทาง สภาพอากาศล่าสุด และประเมินความปลอดภัยของทริป"
            actions={<TripStatusBadge status={trip.status} />}
          />

          <section className="soft-card overflow-hidden rounded-[36px]">
            <div className="nature-hero-mesh px-5 py-6 text-white sm:px-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl min-w-0">
                  <p className="text-sm font-medium text-white/72">{trip.park.province}</p>
                  <h2
                    className="mt-2 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight whitespace-nowrap truncate"
                    title={trip.park.nameTh}
                  >
                    {trip.park.nameTh}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-white/80">
                    วางแผนไว้สำหรับวันที่ {formatThaiDate(trip.tripDate)} ออกเดินทางเวลา {trip.departAt}
                  </p>
                </div>

                {latestEvaluation ? (
                  <div className="rounded-[28px] bg-white/14 px-5 py-5 backdrop-blur-sm lg:min-w-[18rem]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/72">Latest Score</p>
                    <div className="mt-4 flex items-center gap-4">
                      <div
                        className="score-ring h-24 w-24"
                        style={{ ["--score-angle" as string]: `${latestEvaluation.totalScore * 3.6}deg` }}
                      >
                        <div className="score-ring-content">
                          <p className="text-2xl font-semibold text-[var(--foreground)]">{latestEvaluation.totalScore}</p>
                          <p className="text-[11px] text-[var(--muted)]">/100</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-base font-semibold text-white">
                          {getEvaluationLevelLabel(latestEvaluation.level)}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-white/76">{latestEvaluation.summary}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 xl:grid-cols-3 sm:px-7">
              <div className="dashboard-card rounded-[24px] px-4 py-4">
                <p className="text-sm text-[var(--muted)]">วันเดินทาง</p>
                <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{formatThaiDate(trip.tripDate)}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">ออกเดินทาง {trip.departAt}</p>
              </div>
              <div className="dashboard-card rounded-[24px] px-4 py-4">
                <p className="text-sm text-[var(--muted)]">จุดเริ่มต้น</p>
                <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{trip.originText}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Lat {formatCoordinate(trip.originLat)} / Lng {formatCoordinate(trip.originLng)}
                </p>
              </div>
              <div className="dashboard-card rounded-[24px] px-4 py-4">
                <p className="text-sm text-[var(--muted)]">รูปแบบการเดินทาง</p>
                <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                  {getTransportModeLabel(trip.transportMode)}
                </p>
              </div>
              <div className="dashboard-card rounded-[24px] px-4 py-4">
                <p className="text-sm text-[var(--muted)]">ผู้เดินทาง</p>
                <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{trip.travelerCount} คน</p>
              </div>
              <div className="dashboard-card rounded-[24px] px-4 py-4">
                <p className="text-sm text-[var(--muted)]">สภาพอากาศของอุทยาน</p>
                <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                  {getWeatherConditionLabel(displayedWeatherCondition)}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{displayedTemperature ?? "ยังไม่มีข้อมูลอุณหภูมิ"}</p>
              </div>
              <div className="dashboard-card rounded-[24px] px-4 py-4">
                <p className="text-sm text-[var(--muted)]">ระยะเวลาเดินทาง</p>
                <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{displayedTravelDuration}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{displayedDistance ?? "ยังไม่มีข้อมูลระยะทาง"}</p>
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-[34px] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <EvaluateLiveTripButton tripId={trip.id} />
              <EvaluateTripButton tripId={trip.id} />
              <Link
                href={`/trips/${trip.id}/edit`}
                className="ghost-button inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
              >
                แก้ไขทริป
              </Link>
              <CancelTripButton tripId={trip.id} />
              {latestEvaluation ? (
                <Link
                  href={`/trips/${trip.id}/result`}
                  className="inline-flex items-center justify-center rounded-full bg-white/84 px-4 py-3 text-sm font-semibold text-[var(--brand-strong)]"
                >
                  ไปหน้า score dashboard
                </Link>
              ) : null}
            </div>
          </section>

          <section id="evaluation-result" className="soft-card rounded-[34px] px-5 py-6 sm:px-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="guide-chip">Latest Evaluation</span>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  ผลประเมินล่าสุด
                </h2>
              </div>
            </div>
            {latestEvaluation ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="deep-card rounded-[30px] px-5 py-5">
                  <p className="text-sm text-white/72">คะแนนรวม</p>
                  <p className="mt-2 text-5xl font-semibold tracking-[-0.05em]">{latestEvaluation.totalScore}/100</p>
                  <p className="mt-2 text-sm font-medium text-white/84">
                    {getEvaluationLevelLabel(latestEvaluation.level)}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-white/78">{latestEvaluation.summary}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="dashboard-card rounded-[24px] px-4 py-4">
                    <p className="text-sm text-[var(--muted)]">คะแนนย่อย</p>
                    <ul className="mt-3 space-y-2 text-sm text-[var(--foreground)]">
                      <li>สภาพอากาศ: {latestEvaluation.weatherScore}</li>
                      <li>ระยะเวลาเดินทาง: {latestEvaluation.durationScore}</li>
                      <li>เวลาเดินทาง: {latestEvaluation.timeScore}</li>
                      <li>ปัจจัยผู้ใช้: {latestEvaluation.userProfileScore}</li>
                    </ul>
                  </div>
                  <div className="dashboard-card rounded-[24px] px-4 py-4">
                    <p className="text-sm text-[var(--muted)]">คำแนะนำเบื้องต้น</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{latestEvaluation.recommendation}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                ยังไม่มีผลประเมินสำหรับทริปนี้ กดปุ่ม &quot;Sync ข้อมูลจริงและประเมิน&quot;
                เพื่อสร้างผลลัพธ์แบบ live ได้ทันที
              </p>
            )}
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
