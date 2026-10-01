import Link from "next/link";
import { getParkTransitInfo } from "@/lib/data/park-transit-info";
import { getTransportModeLabel, getWeatherConditionLabel } from "@/lib/constants/trip-form-options";
import type { TripDetailDto } from "@/lib/mappers/trip-dto";

type PlanAdjustmentBannerProps = {
  trip: TripDetailDto;
};

type AdjustmentReason = {
  type: "TRANSPORT" | "TIME" | "WEATHER" | "DURATION" | "READY";
  severity: "DANGER" | "WARNING" | "INFO" | "SUCCESS";
  icon: string;
  badgeLabel: string;
  headline: string;
  recommendedAction: string;
  reasonText: string;
  impactLevel: string;
  editSuggestion?: string;
};

export function analyzePlanAdjustment(trip: TripDetailDto): AdjustmentReason {
  const latestEvaluation = trip.evaluations[0];
  const weatherCondition = trip.latestWeatherSnapshot?.weatherCondition ?? trip.weatherCondition;
  const transitInfo = getParkTransitInfo(trip.park.nameTh);
  const travelDurationMinutes = trip.latestRouteSnapshot
    ? Math.round(trip.latestRouteSnapshot.durationSeconds / 60)
    : trip.estimatedTravelMinutes;

  // Calculate estimated arrival time
  const [departHour, departMin] = trip.departAt.split(":").map(Number);
  const totalDepartMinutes = (departHour || 0) * 60 + (departMin || 0);
  const arrivalMinutes = totalDepartMinutes + travelDurationMinutes;
  const arrivalHour = Math.floor((arrivalMinutes / 60) % 24);
  const arrivalMin = arrivalMinutes % 60;
  const arrivalTimeStr = `${String(arrivalHour).padStart(2, "0")}:${String(arrivalMin).padStart(2, "0")}`;

  // 1. High Risk: Extreme Weather (STORM / HEAVY_RAIN)
  if (weatherCondition === "STORM" || weatherCondition === "HEAVY_RAIN") {
    return {
      type: "WEATHER",
      severity: "DANGER",
      icon: "⛈️",
      badgeLabel: "ความเสี่ยงสภาพอากาศสูง",
      headline: "แนะนำให้เลื่อนวันเดินทาง หรือหลีกเลี่ยงการขึ้นยอดดอย",
      recommendedAction: "ควรพิจารณาปรับเปลี่ยนวันเดินทาง หรือเลี่ยงกิจกรรมเดินป่า/เที่ยวน้ำตก",
      reasonText: `เนื่องจากระบบตรวจพบสภาพอากาศ "${getWeatherConditionLabel(weatherCondition)}" ในพื้นที่อุทยาน ซึ่งเสี่ยงต่อดินถล่ม น้ำป่าหลาก ถนนลื่น และทัศนวิสัยขับขี่ต่ำมาก`,
      impactLevel: "ระดับความเสี่ยงสูงมาก",
      editSuggestion: "เปลี่ยนวันเดินทาง",
    };
  }

  // 2. Transport Risk: Motorcycle in rain or steep mountain route
  if (trip.transportMode === "MOTORCYCLE" && (weatherCondition === "LIGHT_RAIN" || weatherCondition === "CLOUDY" || latestEvaluation?.weatherScore < 60)) {
    return {
      type: "TRANSPORT",
      severity: "DANGER",
      icon: "🏍️",
      badgeLabel: "ความเสี่ยงยานพาหนะ",
      headline: "แนะนำให้เปลี่ยนวิธีการเดินทางเป็นรถยนต์",
      recommendedAction: "ควรเปลี่ยนพาหนะจากรถจักรยานยนต์เป็นรถยนต์ส่วนบุคคล หรือรถสาธารณะ",
      reasonText: `เนื่องจากการขับขี่รถจักรยานยนต์ขึ้นเส้นทางลาดชันบนเทือกเขาสูงในสภาพอากาศ ${getWeatherConditionLabel(weatherCondition)} มีความเสี่ยงต่อการเกิดอุบัติเหตุลื่นไถลสูง และไม่มีเกราะกำบังลมฝน`,
      impactLevel: "ความปลอดภัยในการเดินทาง",
      editSuggestion: "เปลี่ยนประเภทยานพาหนะ",
    };
  }

  // 3. Transport Risk: Public Transport without direct connection
  if (trip.transportMode === "PUBLIC_TRANSPORT" && !transitInfo.hasDirectPublicTransit) {
    return {
      type: "TRANSPORT",
      severity: "WARNING",
      icon: "🚌",
      badgeLabel: "การเชื่อมต่อขนส่งสาธารณะ",
      headline: "แนะนำให้วางแผนเหมารถสองแถว หรือเปลี่ยนมาใช้รถยนต์ส่วนบุคคล",
      recommendedAction: "ควรติดต่อเหมารถสองแถวท้องถิ่นจากตัวเมืองล่วงหน้า หรือเปลี่ยนเป็นรถยนต์ส่วนตัว/เช่าขับ",
      reasonText: `เนื่องจากอุทยานแห่งชาติ${trip.park.nameTh} ไม่มีรถประจำทางหรือรถโดยสารสาธารณะวิ่งตรงถึงด่าน/ที่ทำการอุทยาน หากไม่นัดหมายรถรับ-ส่งล่วงหน้าอาจไม่มีพาหนะเดินทางต่อ`,
      impactLevel: "ความสะดวกและความพร้อม",
      editSuggestion: "เปลี่ยนวิธีการเดินทาง",
    };
  }

  // 4. Time Risk: Late departure arriving after 16:00 or after sunset
  if (arrivalHour >= 16 || (latestEvaluation && latestEvaluation.timeScore < 50)) {
    return {
      type: "TIME",
      severity: "WARNING",
      icon: "⏰",
      badgeLabel: "เวลาเดินทางไม่เหมาะสม",
      headline: "แนะนำให้ออกเดินทางเร็วขึ้น (ก่อน 07:30 - 08:30 น.)",
      recommendedAction: `ควรเลื่อนเวลาออกเดินทางจากเดิม (${trip.departAt} น.) ให้เร็วขึ้นอย่างน้อย 2–3 ชั่วโมง`,
      reasonText: `เนื่องจากเวลาออกเดินทางปัจจุบันจะทำให้คุณเดินทางถึงอุทยานประมาณ ${arrivalTimeStr} น. ซึ่งใกล้เวลาปิดทำการ (${trip.park.closeTime} น.) และแสงอาทิตย์หมด ทำให้มีเวลาท่องเที่ยวไม่เพียงพอและต้องขับรถบนเส้นทางภูเขาในเวลากลางคืน`,
      impactLevel: "การบริหารเวลาและทัศนวิสัย",
      editSuggestion: "ปรับเวลาออกเดินทาง",
    };
  }

  // 5. Duration Risk: Long travel duration > 4 hours without stops
  if (travelDurationMinutes >= 240 || (latestEvaluation && latestEvaluation.durationScore < 60)) {
    const hours = Math.floor(travelDurationMinutes / 60);
    const mins = travelDurationMinutes % 60;
    const durationStr = `${hours} ชม. ${mins > 0 ? `${mins} นาที` : ""}`;

    return {
      type: "DURATION",
      severity: "INFO",
      icon: "☕",
      badgeLabel: "ระยะเวลาเดินทางไกล",
      headline: "แนะนำให้วางแผนจุดแวะพักทุก 2 ชั่วโมง หรือแวะพักค้างแรมระหว่างทาง",
      recommendedAction: "ควรวางแผนจุดพักรถระหว่างทาง และผลัดเปลี่ยนผู้ขับขี่",
      reasonText: `เนื่องจากต้องใช้เวลาเดินทางต่อเนื่องประมาณ ${durationStr} อาจทำให้เกิดความเหนื่อยล้าสะสมและง่วงนอนขณะขับขี่ขึ้นทางลาดชัน`,
      impactLevel: "ความเหนื่อยล้าของผู้ขับขี่",
      editSuggestion: "ปรับแผนหรือจุดพัก",
    };
  }

  // 6. Needs general adjustment if score is low
  if (latestEvaluation && latestEvaluation.totalScore < 60) {
    return {
      type: "READY",
      severity: "WARNING",
      icon: "📋",
      badgeLabel: "ควรปรับแผนการเดินทาง",
      headline: "แนะนำให้ทบทวนตารางเวลาและพาหนะเพื่อให้ทริปราบรื่น",
      recommendedAction: "ควรปรับเวลาออกเดินทางให้เช้าขึ้น และตรวจสอบความพร้อมของยานพาหนะ",
      reasonText: `เนื่องจากผลการประเมินความปลอดภัยโดยรวมอยู่ในเกณฑ์ "${latestEvaluation.level === "NEEDS_ADJUSTMENT" ? "ควรปรับแผน" : "ปานกลาง"}" (${latestEvaluation.totalScore}/100) ปัจจัยบางประการอาจทำให้การเดินทางติดขัด`,
      impactLevel: "ความราบรื่นตลอดทริป",
      editSuggestion: "แก้ไขแผนทริป",
    };
  }

  // 7. Success / Highly Ready
  return {
    type: "READY",
    severity: "SUCCESS",
    icon: "✨",
    badgeLabel: "แผนการเดินทางมีความพร้อมสูง",
    headline: "ทริปนี้ลงตัวมาก สามารถออกเดินทางได้ตามกำหนดการ",
    recommendedAction: "ดำเนินตามแผนเดิมได้ทันที พร้อมตรวจเช็กความพร้อมของพาหนะก่อนออกเดินทาง",
    reasonText: `เนื่องจากสภาพอากาศ ช่วงเวลาเดินทาง และยานพาหนะมีความสอดคล้องเหมาะสมสูง (คะแนนความพร้อม ${latestEvaluation?.totalScore ?? 85}/100) มีเวลาท่องเที่ยวอย่างเต็มที่และปลอดภัย`,
    impactLevel: "ความพร้อมดีเยี่ยม",
  };
}

export function PlanAdjustmentBanner({ trip }: PlanAdjustmentBannerProps) {
  const reason = analyzePlanAdjustment(trip);

  const styleConfigs = {
    DANGER: {
      bg: "bg-gradient-to-r from-rose-950/90 via-red-900/80 to-rose-950/90",
      border: "border-rose-500/50",
      glow: "shadow-rose-950/40",
      badgeBg: "bg-rose-500/20 text-rose-200 border-rose-400/40",
      textPrimary: "text-rose-100",
      textSecondary: "text-rose-200/90",
      reasonBoxBg: "bg-black/40 border-rose-500/30",
      accentTitle: "text-rose-300",
      buttonBg: "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-950/50",
    },
    WARNING: {
      bg: "bg-gradient-to-r from-amber-950/90 via-yellow-950/80 to-amber-950/90",
      border: "border-amber-500/50",
      glow: "shadow-amber-950/40",
      badgeBg: "bg-amber-500/20 text-amber-200 border-amber-400/40",
      textPrimary: "text-amber-100",
      textSecondary: "text-amber-200/90",
      reasonBoxBg: "bg-black/40 border-amber-500/30",
      accentTitle: "text-amber-300",
      buttonBg: "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/50 font-bold",
    },
    INFO: {
      bg: "bg-gradient-to-r from-teal-950/90 via-cyan-950/80 to-teal-950/90",
      border: "border-teal-500/50",
      glow: "shadow-teal-950/40",
      badgeBg: "bg-teal-500/20 text-teal-200 border-teal-400/40",
      textPrimary: "text-teal-100",
      textSecondary: "text-teal-200/90",
      reasonBoxBg: "bg-black/40 border-teal-500/30",
      accentTitle: "text-teal-300",
      buttonBg: "bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-950/50 font-bold",
    },
    SUCCESS: {
      bg: "bg-gradient-to-r from-emerald-950/90 via-teal-950/80 to-emerald-950/90",
      border: "border-emerald-500/40",
      glow: "shadow-emerald-950/40",
      badgeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
      textPrimary: "text-emerald-100",
      textSecondary: "text-emerald-200/90",
      reasonBoxBg: "bg-black/40 border-emerald-500/30",
      accentTitle: "text-emerald-300",
      buttonBg: "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/50 font-bold",
    },
  }[reason.severity];

  return (
    <section
      className={`relative overflow-hidden rounded-[30px] sm:rounded-[34px] border p-5 sm:p-7 shadow-xl backdrop-blur-xl ${styleConfigs.bg} ${styleConfigs.border} ${styleConfigs.glow}`}
      aria-label="การให้เหตุผลและข้อแนะนำการปรับแผน"
    >
      {/* Subtle ambient light */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Header Row: Badge & Impact */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-black/40 text-lg border border-white/10 shadow-xs">
              {reason.icon}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold font-heading uppercase tracking-wider backdrop-blur-md ${styleConfigs.badgeBg}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              {reason.badgeLabel}
            </span>
          </div>

          <span className="text-[11px] font-semibold text-white/70">
            ผลกระทบ: <strong className="text-white">{reason.impactLevel}</strong>
          </span>
        </div>

        {/* Main Headline & Action Recommendation */}
        <div>
          <h2 className={`text-lg sm:text-xl font-extrabold font-heading tracking-tight leading-snug ${styleConfigs.textPrimary}`}>
            {reason.headline}
          </h2>
          <p className={`mt-1.5 text-xs sm:text-sm leading-relaxed font-medium ${styleConfigs.textSecondary}`}>
            👉 <strong>ข้อแนะนำ:</strong> {reason.recommendedAction}
          </p>
        </div>

        {/* Reason Box (กล่องให้เหตุผลที่ชัดเจน) */}
        <div className={`rounded-2xl border p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed backdrop-blur-md ${styleConfigs.reasonBoxBg}`}>
          <div className="flex items-start gap-2.5">
            <span className="text-sm shrink-0 mt-0.5">💡</span>
            <div>
              <p className={`font-bold font-heading mb-1 ${styleConfigs.accentTitle}`}>
                เหตุผลที่ควรปรับปรุงแผน:
              </p>
              <p className="text-white/90 leading-relaxed font-normal">
                {reason.reasonText}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/10">
          <p className="text-[11px] text-white/60">
            ระบบวิเคราะห์จากพิกัดเส้นทางจริง สภาพอากาศแบบ Live และสถิติความปลอดภัย
          </p>

          <div className="flex items-center gap-2">
            <Link
              href={`/trips/${trip.id}/edit`}
              className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold font-heading shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer ${styleConfigs.buttonBg}`}
            >
              <span>{reason.editSuggestion ?? "ปรับแผนทริป"}</span>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
