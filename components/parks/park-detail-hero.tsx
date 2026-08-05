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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,35,30,0.08)_0%,rgba(12,35,30,0.76)_100%)]" />

        <div className="relative flex min-h-[31rem] flex-col justify-between px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap gap-2">
            <span className="guide-chip bg-white/88">{park.province}</span>
            <span className="rounded-full bg-white/16 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
              {park.region}
            </span>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
              {park.nameTh}
            </h1>
            <p className="mt-2 text-base text-white/78">{park.nameEn ?? "Northern Thailand National Park"}</p>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/82 sm:text-base">{park.description}</p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md border border-white/20 shadow-xs">
                <span className="text-emerald-300 font-bold">🕒</span>
                <span>เปิด-ปิด: {park.openTime} - {park.closeTime} น.</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md border border-white/20 shadow-xs">
                <span className="text-emerald-300 font-bold">🌲</span>
                <span>ลักษณะพื้นที่: ธรรมชาติและผืนป่า</span>
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/trips/new?parkId=${park.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-extrabold !text-[#04221a] shadow-lg transition-all hover:bg-emerald-50 active:scale-95"
              >
                <span className="!text-[#04221a] font-extrabold">วางแผนทริปไปที่นี่</span>
                <span>🧭</span>
              </Link>
              <Link
                href="/parks"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-[#04221a]/85 px-7 py-3.5 text-sm font-bold !text-white shadow-md backdrop-blur-md transition-all hover:bg-[#04221a] active:scale-95"
              >
                <span className="!text-white font-bold">กลับไปหน้าอุทยาน</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
