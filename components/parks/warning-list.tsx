import type { ParkDetailDto } from "@/lib/mappers/park-dto";

type WarningListProps = {
  warnings: ParkDetailDto["warnings"];
};

const severityTone: Record<string, string> = {
  LOW: "bg-emerald-100/90 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700/60",
  MEDIUM: "bg-amber-100/90 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700/60",
  HIGH: "bg-rose-100/90 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-700/60",
};

const severityLabel: Record<string, string> = {
  LOW: "เฝ้าระวังเล็กน้อย",
  MEDIUM: "ควรระวัง",
  HIGH: "ความเสี่ยงสูง",
};

export function WarningList({ warnings }: WarningListProps) {
  if (warnings.length === 0) {
    return (
      <section className="glass-panel space-y-3 rounded-[30px] p-6 border border-slate-200/80 dark:border-emerald-800/40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 text-base">
            🛡️
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            ข้อควรระวังความปลอดภัย
          </h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-emerald-200/70">
          ยังไม่มีคำเตือนความเสี่ยงพิเศษที่เปิดใช้งานสำหรับอุทยานนี้ เดินทางได้ตามปกติ
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 text-sm sm:text-base shadow-2xs">
            🛡️
          </span>
          <h2 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            ข้อควรระวัง
          </h2>
        </div>
        <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-full bg-slate-100/90 dark:bg-emerald-950/60 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-emerald-300 border border-slate-200/80 dark:border-emerald-800/40 shadow-2xs">
          <span>⚠️</span>
          <span>{warnings.length} ข้อความระวัง</span>
        </span>
      </div>

      <div className="grid gap-3.5 sm:gap-4">
        {warnings.map((warning) => (
          <article
            key={warning.id}
            className="glass-panel rounded-[26px] sm:rounded-[28px] p-4.5 sm:p-5 border border-slate-200/80 dark:border-emerald-800/40 bg-white/90 dark:bg-[#0b1e17]/85 shadow-sm transition-all duration-300 hover:shadow-md"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-3 min-w-0">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-emerald-950/70 text-sm font-bold shadow-2xs mt-0.5 sm:mt-0">
                  {warning.severity === "HIGH" ? "⚠️" : warning.severity === "MEDIUM" ? "⚡" : "ℹ️"}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {warning.title}
                </h3>
              </div>
              <span
                className={`inline-flex shrink-0 whitespace-nowrap self-start sm:self-auto rounded-full px-3 py-0.5 text-xs font-bold border ${
                  severityTone[warning.severity] ?? "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                {severityLabel[warning.severity] ?? warning.severity}
              </span>
            </div>
            <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-emerald-200/80 sm:pl-11">
              {warning.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
