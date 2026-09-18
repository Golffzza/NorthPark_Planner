import Link from "next/link";

import type { ParkDetailDto } from "@/lib/mappers/park-dto";

type ParkDetailHeroProps = {
  park: ParkDetailDto;
};

export function ParkDetailHero({ park }: ParkDetailHeroProps) {
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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,22,17,0.25)_0%,rgba(2,18,14,0.6)_45%,rgba(1,12,9,0.92)_100%)]" />

        <div className="relative flex min-h-[31rem] flex-col justify-between px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/50 px-3.5 py-1.5 text-xs font-bold text-white shadow-md backdrop-blur-md">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span>{park.province}</span>
            </span>
            <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-950/60 px-3 py-1.5 text-[11px] font-bold tracking-wider text-emerald-300 shadow-sm backdrop-blur-md">
              ภาคเหนือ
            </span>
          </div>

          <div className="max-w-3xl">
            <h1
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight break-words drop-shadow-md"
              title={park.nameTh}
            >
              {park.nameTh}
            </h1>
            <p className="mt-2 text-base font-semibold text-emerald-200/90 leading-snug break-words drop-shadow-sm">
              {park.nameEn ?? "Northern Thailand National Park"}
            </p>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-100 font-medium sm:text-base drop-shadow-sm">{park.description}</p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md border border-white/25 shadow-sm">
                <span className="text-emerald-300 font-bold">🕒</span>
                <span>เปิด-ปิด: {park.openTime} - {park.closeTime} น.</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md border border-white/25 shadow-sm">
                <span className="text-emerald-300 font-bold">🌲</span>
                <span>ลักษณะพื้นที่: ธรรมชาติและผืนป่า</span>
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/trips/new?parkId=${park.id}`}
                className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-sm font-extrabold !text-[#04221a] shadow-lg shadow-black/20 transition-all hover:bg-emerald-50 active:scale-95"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600/15 text-emerald-800 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
              <Link
                href="/parks"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-[#04221a]/85 px-7 py-3.5 text-sm font-bold !text-white shadow-md backdrop-blur-md transition-all hover:bg-[#04221a] active:scale-95"
              >
                <svg className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
                <span className="!text-white font-bold">กลับไปหน้าอุทยาน</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
