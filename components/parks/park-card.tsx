import Link from "next/link";

import type { ParkListItemDto } from "@/lib/mappers/park-dto";

type ParkCardProps = {
  park: ParkListItemDto;
};

export function ParkCard({ park }: ParkCardProps) {
  return (
    <Link
      href={`/parks/${park.slug}`}
      className="group block cursor-pointer transition-transform duration-300 hover:-translate-y-1"
    >
      <article className="soft-card overflow-hidden rounded-[34px] transition-shadow duration-300 group-hover:shadow-xl">
        <div className="relative h-64 overflow-hidden">
          {park.coverImageUrl ? (
            <div
              className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url(${park.coverImageUrl})` }}
              role="img"
              aria-label={park.nameTh}
            />
          ) : (
            <div className="park-media-placeholder h-full w-full" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,34,29,0.04)_0%,rgba(13,34,29,0.72)_100%)]" />

          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
            <span className="guide-chip bg-white/90 font-semibold">{park.province}</span>
            <span className="rounded-full bg-black/40 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300 backdrop-blur-md border border-white/20">
              {park.region}
            </span>
          </div>

          <div className="absolute inset-x-4 bottom-4">
            <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-emerald-200 transition-colors drop-shadow-sm">
              {park.nameTh}
            </h2>
            <p className="mt-1 text-sm font-medium text-white/85 drop-shadow-xs">
              {park.nameEn ?? "Northern Thailand National Park"}
            </p>
          </div>
        </div>

        <div className="ticket-divider space-y-4 p-5">
          <p className="line-clamp-3 text-sm leading-7 text-[var(--muted)]">{park.description}</p>

          <div className="flex flex-wrap gap-2">
            <span className="guide-chip bg-[var(--mint)]/70">เปิด {park.openTime}</span>
            <span className="guide-chip bg-white/76">ปิด {park.closeTime}</span>
          </div>

          <div className="dashboard-card rounded-[26px] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Travel Guide Mood</p>
            <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">
              เหมาะสำหรับใช้เป็นจุดเริ่มต้นดูข้อมูลอุทยาน จุดเด่น และไปต่อสู่การวางแผนทริปได้ทันที
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-sm font-medium text-[var(--muted)]">พร้อมดูรายละเอียดและเริ่มวางแผน</p>
            <span className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--brand-strong)] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all group-hover:bg-emerald-800 active:scale-95">
              <span>ดูรายละเอียด</span>
              <span>→</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
