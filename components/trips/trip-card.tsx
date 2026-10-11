"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { CancelTripButton } from "@/components/trips/cancel-trip-button";
import { TripStatusBadge } from "@/components/trips/trip-status-badge";
import {
  getTransportModeLabel,
} from "@/lib/constants/trip-form-options";
import type { TripListDto } from "@/lib/mappers/trip-dto";
import { formatThaiDate } from "@/lib/utils/date";

import {
  ArrowRight,
  CalendarDays,
  Car,
  CircleAlert,
  CircleCheck,
  Clock3,
  MapPin,
  MoreVertical,
  PencilLine,
  Users,
} from "lucide-react";

type TripCardProps = {
  trip: TripListDto;
};

function getEvaluationTheme(level: string | undefined) {
  switch (level) {
    case "EXCELLENT":
      return {
        badge:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        panel:
          "border-emerald-500/25 bg-emerald-500/[0.06]",
        score:
          "text-emerald-700 dark:text-emerald-300",
        icon:
          "text-emerald-600 dark:text-emerald-400",
        label: "พร้อมตามแผน",
      };

    case "GOOD":
      return {
        badge:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        panel:
          "border-emerald-500/20 bg-emerald-500/[0.05]",
        score:
          "text-emerald-700 dark:text-emerald-300",
        icon:
          "text-emerald-600 dark:text-emerald-400",
        label: "เดินทางได้ แต่ควรตรวจสอบบางจุด",
      };

    case "MODERATE":
      return {
        badge:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        panel:
          "border-amber-500/25 bg-amber-500/[0.06]",
        score:
          "text-amber-700 dark:text-amber-300",
        icon:
          "text-amber-600 dark:text-amber-400",
        label: "ควรตรวจสอบและปรับบางส่วน",
      };

    case "NEEDS_ADJUSTMENT":
      return {
        badge:
          "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
        panel:
          "border-rose-500/25 bg-rose-500/[0.06]",
        score:
          "text-rose-700 dark:text-rose-300",
        icon:
          "text-rose-600 dark:text-rose-400",
        label: "ควรปรับแผนก่อนเดินทาง",
      };

    default:
      return {
        badge:
          "border-slate-300/80 bg-slate-100/80 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
        panel:
          "border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]",
        score:
          "text-slate-700 dark:text-slate-200",
        icon:
          "text-slate-500 dark:text-slate-400",
        label: "ยังไม่มีผลประเมิน",
      };
  }
}

function formatEvaluatedAt(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function TripCardMenu({
  tripId,
  parkName,
}: {
  tripId: string;
  parkName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      className="relative"
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-emerald-300/70 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer active:scale-95"
        title="ตัวเลือกทริป"
        aria-label="ตัวเลือกทริป"
        aria-expanded={isOpen}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-40 rounded-2xl border border-slate-200/90 bg-white/98 p-1.5 shadow-xl shadow-black/10 backdrop-blur-xl z-30 dark:border-emerald-500/30 dark:bg-[#0c2018]/98 dark:shadow-black/50 animate-in fade-in zoom-in-95 duration-150">
          <Link
            href={`/trips/${tripId}/edit`}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-bold font-heading text-slate-700 hover:bg-slate-100 rounded-xl transition-colors dark:text-emerald-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <PencilLine className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-bold font-heading leading-normal">แก้ไขทริป</span>
          </Link>

          <div className="my-1 border-t border-slate-100 dark:border-white/5" />

          <CancelTripButton
            tripId={tripId}
            parkName={parkName}
            variant="menuItem"
            onBeforeOpen={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

export function TripCard({ trip }: TripCardProps) {
  const evaluation = trip.latestEvaluation;
  const theme = getEvaluationTheme(evaluation?.level);
  const evaluatedAt = formatEvaluatedAt(evaluation?.evaluatedAt);

  const isCancelled = trip.status === "CANCELLED";
  const hasCurrentEvaluation =
    trip.status !== "DRAFT" && Boolean(evaluation);
  const hasStaleEvaluation =
    trip.status === "DRAFT" && Boolean(evaluation);

  return (
    <article className="group relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/95 shadow-md shadow-emerald-950/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/35 hover:shadow-xl dark:border-emerald-500/20 dark:bg-[#071712]/95 dark:shadow-black/50">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white p-4 sm:p-5 dark:border-white/5 dark:from-emerald-950/60 dark:via-teal-950/25 dark:to-[#071712]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                จังหวัด{trip.park.province}
              </span>
            </div>

            <h2
              className="mt-2 truncate text-lg font-extrabold font-heading leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400 sm:text-xl"
              title={trip.park.nameTh}
            >
              {trip.park.nameTh}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <TripStatusBadge status={trip.status} />

            {!isCancelled && (
              <TripCardMenu tripId={trip.id} parkName={trip.park.nameTh} />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {/* Trip essentials: keep only what helps identify the plan */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-emerald-800/20 dark:bg-emerald-950/25">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-emerald-300/70">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>วันเดินทาง</span>
            </div>

            <p className="mt-1.5 text-sm font-bold font-heading text-slate-900 dark:text-white">
              {formatThaiDate(trip.tripDate)}
            </p>

            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-600 dark:text-emerald-200/60">
              <Clock3 className="h-3 w-3 shrink-0" />
              <span>ออก {trip.departAt} น.</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-emerald-800/20 dark:bg-emerald-950/25">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-emerald-300/70">
              <Car className="h-3.5 w-3.5 shrink-0" />
              <span>การเดินทาง</span>
            </div>

            <p className="mt-1.5 truncate text-sm font-bold font-heading text-slate-900 dark:text-white">
              {getTransportModeLabel(trip.transportMode)}
            </p>

            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-600 dark:text-emerald-200/60">
              <Users className="h-3 w-3 shrink-0" />
              <span>{trip.travelerCount} คน</span>
            </div>
          </div>
        </div>

        {/* Decision support */}
        {hasStaleEvaluation ? (
          <section className="rounded-[24px] border border-amber-500/25 bg-amber-500/[0.06] p-4">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />

              <div>
                <p className="text-sm font-bold font-heading text-slate-800 dark:text-slate-100">
                  แผนมีการเปลี่ยนแปลง
                </p>

                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  ผลประเมินเดิมไม่ใช่ผลของแผนปัจจุบัน กรุณาประเมินใหม่ก่อนใช้ผลประกอบการเดินทาง
                </p>

                {evaluatedAt ? (
                  <p className="mt-2 text-[10px] text-slate-500 dark:text-emerald-300/50">
                    ผลเดิมประเมินเมื่อ {evaluatedAt}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : hasCurrentEvaluation && evaluation ? (
          <section
            className={`rounded-[24px] border p-4 ${theme.panel}`}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full border border-current/15 bg-white/70 text-center shadow-sm dark:bg-black/15">
                  <span
                    className={`text-xl font-black font-heading leading-none ${theme.score}`}
                  >
                    {evaluation.totalScore}
                  </span>

                  <span className="mt-0.5 text-[9px] font-semibold text-slate-500 dark:text-white/55">
                    /100
                  </span>

                  <span className="mt-1 text-[8px] font-medium leading-tight text-slate-500 dark:text-white/45">
                    คะแนนความพร้อม
                  </span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${theme.badge}`}
                >
                  {evaluation.level === "NEEDS_ADJUSTMENT" ||
                  evaluation.level === "MODERATE" ? (
                    <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <CircleCheck className="h-3.5 w-3.5 shrink-0" />
                  )}

                  <span className="truncate">
                    {theme.label}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-emerald-100/85 sm:text-sm">
                  {evaluation.level === "NEEDS_ADJUSTMENT"
                    ? "มีเงื่อนไขสำคัญที่ควรแก้ก่อนเดินทาง"
                    : evaluation.level === "MODERATE"
                      ? "ควรตรวจสอบรายละเอียดและปรับบางส่วนก่อนออกเดินทาง"
                      : "แผนโดยรวมเดินทางได้ ควรเปิดดูผลประเมินเพื่อเช็กจุดที่ต้องใส่ใจ"}
                </p>

                <p className="mt-2 text-[10px] leading-relaxed text-slate-500 dark:text-emerald-300/50">
                  คะแนนนี้พิจารณาจากสภาพอากาศ ระยะเวลา ช่วงเวลาที่คาดว่าจะถึง และการเข้าถึง
                </p>

                {evaluatedAt ? (
                  <p className="mt-1.5 text-[10px] text-slate-500 dark:text-emerald-300/50">
                    ประเมินล่าสุด {evaluatedAt}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <section className={`rounded-[24px] border p-4 ${theme.panel}`}>
            <div className="flex items-start gap-3">
              <CircleAlert className={`mt-0.5 h-5 w-5 shrink-0 ${theme.icon}`} />

              <div>
                <p className="text-sm font-bold font-heading text-slate-800 dark:text-slate-100">
                  ยังไม่มีผลประเมิน
                </p>

                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  ประเมินแผนเพื่อดูความพร้อม สภาพอากาศ และจุดที่ควรปรับก่อนเดินทาง
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-slate-100 bg-slate-50/60 p-4 dark:border-white/5 dark:bg-black/20 sm:p-5">
        {isCancelled ? (
          <div className="flex h-11 w-full items-center justify-center rounded-full border border-rose-300/60 bg-rose-50 text-xs font-bold font-heading text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/60 dark:text-rose-300 sm:text-sm">
            ทริปนี้ถูกยกเลิกแล้ว
          </div>
        ) : (
          <Link
            href={`/trips/${trip.id}/result`}
            className="group/btn inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-5 text-sm font-bold font-heading text-white shadow-md shadow-emerald-950/20 transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <span>
              {hasStaleEvaluation
                ? "ประเมินใหม่"
                : hasCurrentEvaluation
                  ? "ดูผลประเมิน"
                  : "ประเมินทริป"}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        )}
      </div>
    </article>
  );
}
