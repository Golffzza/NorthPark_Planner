//* ./components/evaluation/factor-score-card.tsx

import {
  Check,
  AlertTriangle,
  X,
  CloudSun,
  Car,
  Clock,
  User,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import type { FactorScoreViewModel } from "@/lib/presenters/trip-result-view";
import { getFactorStatus } from "@/lib/evaluation/factor-status";

type FactorScoreCardProps = {
  factor: FactorScoreViewModel;
};

type FactorStatusTheme = {
  statusType: "safe" | "caution" | "risk";
  label: string;
  badgeClass: string;
  pillClass: string;
  barColor: string;
  cardBorderClass: string;
  tipBoxClass: string;
};

function getFactorStatusTheme(
  score: number,
  explicitStatus?: "GOOD" | "CAUTION" | "RISK",
): FactorStatusTheme {
  const status = explicitStatus ?? getFactorStatus(score);
  const isSafe = status === "GOOD";
  const isRisk = status === "RISK";

  if (isSafe) {
    return {
      statusType: "safe",
      label: "อยู่ในเกณฑ์ดี",
      badgeClass:
        "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      pillClass:
        "bg-emerald-600 text-white shadow-emerald-950/20",
      barColor:
        "bg-gradient-to-r from-emerald-500 to-teal-400",
      cardBorderClass:
        "border-emerald-500/25 hover:border-emerald-500/45 dark:bg-emerald-950/[0.04]",
      tipBoxClass:
        "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-900 dark:text-emerald-200/90",
    };
  }

  if (!isRisk) {
    return {
      statusType: "caution",
      label: "ควรระวัง",
      badgeClass:
        "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
      pillClass:
        "bg-amber-600 text-white shadow-amber-950/20",
      barColor:
        "bg-gradient-to-r from-amber-500 to-yellow-400",
      cardBorderClass:
        "border-amber-500/25 hover:border-amber-500/45 dark:bg-amber-950/[0.04]",
      tipBoxClass:
        "border-amber-500/20 bg-amber-500/[0.06] text-amber-900 dark:text-amber-200/90",
    };
  }

  return {
    statusType: "risk",
    label: "ควรปรับแผน",
    badgeClass:
      "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300",
    pillClass:
      "bg-rose-600 text-white shadow-rose-950/20",
    barColor:
      "bg-gradient-to-r from-rose-500 to-pink-500",
    cardBorderClass:
      "border-rose-500/25 hover:border-rose-500/45 dark:bg-rose-950/[0.04]",
    tipBoxClass:
      "border-rose-500/20 bg-rose-500/[0.06] text-rose-900 dark:text-rose-200/90",
  };
}

function renderFactorIcon(key: string) {
  switch (key) {
    case "weather":
      return <CloudSun className="w-5 h-5 text-sky-500" />;
    case "duration":
      return <Car className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    case "time":
      return <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
    case "userProfile":
    case "profile":
      return <User className="w-5 h-5 text-indigo-500" />;
    default:
      return <BarChart3 className="w-5 h-5 text-slate-500" />;
  }
}

/** Advice describes next checks, rather than inferring facts from numeric scores. */
export function getActionableTip(factorKey: string, score: number): string {
  const status = getFactorStatus(score);
  if (factorKey === "weather") {
    return status === "GOOD"
      ? "ตรวจสอบพยากรณ์อากาศล่าสุดสำหรับวันและพื้นที่ที่จะเดินทางอีกครั้ง"
      : "ตรวจสอบพยากรณ์อากาศและประกาศของอุทยานก่อนเดินทาง พร้อมเตรียมแผนสำรองหากสภาพอากาศไม่เอื้ออำนวย";
  }
  if (factorKey === "duration") {
    return status === "GOOD"
      ? "ตรวจสอบเวลาเดินทางล่าสุดและเผื่อเวลาสำหรับจุดพักตามความเหมาะสม"
      : "พิจารณาเพิ่มเวลาพักและตรวจสอบระยะเวลาเดินทางจริงก่อนกำหนดเวลาออกเดินทาง";
  }
  if (factorKey === "time") {
    return status === "GOOD"
      ? "ตรวจสอบเวลาทำการและช่วงพระอาทิตย์ตกของวันที่จะเดินทางอีกครั้ง"
      : "เทียบเวลาถึงโดยประมาณกับเวลาทำการและพระอาทิตย์ตก แล้วปรับเวลาออกเดินทางตามข้อมูลจริง";
  }
  if (factorKey === "userProfile" || factorKey === "profile") {
    return status === "GOOD"
      ? "ตรวจสอบการเข้าถึงจุดหมายด้วยพาหนะที่เลือกและข้อกำหนดของอุทยานก่อนเดินทาง"
      : "ตรวจสอบเส้นทาง การต่อรถ และข้อจำกัดของพาหนะที่เลือกกับอุทยานก่อนเดินทาง";
  }
  return "ตรวจสอบรายละเอียดการเดินทางจากแหล่งข้อมูลที่เชื่อถือได้ก่อนออกเดินทาง";
}

export function FactorScoreCard({ factor }: FactorScoreCardProps) {
  const theme = getFactorStatusTheme(factor.score, factor.status);
  const actionableTip = getActionableTip(factor.key, factor.score);

  return (
    <article
      className={`dashboard-card relative flex flex-col justify-between overflow-hidden rounded-[26px] border p-5 transition-all duration-200 ${theme.cardBorderClass}`}
    >
      <div>
        {/* Card Header: Icon, Factor Title, Status Badge, Score */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-black/5 shadow-xs dark:border-white/10 dark:bg-white/5">
              {renderFactorIcon(factor.key)}
            </span>
            <div>
              <h3 className="text-base font-bold font-heading text-[var(--foreground)]">
                {factor.label}
              </h3>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-emerald-300/80">
                น้ำหนัก {factor.weightLabel}
              </span>
            </div>
          </div>

          {/* Status Badge (สีเขียว = ปลอดภัย, สีส้ม = ควรระวัง) */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${theme.badgeClass}`}
            >
              {theme.statusType === "safe" ? (
                <Check className="w-3.5 h-3.5" />
              ) : theme.statusType === "caution" ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              <span>{theme.label}</span>
            </span>

            <div className="flex items-baseline gap-1 text-xs">
              <span className="text-sm font-black font-heading text-[var(--foreground)]">
                {factor.score}
              </span>
              <span className="text-[var(--muted)]">/ 100</span>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full border border-slate-300/40 bg-slate-200/80 dark:border-white/5 dark:bg-black/40">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${theme.barColor}`}
            style={{ width: `${Math.max(4, Math.min(100, factor.score))}%` }}
          />
        </div>

        {/* Context / Reason Description */}
        <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
          {factor.reason || factor.description}
        </p>
      </div>

      {/* Actionable Advice: ให้ผู้ใช้นำไปปรับแผนได้จริง */}
      <div
        className={`mt-4 rounded-[18px] border p-3 text-xs leading-relaxed ${theme.tipBoxClass}`}
      >
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <span className="font-bold">นำไปปรับแผน: </span>
            <span>{actionableTip}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
