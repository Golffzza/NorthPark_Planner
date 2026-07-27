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

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] bg-white/16 px-4 py-4 text-white backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">เวลาเปิด</p>
                <p className="mt-2 text-lg font-semibold">{park.openTime}</p>
              </div>
              <div className="rounded-[24px] bg-white/16 px-4 py-4 text-white backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">เวลาปิด</p>
                <p className="mt-2 text-lg font-semibold">{park.closeTime}</p>
              </div>
              <div className="rounded-[24px] bg-white/16 px-4 py-4 text-white backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">Guide Style</p>
                <p className="mt-2 text-lg font-semibold">Nature Companion</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/trips/new?parkId=${park.id}`}
                className="inline-flex items-center justify-center rounded-full border border-white/90 bg-white px-5 py-3 text-sm font-semibold text-[var(--forest-deep)] shadow-[0_12px_24px_rgba(20,49,43,0.16)]"
              >
                วางแผนทริปไปที่นี่
              </Link>
              <Link
                href="/parks"
                className="inline-flex items-center justify-center rounded-full border border-white/36 bg-white/12 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm"
              >
                กลับไปหน้าอุทยาน
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
