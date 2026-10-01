import { SuitabilityLevelBadge } from "@/components/evaluation/suitability-level-badge";
import type { TripResultViewModel } from "@/lib/presenters/trip-result-view";
import { formatThaiDateTime } from "@/lib/utils/date";

type ScoreHeroCardProps = {
  parkName: string;
  parkProvince: string;
  evaluation: TripResultViewModel["latestEvaluation"];
};

function getScoreTheme(score: number) {
  if (score >= 80) {
    return {
      gradient: "from-emerald-500 via-teal-500 to-emerald-600",
      stroke: "#10b981",
      glow: "rgba(16, 185, 129, 0.25)",
      bgLight: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      statusText: "พร้อมเดินทางอย่างยิ่ง",
    };
  }
  if (score >= 60) {
    return {
      gradient: "from-teal-500 via-cyan-500 to-teal-600",
      stroke: "#14b8a6",
      glow: "rgba(20, 184, 166, 0.25)",
      bgLight: "bg-teal-500/10 text-teal-400 border-teal-500/30",
      statusText: "ความพร้อมอยู่ในเกณฑ์ดี",
    };
  }
  if (score >= 40) {
    return {
      gradient: "from-amber-500 via-orange-500 to-amber-600",
      stroke: "#f59e0b",
      glow: "rgba(245, 158, 11, 0.25)",
      bgLight: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      statusText: "ปานกลาง ควรเตรียมความพร้อมเพิ่มเติม",
    };
  }
  return {
    gradient: "from-rose-500 via-pink-500 to-rose-600",
    stroke: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.25)",
    bgLight: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    statusText: "ควรปรับแผนหรือเลื่อนการเดินทาง",
  };
}

export function ScoreHeroCard({ parkName, parkProvince, evaluation }: ScoreHeroCardProps) {
  const theme = getScoreTheme(evaluation.totalScore);
  const circumference = 2 * Math.PI * 46;
  const strokeDashoffset = circumference - (evaluation.totalScore / 100) * circumference;

  return (
    <section className="relative overflow-hidden rounded-[34px] sm:rounded-[38px] bg-gradient-to-b from-[#08221b] via-[#051a14] to-[#020e0b] border border-white/10 dark:border-emerald-500/20 shadow-2xl p-6 sm:p-9 text-white">
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: theme.stroke }}
      />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        {/* Left Side: Park & Evaluation Summary */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3.5 py-1 text-xs font-bold text-emerald-300 border border-white/15 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {parkProvince}
            </span>
            <SuitabilityLevelBadge level={evaluation.level} size="sm" />
          </div>

          <div>
            <h1
              className="text-xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight leading-tight drop-shadow-md whitespace-nowrap truncate"
              title={parkName}
            >
              {parkName}
            </h1>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-200/90 font-normal">
              {evaluation.summary}
            </p>
          </div>

          {/* Evaluated timestamp badge */}
          <div className="inline-flex items-center gap-2 rounded-2xl bg-black/40 border border-white/10 px-4 py-2 text-xs text-slate-300 backdrop-blur-md">
            <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
            <span>ประเมินล่าสุด: {formatThaiDateTime(evaluation.evaluatedAt)}</span>
          </div>
        </div>

        {/* Right Side: Circular Score Dial Card */}
        <div className="relative flex flex-col items-center justify-center rounded-[28px] sm:rounded-[32px] bg-black/50 border border-white/15 p-6 sm:p-7 backdrop-blur-xl shadow-inner">
          <div className="relative flex items-center justify-center">
            {/* SVG Circular Progress Meter */}
            <svg className="h-40 w-40 sm:h-44 sm:w-44 -rotate-90 transform" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="46"
                className="text-white/10"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r="46"
                stroke={theme.stroke}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: `drop-shadow(0 0 8px ${theme.glow})`,
                }}
              />
            </svg>

            {/* Score Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-4xl sm:text-5xl font-black font-heading tracking-tight text-white drop-shadow-md">
                {evaluation.totalScore}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                จาก 100 คะแนน
              </span>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className={`inline-block rounded-full px-3.5 py-1 text-xs font-bold font-heading border ${theme.bgLight}`}>
              {theme.statusText}
            </span>
            <p className="mt-2 text-xs text-slate-400 max-w-xs leading-relaxed">
              คะแนนคำนวณตามหลักเกณฑ์ความปลอดภัย 4 ปัจจัยหลัก
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

