import { getParkFeeInfo } from "@/lib/data/park-fees";
import type { ParkDetailDto } from "@/lib/mappers/park-dto";

type ParkFeeCardProps = {
  park: ParkDetailDto;
};

export function ParkFeeCard({ park }: ParkFeeCardProps) {
  const feeInfo = getParkFeeInfo(park.slug, park.nameTh);

  return (
    <section className="space-y-4" aria-labelledby="park-fees-heading">
      {/* Free Park Notice (If Applicable) */}
      {feeInfo.isFree && (
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-3.5 sm:p-4 text-emerald-900 dark:text-emerald-200 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🌿</span>
            <div>
              <p className="text-xs sm:text-sm font-bold">
                พื้นที่เตรียมการจัดตั้ง — ไม่มีค่าธรรมเนียมเข้าชมบุคคล (เข้าฟรี ฿0)
              </p>
              <p className="text-[11px] sm:text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                สามารถเข้าชมได้ฟรีตามปกติ ทั้งนี้อาจมีค่ายานพาหนะตามระเบียบพื้นที่
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Container styled exactly as Reference */}
      <div className="rounded-[28px] sm:rounded-[32px] border border-[#0e3b2e] bg-[#07241c] p-5 sm:p-7 shadow-xl space-y-5 text-white">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#0f3c30]">
          <div className="flex items-center gap-3">
            {/* Dark Emerald Squircle Icon */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 shadow-sm">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3L4 15h5l-3 6h12l-3-6h5L12 3z" />
                <path d="M12 21v2" />
              </svg>
            </div>
            <div>
              <h2 id="park-fees-heading" className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                ค่าธรรมเนียมเข้าชม
              </h2>
              <p className="text-xs text-emerald-300/70 mt-0.5">
                อุทยานแห่งชาติ • รายวัน
              </p>
            </div>
          </div>

          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#0a2e24] px-3.5 py-1 text-xs font-medium text-[#86efac] border border-[#144839] self-start sm:self-auto shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#86efac] animate-pulse" />
            <span>ชำระ ณ ด่านตรวจ</span>
          </div>
        </div>

        {/* Admission Section */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              ค่าเข้าชมบุคคล
            </h3>
            <p className="text-xs text-emerald-300/60 mt-0.5">
              อัตราต่อท่าน / ต่อวัน
            </p>
          </div>

          {/* Thai vs Foreigner Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Thai Rate Card */}
            <div className="rounded-2xl border border-[#124133] bg-[#07261d]/90 p-4 space-y-3 shadow-sm">
              <div>
                <span className="inline-flex items-center rounded-full bg-[#0c3629] px-2.5 py-0.5 text-xs font-semibold text-[#86efac] border border-[#164d3b]">
                  TH • คนไทย
                </span>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-200 font-medium">ผู้ใหญ่</span>
                  <span className="text-lg sm:text-xl font-bold text-white tracking-wide">
                    {feeInfo.isFree ? "ฟรี" : `฿${feeInfo.thaiAdult}`}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-emerald-100/70 font-normal">เด็ก (3–14 ปี)</span>
                  <span className="text-lg sm:text-xl font-bold text-white tracking-wide">
                    {feeInfo.isFree ? "ฟรี" : `฿${feeInfo.thaiChild}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Foreigner Rate Card */}
            <div className="rounded-2xl border border-[#124133] bg-[#07261d]/90 p-4 space-y-3 shadow-sm">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#0a3530] px-2.5 py-0.5 text-xs font-semibold text-[#7dd3fc] border border-[#134944]">
                  <span className="text-[11px]">🌐</span> ต่างชาติ
                </span>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-200 font-medium">Adult</span>
                  <span className="text-lg sm:text-xl font-bold text-white tracking-wide">
                    {feeInfo.isFree ? "Free" : `฿${feeInfo.foreignAdult}`}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-emerald-100/70 font-normal">Child</span>
                  <span className="text-lg sm:text-xl font-bold text-white tracking-wide">
                    {feeInfo.isFree ? "Free" : `฿${feeInfo.foreignChild}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Exemption Strip */}
          <div className="rounded-2xl bg-[#062018] border border-[#0f3c30] p-3 sm:p-3.5 flex items-center gap-2.5 text-xs text-emerald-200/80">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0c3629] text-[#86efac] text-[10px]">
              ✦
            </div>
            <div>
              <strong className="font-bold text-white mr-1.5">เข้าฟรี:</strong>
              <span>ผู้สูงอายุ 60 ปีขึ้นไป เด็กเล็กต่ำกว่า 3 ปี และพระภิกษุสงฆ์</span>
            </div>
          </div>
        </div>

        {/* Vehicles Section */}
        <div className="space-y-3 pt-3 border-t border-[#0f3c30]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                ค่ายานพาหนะ & ค่าที่จอดรถ
              </h3>
              <p className="text-xs text-emerald-300/60 mt-0.5">
                อัตราต่อคันที่นำเข้าเขตอุทยาน
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-300/80 bg-[#0a2e24] px-2.5 py-0.5 rounded-full border border-[#144839]">
              <span>🚗</span>
              <span>ชำระต่อคัน</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Car */}
            <div className="rounded-2xl border border-[#124133] bg-[#07261d]/90 p-3.5 flex flex-col justify-between space-y-2 shadow-sm">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-slate-200 font-medium flex items-center gap-1">
                  <span>🚗</span> รถยนต์ 4 ล้อ
                </span>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg sm:text-xl font-bold text-white">฿{feeInfo.vehicles.car}</span>
                  <span className="text-[11px] text-emerald-300/60">/คัน</span>
                </div>
                <p className="text-[10.5px] text-emerald-100/60 mt-0.5">เก๋ง / SUV / ตู้</p>
              </div>
            </div>

            {/* Motorcycle */}
            <div className="rounded-2xl border border-[#124133] bg-[#07261d]/90 p-3.5 flex flex-col justify-between space-y-2 shadow-sm">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-slate-200 font-medium flex items-center gap-1">
                  <span>🛵</span> มอเตอร์ไซค์
                </span>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg sm:text-xl font-bold text-white">฿{feeInfo.vehicles.motorcycle}</span>
                  <span className="text-[11px] text-emerald-300/60">/คัน</span>
                </div>
                <p className="text-[10.5px] text-emerald-100/60 mt-0.5">สองล้อทุกประเภท</p>
              </div>
            </div>

            {/* Bicycle */}
            <div className="rounded-2xl border border-[#124133] bg-[#07261d]/90 p-3.5 flex flex-col justify-between space-y-2 shadow-sm">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-slate-200 font-medium flex items-center gap-1">
                  <span>🚲</span> รถจักรยาน
                </span>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg sm:text-xl font-bold text-[#86efac]">
                    {feeInfo.vehicles.bicycle === 0 ? "ฟรี" : `฿${feeInfo.vehicles.bicycle}`}
                  </span>
                  <span className="text-[11px] text-emerald-300/60">/คัน</span>
                </div>
                <p className="text-[10.5px] text-emerald-100/60 mt-0.5">
                  {feeInfo.vehicles.bicycle === 0 ? "ไม่เสียค่าบริการ" : "จักรยานท่องเที่ยว"}
                </p>
              </div>
            </div>

            {/* Bus / 6+ Wheels */}
            <div className="rounded-2xl border border-[#124133] bg-[#07261d]/90 p-3.5 flex flex-col justify-between space-y-2 shadow-sm">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-slate-200 font-medium flex items-center gap-1">
                  <span>🚌</span> บัส / 6 ล้อ+
                </span>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg sm:text-xl font-bold text-white">
                    ฿{feeInfo.vehicles.truck6Wheel}–{feeInfo.vehicles.bus}
                  </span>
                  <span className="text-[11px] text-emerald-300/60">/คัน</span>
                </div>
                <p className="text-[10.5px] text-emerald-100/60 mt-0.5">รถบรรทุก / บัสใหญ่</p>
              </div>
            </div>
          </div>

          {/* Bottom Vehicle Note */}
          <div className="rounded-2xl bg-[#062018] border border-[#0f3c30] p-3 sm:p-3.5 flex items-center gap-2.5 text-xs text-emerald-200/80">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0c3629] text-[#86efac] text-[10px]">
              ✦
            </div>
            <div>
              <strong className="font-bold text-white mr-1.5">หมายเหตุ:</strong>
              <span>ชำระค่าธรรมเนียมเพียงครั้งเดียว ณ ด่านตรวจทางเข้าหลัก และใช้ได้ตลอดการเข้าชมในวันนั้น</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
