import { getParkFeeInfo } from "@/lib/data/park-fees";
import type { ParkDetailDto } from "@/lib/mappers/park-dto";

type ParkFeeCardProps = {
  park: ParkDetailDto;
};

export function ParkFeeCard({ park }: ParkFeeCardProps) {
  const feeInfo = getParkFeeInfo(park.slug, park.nameTh);

  return (
    <section className="space-y-4" aria-labelledby="park-fees-heading">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <span className="guide-chip">อัตราค่าบริการอุทยาน</span>
          <h2 id="park-fees-heading" className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            ค่าธรรมเนียมเข้าชมและค่ายานพาหนะ
          </h2>
          <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-emerald-200/80">
            {feeInfo.notes ?? "อัตราค่าบริการมาตรฐานตามประกาศกรมอุทยานแห่งชาติ สัตว์ป่า และพันธุ์พืช (DNP)"}
          </p>
        </div>

        {feeInfo.pdfOrderNumber && (
          <span className="inline-flex shrink-0 self-start sm:self-auto items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/90 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-700/60 shadow-xs">
            <span>📋</span>
            <span>ประกาศ DNP ลำดับที่ {feeInfo.pdfOrderNumber}</span>
          </span>
        )}
      </div>

      {feeInfo.isFree && (
        <div className="rounded-3xl border border-emerald-300/80 bg-emerald-50/90 p-4 dark:border-emerald-700/60 dark:bg-emerald-950/80 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🟢</span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-emerald-950 dark:text-emerald-100">
                พื้นที่เตรียมการจัดตั้งอุทยานแห่งชาติ — ยังไม่เสียค่าบริการเข้าชมสำหรับบุคคล
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-emerald-900 dark:text-emerald-300/90">
                นักท่องเที่ยวสามารถเข้าชมได้โดยไม่มีค่าธรรมเนียมบุคคล (อัตราค่าเข้าชม 0 บาท) ทั้งนี้อาจมีค่าบริการสำหรับยานพาหนะหรือการบริหารจัดการท้องถิ่นตามข้อกำหนดของพื้นที่
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Column 1: Admission Fees */}
        <div className="soft-card flex flex-col justify-between rounded-[30px] p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2.5 border-b border-slate-200/60 pb-3.5 dark:border-slate-800/60">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-base font-bold text-emerald-800 dark:text-emerald-300 shadow-xs">
                🎟️
              </span>
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">ค่าเข้าชมอุทยาน (บุคคล)</h3>
                <p className="text-xs text-[var(--muted)]">ชำระต่อท่าน ณ ด่านตรวจทางเข้า</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {/* Thai Visitors */}
              <div className="rounded-2xl bg-slate-50/80 p-3.5 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    🇹🇭 บุคคลสัญชาติไทย
                  </span>
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                    {feeInfo.isFree ? "เข้าฟรี" : "ราคาคนไทย"}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-white dark:bg-slate-800 p-2.5 shadow-2xs">
                    <span className="text-xs text-[var(--muted)]">ผู้ใหญ่</span>
                    <p className="text-base font-extrabold text-[var(--foreground)]">
                      {feeInfo.isFree ? "ฟรี (฿0)" : `฿${feeInfo.thaiAdult}`}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-800 p-2.5 shadow-2xs">
                    <span className="text-xs text-[var(--muted)]">เด็ก (3-14 ปี)</span>
                    <p className="text-base font-extrabold text-[var(--foreground)]">
                      {feeInfo.isFree ? "ฟรี (฿0)" : `฿${feeInfo.thaiChild}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Foreign Visitors */}
              <div className="rounded-2xl bg-slate-50/80 p-3.5 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
                    🌏 บุคคลชาวต่างชาติ
                  </span>
                  <span className="rounded-full bg-sky-100 dark:bg-sky-950 px-2.5 py-0.5 text-[11px] font-bold text-sky-800 dark:text-sky-300">
                    {feeInfo.isFree ? "Free Entry" : "Foreigners"}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-white dark:bg-slate-800 p-2.5 shadow-2xs">
                    <span className="text-xs text-[var(--muted)]">Adult</span>
                    <p className="text-base font-extrabold text-[var(--foreground)]">
                      {feeInfo.isFree ? "Free (฿0)" : `฿${feeInfo.foreignAdult}`}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-800 p-2.5 shadow-2xs">
                    <span className="text-xs text-[var(--muted)]">Child</span>
                    <p className="text-base font-extrabold text-[var(--foreground)]">
                      {feeInfo.isFree ? "Free (฿0)" : `฿${feeInfo.foreignChild}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Free Exemptions */}
          <div className="mt-4 rounded-2xl bg-emerald-50/70 p-3 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40">
            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              ✨ ได้รับการยกเว้นค่าบริการ (เข้าฟรี):
            </p>
            <ul className="mt-1.5 space-y-1 text-xs text-emerald-800 dark:text-emerald-300">
              {feeInfo.freeExemptions.map((exemption, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <span className="text-emerald-500">•</span>
                  <span>{exemption}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Column 2: Vehicle & Parking Fees */}
        <div className="soft-card flex flex-col justify-between rounded-[30px] p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2.5 border-b border-slate-200/60 pb-3.5 dark:border-slate-800/60">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/80 text-base font-bold text-amber-800 dark:text-amber-300 shadow-xs">
                🚗
              </span>
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">ค่ายานพาหนะ & ค่าที่จอดรถ</h3>
                <p className="text-xs text-[var(--muted)]">ชำระต่อคันที่นำเข้าเขตอุทยาน</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {/* Car */}
              <div className="rounded-2xl border border-slate-200/50 bg-slate-50/70 p-3 dark:border-slate-800/50 dark:bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚗</span>
                  <span className="text-xs font-bold text-[var(--foreground)]">รถยนต์ 4 ล้อ</span>
                </div>
                <p className="mt-2 text-lg font-extrabold text-[var(--foreground)]">
                  ฿{feeInfo.vehicles.car} <span className="text-xs font-normal text-[var(--muted)]">/ คัน</span>
                </p>
                <p className="text-[11px] text-[var(--muted)]">เก๋ง / กระบะ / SUV / ตู้</p>
              </div>

              {/* Motorcycle */}
              <div className="rounded-2xl border border-slate-200/50 bg-slate-50/70 p-3 dark:border-slate-800/50 dark:bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛵</span>
                  <span className="text-xs font-bold text-[var(--foreground)]">จักรยานยนต์</span>
                </div>
                <p className="mt-2 text-lg font-extrabold text-[var(--foreground)]">
                  ฿{feeInfo.vehicles.motorcycle} <span className="text-xs font-normal text-[var(--muted)]">/ คัน</span>
                </p>
                <p className="text-[11px] text-[var(--muted)]">มอเตอร์ไซค์ทุกประเภท</p>
              </div>

              {/* Bicycle */}
              <div className="rounded-2xl border border-slate-200/50 bg-slate-50/70 p-3 dark:border-slate-800/50 dark:bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚲</span>
                  <span className="text-xs font-bold text-[var(--foreground)]">รถจักรยาน</span>
                </div>
                <p className="mt-2 text-lg font-extrabold text-[var(--foreground)]">
                  {feeInfo.vehicles.bicycle === 0 ? (
                    <span className="text-emerald-800 dark:text-emerald-300">ฟรี (฿0)</span>
                  ) : (
                    <>
                      ฿{feeInfo.vehicles.bicycle}{" "}
                      <span className="text-xs font-normal text-[var(--muted)]">/ คัน</span>
                    </>
                  )}
                </p>
                <p className="text-[11px] text-[var(--muted)]">
                  {feeInfo.vehicles.bicycle === 0 ? "ไม่เสียค่าบริการ" : "จักรยานท่องเที่ยว"}
                </p>
              </div>

              {/* Bus / 6+ Wheels */}
              <div className="rounded-2xl border border-slate-200/50 bg-slate-50/70 p-3 dark:border-slate-800/50 dark:bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚌</span>
                  <span className="text-xs font-bold text-[var(--foreground)]">รถบัส / รถ 6 ล้อ+</span>
                </div>
                <p className="mt-2 text-lg font-extrabold text-[var(--foreground)]">
                  ฿{feeInfo.vehicles.truck6Wheel}–{feeInfo.vehicles.bus} <span className="text-xs font-normal text-[var(--muted)]">/ คัน</span>
                </p>
                <p className="text-[11px] text-[var(--muted)]">รถ 6 ล้อ (100฿) / บัส (200฿)</p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50">
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              📋 อ้างอิง: ข้อมูลอัตราค่าบริการสำหรับบุคคลและยานพาหนะในการเข้าไปในอุทยานแห่งชาติ ปรับปรุง ณ วันที่ 2 มิ.ย. 2566 โดยกรมอุทยานแห่งชาติ สัตว์ป่า และพันธุ์พืช
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
