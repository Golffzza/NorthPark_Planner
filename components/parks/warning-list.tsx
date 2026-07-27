import type { ParkDetailDto } from "@/lib/mappers/park-dto";

type WarningListProps = {
  warnings: ParkDetailDto["warnings"];
};

const severityTone: Record<string, string> = {
  LOW: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-200",
  HIGH: "bg-rose-50 text-rose-700 ring-rose-200",
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
        <span className="guide-chip">Safety Notes</span>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          คำเตือนการเดินทาง
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          ตอนนี้ยังไม่มีคำเตือนที่เปิดใช้งานสำหรับอุทยานนี้ แต่ยังควรตรวจสภาพอากาศ เวลาเดินทาง
          และความพร้อมของผู้เดินทางก่อนออกทริปทุกครั้ง
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <span className="guide-chip">Safety Notes</span>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          คำเตือนการเดินทาง
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          สรุปข้อควรระวังแบบอ่านสั้น ๆ เพื่อช่วยวางแผนทริปได้ปลอดภัยขึ้น
        </p>
      </div>
      <div className="grid gap-4">
        {warnings.map((warning) => (
          <article key={warning.id} className="soft-card rounded-[30px] px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-white/78 text-base font-semibold text-[var(--brand-strong)]">
                    {warning.severity === "HIGH" ? "!" : warning.severity === "MEDIUM" ? "~" : "i"}
                  </span>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">{warning.title}</h3>
                </div>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                  severityTone[warning.severity] ?? "bg-slate-50 text-slate-700 ring-slate-200"
                }`}
              >
                {severityLabel[warning.severity] ?? warning.severity}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{warning.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
