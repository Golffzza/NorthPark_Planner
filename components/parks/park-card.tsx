import Link from "next/link";

import type { ParkListItemDto } from "@/lib/mappers/park-dto";

type ParkCardProps = {
  park: ParkListItemDto;
};

export function ParkCard({ park }: ParkCardProps) {
  return (
    <article className="soft-card overflow-hidden rounded-[34px]">
      <div className="relative h-64 overflow-hidden">
        {park.coverImageUrl ? (
          <div
            className="h-full w-full bg-cover bg-center transition duration-500 hover:scale-[1.03]"
            style={{ backgroundImage: `url(${park.coverImageUrl})` }}
            role="img"
            aria-label={park.nameTh}
          />
        ) : (
          <div className="park-media-placeholder h-full w-full" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,34,29,0.04)_0%,rgba(13,34,29,0.68)_100%)]" />

        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
          <span className="guide-chip bg-white/84">{park.province}</span>
          <span className="rounded-full bg-[rgba(18,54,46,0.32)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
            {park.region}
          </span>
        </div>

        <div className="absolute inset-x-4 bottom-4">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">{park.nameTh}</h2>
          <p className="mt-1 text-sm text-white/78">{park.nameEn ?? "Northern Thailand National Park"}</p>
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

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">พร้อมดูรายละเอียดและเริ่มวางแผน</p>
          <Link
            href={`/parks/${park.slug}`}
            className="glass-button inline-flex shrink-0 items-center justify-center rounded-full px-4 py-3 text-sm font-semibold"
          >
            ดูรายละเอียด
          </Link>
        </div>
      </div>
    </article>
  );
}
