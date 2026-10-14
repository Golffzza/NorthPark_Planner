"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { getParkContactInfo, getPrimaryPhone } from "@/lib/data/park-addresses";
import { getParkEvCharging } from "@/lib/data/park-ev-charging";
import type { ParkDetailDto } from "@/lib/mappers/park-dto";

type ParkDetailHeroProps = {
  park: ParkDetailDto;
};

export function ParkDetailHero({ park }: ParkDetailHeroProps) {
  const router = useRouter();
  const contactInfo = getParkContactInfo(park.slug, park.nameTh, park.province);
  const primaryPhone = getPrimaryPhone(contactInfo.phone);
  const evCharging = getParkEvCharging(park.slug, park.nameTh);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/parks");
    }
  };

  return (
    <section className="soft-card overflow-hidden rounded-[38px]">
      <div className="relative min-h-[19rem] sm:min-h-[22rem] overflow-hidden">
        {park.coverImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-[center_top] sm:bg-center"
            style={{ backgroundImage: `url(${park.coverImageUrl})` }}
            role="img"
            aria-label={park.nameTh}
          />
        ) : (
          <div className="park-media-placeholder absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,22,17,0.30)_0%,rgba(2,18,14,0.72)_38%,rgba(1,8,6,0.96)_75%,rgba(1,8,6,0.99)_100%)]" />

        <div className="relative flex flex-col p-4 pt-3.5 sm:p-8 sm:pt-6">
          {/* Top Bar: Minimal back button with 40px touch target & 12-16px gap to title */}
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-10 min-h-[40px] items-center gap-1.5 rounded-full bg-black/55 hover:bg-black/80 px-3 text-xs font-semibold text-slate-200 hover:text-white border border-white/25 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-sm"
              aria-label="ย้อนกลับ"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 19-7-7 7-7" />
              </svg>
              <span>ย้อนกลับ</span>
            </button>
          </div>

          <div className="max-w-3xl">
            <h1
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-normal text-white leading-snug break-words drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]"
              title={park.nameTh}
            >
              {park.nameTh}
            </h1>
            <p className="mt-2 text-base sm:text-lg font-bold text-emerald-300 leading-snug break-words drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
              {park.nameEn ?? "Northern Thailand National Park"}
            </p>
            <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-100 font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
              {park.description}
            </p>

            {/* Featured Opening Hours Row (เวลาเปิด-ปิด เด่นเป็นบรรทัดเฉพาะตัว) */}
            <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-black/65 px-4 py-2 border border-emerald-400/30 backdrop-blur-md shadow-md w-fit">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                </svg>
              </span>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs font-semibold text-emerald-200/80">เวลาเปิด-ปิด:</span>
                <span className="font-bold text-white tracking-wide">
                  {park.openTime} – {park.closeTime} น.
                </span>
              </div>
            </div>

            {/* Compact Metadata Tags Row (แท็กข้อมูลขนาดเล็ก สไตล์เดียวกัน เรียงเป็นระเบียบ) */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* จังหวัด & ภาค */}
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1 text-xs font-medium text-slate-200 border border-white/15 backdrop-blur-sm shadow-sm">
                <svg className="h-3.5 w-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span>{park.province}</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-300 font-semibold">ภาคเหนือ</span>
              </span>

              {/* ลักษณะพื้นที่ */}
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1 text-xs font-medium text-slate-200 border border-white/15 backdrop-blur-sm shadow-sm">
                <svg className="h-3.5 w-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3L4 15h5l-3 6h12l-3-6h5L12 3z" />
                  <path d="M12 21v2" />
                </svg>
                <span>ธรรมชาติและผืนป่า</span>
              </span>

              {/* จุดชาร์จ EV */}
              {evCharging.hasEvCharger ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/70 px-2.5 py-1 text-xs font-medium text-emerald-300 border border-emerald-500/30 backdrop-blur-sm shadow-sm">
                  <svg className="h-3.5 w-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{evCharging.badgeLabel}</span>
                </span>
              ) : null}
            </div>

            {/* Contact Actions (ปุ่มติดต่อแยกแถวชัดเจน) */}
            {(contactInfo.facebookUrl || primaryPhone) && (
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                {contactInfo.facebookUrl ? (
                  <a
                    href={contactInfo.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#1877F2]/90 hover:bg-[#1877F2] px-3 text-xs font-semibold text-white backdrop-blur-md shadow-sm transition-all hover:scale-105 active:scale-95"
                    title="ไปยัง Facebook แฟนเพจทางการของอุทยาน"
                  >
                    <svg className="h-3.5 w-3.5 shrink-0 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>Facebook แฟนเพจ</span>
                  </a>
                ) : null}

                {primaryPhone ? (
                  <a
                    href={`tel:${primaryPhone}`}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full bg-emerald-600/90 hover:bg-emerald-600 px-3 text-xs font-semibold text-white backdrop-blur-md shadow-sm transition-all hover:scale-105 active:scale-95"
                    title={`โทรติดต่อ: ${contactInfo.phone}`}
                  >
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>โทรติดต่อ</span>
                  </a>
                ) : null}
              </div>
            )}

            <div className="mt-6 flex">
              <Link
                href={`/trips/new?parkId=${park.id}`}
                className="group inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-sm font-bold font-heading !text-[#04221a] shadow-lg shadow-black/20 transition-all hover:bg-emerald-50 active:scale-95"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600/15 text-emerald-800 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fillOpacity="0.5" />
                  </svg>
                </div>
                <span className="!text-[#04221a] font-bold font-heading">วางแผนทริปไปที่นี่</span>
                <svg className="h-4 w-4 text-emerald-800 transition-transform duration-200 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
