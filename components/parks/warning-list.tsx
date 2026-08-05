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
      <section className="soft-card rounded-[32px] px-5 py-6 sm:px-6">
        <span className="guide-chip">ข้อควรระวังความปลอดภัย</span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-[var(--foreground)]">
          คำเตือนการเดินทาง
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          ตอนนี้ยังไม่มีคำเตือนที่เปิดใช้งานสำหรับอุทยานนี้ แต่ยังควรตรวจสภาพอากาศ เวลาเดินทาง
          และความพร้อมของผู้เดินทางก่อนออกทริปทุกครั้ง
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <span className="guide-chip">ข้อควรระวังความปลอดภัย</span>
        <h2 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]">
          คำเตือนการเดินทาง
        </h2>
        <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[var(--muted)]">
          สรุปข้อควรระวังแบบอ่านสั้น ๆ เพื่อช่วยวางแผนทริปได้ปลอดภัยขึ้น
        </p>
      </div>
      <div className="grid gap-3 sm:gap-4">
        {warnings.map((warning) => (
          <article key={warning.id} className="soft-card rounded-[30px] p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 dark:bg-slate-800 text-sm font-bold text-[var(--brand-strong)] shadow-xs mt-0.5 sm:mt-0">
                  {warning.severity === "HIGH" ? "⚠️" : warning.severity === "MEDIUM" ? "⚡" : "ℹ️"}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[var(--foreground)] leading-snug">
                  {warning.title}
                </h3>
              </div>
              <span
                className={`inline-flex shrink-0 whitespace-nowrap self-start sm:self-auto rounded-full px-3.5 py-1 text-xs font-bold border ${
                  severityTone[warning.severity] ?? "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                {severityLabel[warning.severity] ?? warning.severity}
              </span>
            </div>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[var(--muted)] sm:pl-12">
              {warning.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
