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
      <div className="relative min-h-[31rem] overflow-hidden">
        {park.coverImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${park.coverImageUrl})` }}
            role="img"
            aria-label={park.nameTh}
          />
        ) : (
          <div className="park-media-placeholder absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,22,17,0.55)_0%,rgba(2,16,12,0.84)_42%,rgba(1,8,6,0.98)_100%)]" />

        <div className="relative flex min-h-[32rem] flex-col justify-between p-6 sm:p-9">
          <div className="flex items-center gap-2 mb-auto">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/30 bg-black/65 px-3.5 text-xs font-bold text-white shadow-md backdrop-blur-md">
              <svg className="h-3.5 w-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span>{park.province}</span>
            </span>
            <span className="inline-flex h-8 items-center rounded-full border border-emerald-400/50 bg-emerald-950/85 px-3 text-[11px] font-bold tracking-wider text-emerald-300 shadow-sm backdrop-blur-md">
              ภาคเหนือ
            </span>
          </div>

          <div className="max-w-3xl mt-8 sm:mt-12">
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

            <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Opening Hours Pill */}
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-black/60 px-3.5 text-xs font-semibold text-white backdrop-blur-md border border-white/25 shadow-sm">
                <svg className="h-3.5 w-3.5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                </svg>
                <span>เปิด-ปิด: {park.openTime} - {park.closeTime} น.</span>
              </span>

              {/* Landscape Type Pill */}
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-black/60 px-3.5 text-xs font-semibold text-white backdrop-blur-md border border-white/25 shadow-sm">
                <svg className="h-3.5 w-3.5 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3L4 15h5l-3 6h12l-3-6h5L12 3z" />
                  <path d="M12 21v2" />
                </svg>
                <span>ลักษณะพื้นที่: ธรรมชาติและผืนป่า</span>
              </span>

              {/* EV Charging Status Badge */}
              {evCharging.hasEvCharger ? (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-950/85 px-3.5 text-xs font-bold text-emerald-300 backdrop-blur-md border border-emerald-400/50 shadow-md">
                  <svg className="h-3.5 w-3.5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{evCharging.badgeLabel}</span>
                </span>
              ) : null}

              {/* Quick Facebook Channel Button */}
              {contactInfo.facebookUrl ? (
                <a
                  href={contactInfo.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#1877F2]/90 hover:bg-[#1877F2] px-3.5 text-xs font-bold text-white backdrop-blur-md shadow-md shadow-blue-950/40 transition-all hover:scale-105 active:scale-95"
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
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-600/90 hover:bg-emerald-600 px-3.5 text-xs font-bold text-white backdrop-blur-md shadow-md transition-all hover:scale-105 active:scale-95"
                  title={`โทรติดต่อ: ${contactInfo.phone}`}
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>โทรติดต่อ</span>
                </a>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/trips/new?parkId=${park.id}`}
                className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-sm font-extrabold !text-[#04221a] shadow-lg shadow-black/20 transition-all hover:bg-emerald-50 active:scale-95"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600/15 text-emerald-800 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" fillOpacity="0.5" />
                  </svg>
                </div>
                <span className="!text-[#04221a] font-extrabold">วางแผนทริปไปที่นี่</span>
                <svg className="h-4 w-4 text-emerald-800 transition-transform duration-200 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
              <button
                type="button"
                onClick={handleBack}
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-[#04221a]/85 px-7 py-3.5 text-sm font-bold !text-white shadow-md backdrop-blur-md transition-all hover:bg-[#04221a] active:scale-95 cursor-pointer"
              >
                <svg className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
                <span className="!text-white font-bold">กลับไปหน้าอุทยาน</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
