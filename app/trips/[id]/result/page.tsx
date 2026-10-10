//* ./app/trips/[id]/result/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";

import { CancelTripButton } from "@/components/trips/cancel-trip-button";
import { EvaluateLiveTripButton } from "@/components/trips/evaluate-live-trip-button";
import { EvaluationHistoryList } from "@/components/evaluation/evaluation-history-list";
import { FactorBreakdown } from "@/components/evaluation/factor-breakdown";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";

import {
  getTransportModeLabel,
  getWeatherConditionLabel,
} from "@/lib/constants/trip-form-options";

import { buildTripResultViewModel } from "@/lib/presenters/trip-result-view";
import { getTripResultSnapshotData } from "@/lib/presenters/trip-result-snapshot-data";

import {
  getTripDetailForCurrentUser,
  NotFoundError,
} from "@/lib/services/trip-service";

import { formatThaiDate } from "@/lib/utils/date";

import {
  ArrowLeft,
  CalendarDays,
  Car,
  ChevronDown,
  CircleCheck,
  CircleX,
  Clock,
  CloudRain,
  Route,
  TriangleAlert,
} from "lucide-react";

type TripResultPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type FactorKey =
  | "weather"
  | "duration"
  | "time"
  | "userProfile";

type FactorStatus =
  | "GOOD"
  | "CAUTION"
  | "RISK";

type FactorInsight = {
  key: FactorKey;
  label: string;
  score: number;
  status: FactorStatus;
  reason: string;
};

type ConstraintInsight = {
  code: string;
  severity: "BLOCKING" | "WARNING";
  message: string;
};

const FACTOR_LABELS: Record<
  FactorKey,
  string
> = {
  weather: "สภาพอากาศ",
  duration: "ระยะเวลาเดินทาง",
  time: "ช่วงเวลาที่คาดว่าจะถึง",
  userProfile: "การเข้าถึงและพาหนะ",
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseFactors(
  value: unknown,
): FactorInsight[] {
  if (!isRecord(value)) {
    return [];
  }

  const keys: FactorKey[] = [
    "weather",
    "duration",
    "time",
    "userProfile",
  ];

  return keys.flatMap((key) => {
    const raw = value[key];

    if (!isRecord(raw)) {
      return [];
    }

    const score =
      typeof raw.score === "number"
        ? raw.score
        : null;

    const reason =
      typeof raw.reason === "string"
        ? raw.reason
        : null;

    const status =
      raw.status === "GOOD" ||
      raw.status === "CAUTION" ||
      raw.status === "RISK"
        ? raw.status
        : null;

    if (
      score === null ||
      reason === null ||
      status === null
    ) {
      return [];
    }

    return [
      {
        key,
        label: FACTOR_LABELS[key],
        score,
        status,
        reason,
      },
    ];
  });
}

function parseConstraints(
  value: unknown,
): ConstraintInsight[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    if (
      typeof item.code !== "string" ||
      typeof item.message !== "string" ||
      (
        item.severity !== "BLOCKING" &&
        item.severity !== "WARNING"
      )
    ) {
      return [];
    }

    return [
      {
        code: item.code,
        severity: item.severity,
        message: item.message,
      },
    ];
  });
}

function formatTemperature(
  value: number | null | undefined,
) {
  return typeof value === "number"
    ? `${value.toFixed(1)}°C`
    : null;
}

function formatDistance(
  distanceMeters: number | undefined,
) {
  if (
    typeof distanceMeters !== "number"
  ) {
    return null;
  }

  return `${(
    distanceMeters / 1000
  ).toFixed(1)} กม.`;
}

function formatTravelDuration(
  durationSeconds: number | undefined,
) {
  if (
    typeof durationSeconds !== "number"
  ) {
    return null;
  }

  const totalMinutes = Math.max(
    1,
    Math.round(durationSeconds / 60),
  );

  const hours =
    Math.floor(totalMinutes / 60);

  const minutes =
    totalMinutes % 60;

  if (hours === 0) {
    return `${totalMinutes} นาที`;
  }

  if (minutes === 0) {
    return `${hours} ชม.`;
  }

  return `${hours} ชม. ${minutes} นาที`;
}

function formatEvaluationTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "th-TH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function getStatusLabel(
  level: string,
  canProceed: boolean,
) {
  if (!canProceed) {
    return "ควรปรับแผนก่อนเดินทาง";
  }

  switch (level) {
    case "EXCELLENT":
      return "พร้อมตามแผน";

    case "GOOD":
      return "เดินทางได้ แต่ควรตรวจสอบบางจุด";

    case "MODERATE":
      return "ควรปรับบางส่วนก่อนเดินทาง";

    default:
      return "ควรตรวจสอบแผนอีกครั้ง";
  }
}

function getStatusClasses(
  canProceed: boolean,
  level: string,
) {
  if (!canProceed) {
    return {
      badge:
        "border-rose-500/30 bg-rose-500/10 text-rose-300",
    };
  }

  if (
    level === "EXCELLENT" ||
    level === "GOOD"
  ) {
    return {
      badge:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    };
  }

  return {
    badge:
      "border-amber-500/30 bg-amber-500/10 text-amber-300",
  };
}

export default async function TripResultPage({
  params,
}: TripResultPageProps) {
  const { id } = await params;

  try {
    const trip =
      await getTripDetailForCurrentUser(
        id,
      );

    const hasPreviousEvaluation =
      trip.evaluations.length > 0;

    const evaluationIsStale =
      trip.status === "DRAFT" &&
      hasPreviousEvaluation;

    if (evaluationIsStale) {
      const staleResultView =
        buildTripResultViewModel(trip);

      return (
        <AppShell>
          <div className="space-y-6">
            <PageHeader
              compact
              eyebrow="ผลประเมินทริป"
              title={`ทริป: ${trip.park.nameTh}`}
              description="แผนนี้มีการเปลี่ยนแปลงหลังจากการประเมินครั้งล่าสุด"
              actions={
                <Link
                  href="/trips"
                  className="ghost-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span>กลับไปทริปของฉัน</span>
                </Link>
              }
            />

            <section className="soft-card rounded-[32px] p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <TriangleAlert className="mt-1 h-6 w-6 shrink-0 text-amber-400" />

                <div className="min-w-0">
                  <span className="guide-chip">
                    ต้องประเมินใหม่
                  </span>

                  <h1 className="mt-4 text-2xl font-bold font-heading text-[var(--foreground)]">
                    แผนมีการเปลี่ยนแปลง
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
                    ผลประเมินเดิมสร้างจากข้อมูลก่อนแก้ไขทริป จึงไม่ควรใช้เป็นผลปัจจุบัน
                    กรุณาอัปเดตข้อมูลสภาพอากาศ เส้นทาง และช่วงเวลา แล้วประเมินแผนใหม่อีกครั้ง
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <EvaluateLiveTripButton
                      tripId={trip.id}
                      label="อัปเดตข้อมูลและประเมินใหม่"
                    />

                    <Link
                      href={`/trips/${trip.id}/edit`}
                      className="ghost-button inline-flex items-center rounded-full px-4 py-3 text-sm font-semibold"
                    >
                      แก้ไขแผน
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <details className="soft-card group rounded-[28px] p-4 sm:p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-[var(--foreground)]">
                    ดูประวัติการประเมินเดิม
                  </p>

                  <p className="mt-1 text-xs text-[var(--muted)]">
                    ผลเหล่านี้เป็นประวัติก่อนแก้ไขแผน
                  </p>
                </div>

                <ChevronDown className="h-5 w-5 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" />
              </summary>

              <div className="mt-5">
                <EvaluationHistoryList
                  history={staleResultView.history}
                />
              </div>
            </details>
          </div>
        </AppShell>
      );
    }

    if (
      trip.evaluations.length === 0
    ) {
      return (
        <AppShell>
          <div className="space-y-6">
            <PageHeader
              compact
              eyebrow="ผลประเมินทริป"
              title={`ทริป: ${trip.park.nameTh}`}
              description="แผนถูกบันทึกแล้ว แต่ยังไม่มีผลประเมิน"
              actions={
                <Link
                  href="/trips"
                  className="ghost-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span>กลับไปทริปของฉัน</span>
                </Link>
              }
            />

            <section className="soft-card rounded-[32px] p-6 sm:p-8">
              <span className="guide-chip">
                รอประเมิน
              </span>

              <h1 className="mt-4 text-2xl font-bold font-heading text-[var(--foreground)]">
                ทริปนี้ยังไม่มีผลประเมิน
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
                อัปเดตข้อมูลสภาพอากาศ
                เส้นทาง และช่วงเวลาล่าสุด
                เพื่อให้ระบบประเมินแผนนี้
              </p>

              {trip.status !==
              "CANCELLED" ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  <EvaluateLiveTripButton
                    tripId={trip.id}
                    label="อัปเดตข้อมูลและประเมิน"
                  />

                  <Link
                    href={`/trips/${trip.id}/edit`}
                    className="ghost-button inline-flex items-center rounded-full px-4 py-3 text-sm font-semibold"
                  >
                    แก้ไขแผน
                  </Link>
                </div>
              ) : (
                <p className="mt-4 text-sm text-[var(--muted)]">
                  ทริปนี้ถูกยกเลิกแล้ว
                </p>
              )}
            </section>
          </div>
        </AppShell>
      );
    }

    const resultView =
      buildTripResultViewModel(trip);

    const latestEvaluation =
      trip.evaluations[0];

    const factors =
      parseFactors(
        latestEvaluation.factors,
      );

    const constraints =
      parseConstraints(
        latestEvaluation.constraints,
      );

    const canProceed =
      latestEvaluation.canProceed ??
      true;

    const blockingConstraints =
      constraints.filter(
        (item) =>
          item.severity === "BLOCKING",
      );

    const warningConstraints =
      constraints.filter(
        (item) =>
          item.severity === "WARNING",
      );

    const attentionFactors =
      factors
        .filter(
          (item) =>
            item.status !== "GOOD",
        )
        .sort(
          (a, b) =>
            a.score - b.score,
        );

    const goodFactors =
      factors
        .filter(
          (item) =>
            item.status === "GOOD",
        )
        .sort(
          (a, b) =>
            b.score - a.score,
        );

    const snapshotData = getTripResultSnapshotData(trip, latestEvaluation);
    const provenanceUnavailable =
      !latestEvaluation.weatherSnapshotId ||
      !latestEvaluation.routeSnapshotId ||
      !latestEvaluation.sunsetSnapshotId;

    const displayedWeatherCondition = snapshotData.weatherCondition;

    const displayedTemperature =
      formatTemperature(
        snapshotData.temperatureC,
      );

    const displayedDistance =
      formatDistance(
        snapshotData.distanceMeters ?? undefined,
      );

    const displayedTravelDuration =
      formatTravelDuration(
        snapshotData.durationSeconds ?? undefined,
      ) ??
      (snapshotData.fallbackTravelMinutes === null
        ? "ไม่มีข้อมูลเวลาเดินทางของผลประเมินนี้"
        : `${snapshotData.fallbackTravelMinutes} นาที`);

    const statusLabel =
      getStatusLabel(
        latestEvaluation.level,
        canProceed,
      );

    const statusClasses =
      getStatusClasses(
        canProceed,
        latestEvaluation.level,
      );

    const explanationHeadline =
      latestEvaluation
        .explanationHeadline ??
      statusLabel;

    const explanationText =
      latestEvaluation
        .explanationText ??
      latestEvaluation.summary;

    return (
      <AppShell>
        <div className="space-y-5 sm:space-y-6">
          <PageHeader
            compact
            eyebrow="ผลประเมินทริป"
            title={trip.park.nameTh}
            description="ดูความพร้อม จุดที่ควรใส่ใจ และข้อมูลสำคัญก่อนเดินทาง"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/trips"
                  className="ghost-button inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span>ทริปของฉัน</span>
                </Link>

                <Link
                  href={`/trips/${trip.id}/edit`}
                  className="inline-flex h-10 items-center rounded-full bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
                >
                  แก้ไขทริป
                </Link>

                <CancelTripButton
                  tripId={trip.id}
                  isCancelled={
                    trip.status ===
                    "CANCELLED"
                  }
                  variant="compact"
                />
              </div>
            }
          />

          {/* HERO — decision first */}
          <section className="soft-card overflow-hidden rounded-[34px] p-5 sm:p-7 lg:p-8">
            <div className="grid items-center gap-7 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="flex justify-center lg:justify-start">
                <div
                  className="flex h-44 w-44 items-center justify-center rounded-full p-[12px]"
                  style={{
                    background: `conic-gradient(
                      currentColor ${latestEvaluation.totalScore}%,
                      rgba(148,163,184,0.15) 0
                    )`,
                  }}
                >
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[var(--background)]">
                    <span className="text-5xl font-black font-heading text-[var(--foreground)]">
                      {
                        latestEvaluation.totalScore
                      }
                    </span>

                    <span className="mt-1 text-xs font-medium text-[var(--muted)]">
                      จาก 100 คะแนน
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClasses.badge}`}
                >
                  {statusLabel}
                </span>

                <h1 className="mt-4 max-w-3xl text-2xl font-bold leading-tight font-heading text-[var(--foreground)] sm:text-3xl">
                  {explanationHeadline}
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                  {explanationText}
                </p>

                <p className="mt-4 text-xs text-[var(--muted)]">
                  ประเมินล่าสุด{" "}
                  {formatEvaluationTime(
                    latestEvaluation.evaluatedAt,
                  )}
                </p>

                {trip.status !==
                "CANCELLED" ? (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <EvaluateLiveTripButton
                      tripId={trip.id}
                      label="อัปเดตข้อมูลและประเมินใหม่"
                    />

                    <Link
                      href={`/trips/${trip.id}/edit`}
                      className="ghost-button inline-flex items-center rounded-full px-4 py-3 text-sm font-semibold"
                    >
                      ปรับแผน
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {/* WHAT USER NEEDS TO KNOW */}
          <section className="soft-card rounded-[32px] p-5 sm:p-7">
            <div>
              <span className="guide-chip">
                ก่อนออกเดินทาง
              </span>

              <h2 className="mt-3 text-xl font-bold font-heading text-[var(--foreground)] sm:text-2xl">
                สิ่งที่ควรรู้จากผลประเมิน
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                เน้นเฉพาะจุดที่มีผลต่อแผนนี้
                ไม่ต้องไล่อ่านคะแนนทั้งหมด
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              {blockingConstraints.map(
                (item) => (
                  <div
                    key={item.code}
                    className="rounded-[24px] border border-rose-500/30 bg-rose-500/10 p-4"
                  >
                    <div className="flex gap-3">
                      <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />

                      <div>
                        <p className="font-bold text-rose-200">
                          ต้องปรับแผนก่อนเดินทาง
                        </p>

                        <p className="mt-1 text-sm leading-relaxed text-rose-100/80">
                          {item.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ),
              )}

              {warningConstraints.map(
                (item) => (
                  <div
                    key={item.code}
                    className="rounded-[24px] border border-amber-500/30 bg-amber-500/10 p-4"
                  >
                    <div className="flex gap-3">
                      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />

                      <div>
                        <p className="font-bold text-amber-200">
                          จุดที่ควรตรวจสอบ
                        </p>

                        <p className="mt-1 text-sm leading-relaxed text-amber-100/80">
                          {item.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ),
              )}

              {attentionFactors
                .slice(0, 2)
                .map((factor) => (
                  <div
                    key={factor.key}
                    className="rounded-[24px] border border-amber-500/20 bg-amber-500/[0.06] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />

                        <div>
                          <p className="font-bold text-[var(--foreground)]">
                            {factor.label}
                          </p>

                          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                            {factor.reason}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300">
                        {factor.score}/100
                      </span>
                    </div>
                  </div>
                ))}

              {goodFactors
                .slice(0, 2)
                .map((factor) => (
                  <div
                    key={factor.key}
                    className="rounded-[24px] border border-emerald-500/20 bg-emerald-500/[0.05] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                      <div>
                        <p className="font-bold text-[var(--foreground)]">
                          {factor.label}
                        </p>

                        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                          {factor.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

              {constraints.length ===
                0 && (
                <div className="rounded-[24px] border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
                  <div className="flex items-start gap-3">
                    <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                    <div>
                      <p className="font-bold text-[var(--foreground)]">
                        ไม่มีข้อจำกัดที่ขัดขวางการเดินทาง
                      </p>

                      <p className="mt-1 text-sm text-[var(--muted)]">
                        จากข้อมูลที่ใช้ประเมินในรอบล่าสุด
                        ยังไม่พบเงื่อนไขที่ทำให้ต้องหยุดแผนการเดินทาง
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* TRIP ESSENTIALS */}
          <section className="soft-card rounded-[32px] p-5 sm:p-7">
            <div>
              <span className="guide-chip">
                ข้อมูลทริป
              </span>

              <h2 className="mt-3 text-xl font-bold font-heading text-[var(--foreground)]">
                {provenanceUnavailable
                  ? "ข้อมูลทริปที่บันทึกไว้"
                  : "ข้อมูลสำคัญที่ใช้ประเมิน"}
              </h2>

              {provenanceUnavailable ? (
                <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                  ผลประเมินนี้ไม่มีข้อมูลอ้างอิง snapshot ครบทุกชนิด ค่าอากาศหรือเวลาเดินทางที่แสดงจากทริปอาจไม่ใช่ค่าที่ใช้คำนวณผลเดิม
                </p>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="dashboard-card rounded-[22px] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span>วันเดินทาง</span>
                </div>

                <p className="mt-2 font-bold text-[var(--foreground)]">
                  {formatThaiDate(
                    trip.tripDate,
                  )}
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  ออก {trip.departAt} น.
                </p>
              </div>

              <div className="dashboard-card rounded-[22px] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                  <Route className="h-4 w-4 shrink-0" />
                  <span>เวลาเดินทาง</span>
                </div>

                <p className="mt-2 font-bold text-[var(--foreground)]">
                  {
                    displayedTravelDuration
                  }
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  {displayedDistance ??
                    "ระยะทางไม่มีข้อมูล"}
                </p>
              </div>

              <div className="dashboard-card rounded-[22px] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                  <CloudRain className="h-4 w-4 shrink-0" />
                  <span>สภาพอากาศ</span>
                </div>

                <p className="mt-2 font-bold text-[var(--foreground)]">
                  {displayedWeatherCondition
                    ? getWeatherConditionLabel(displayedWeatherCondition)
                    : "ไม่มีข้อมูลอากาศของผลประเมินนี้"}
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  {displayedTemperature ??
                    "ไม่มีข้อมูลอุณหภูมิ"}
                </p>
              </div>

              <div className="dashboard-card rounded-[22px] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                  <Car className="h-4 w-4 shrink-0" />
                  <span>การเดินทาง</span>
                </div>

                <p className="mt-2 font-bold text-[var(--foreground)]">
                  {getTransportModeLabel(
                    trip.transportMode,
                  )}
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  {trip.travelerCount} คน
                </p>
              </div>

              <div className="dashboard-card rounded-[22px] p-4 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>เวลาอุทยาน</span>
                </div>

                <p className="mt-2 font-bold text-[var(--foreground)]">
                  {trip.park.openTime}–
                  {trip.park.closeTime} น.
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  เวลาที่ใช้ในการประเมิน
                </p>
              </div>
            </div>
          </section>

          {/* DETAILS — collapsed */}
          <section className="space-y-3">
            <details className="soft-card group rounded-[28px] p-4 sm:p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-[var(--foreground)]">
                    ดูรายละเอียดคะแนนทั้ง
                    4 ปัจจัย
                  </p>

                  <p className="mt-1 text-xs text-[var(--muted)]">
                    เปิดดูคะแนนและเหตุผลของแต่ละปัจจัย
                  </p>
                </div>

                <ChevronDown className="h-5 w-5 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" />
              </summary>

              <div className="mt-5">
                <FactorBreakdown
                  factors={
                    resultView.factorScores
                  }
                />
              </div>
            </details>

            <details className="soft-card group rounded-[28px] p-4 sm:p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-[var(--foreground)]">
                    ประวัติการประเมิน
                  </p>

                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {
                      resultView.history
                        .length
                    }{" "}
                    ครั้ง
                  </p>
                </div>

                <ChevronDown className="h-5 w-5 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" />
              </summary>

              <div className="mt-5">
                <EvaluationHistoryList
                  history={
                    resultView.history
                  }
                />
              </div>
            </details>
          </section>
        </div>
      </AppShell>
    );
  } catch (error) {
    if (
      error instanceof NotFoundError
    ) {
      notFound();
    }

    throw error;
  }
}
