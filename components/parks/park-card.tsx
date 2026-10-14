import Link from "next/link";
import { Clock, CheckCircle2, Ticket, Car, Zap, ArrowRight } from "lucide-react";

import { getParkEvCharging } from "@/lib/data/park-ev-charging";
import { getParkFeeInfo } from "@/lib/data/park-fees";
import type { ParkListItemDto } from "@/lib/mappers/park-dto";

type ParkCardProps = {
  park: ParkListItemDto;
};

export function ParkCard({ park }: ParkCardProps) {
  const feeInfo = getParkFeeInfo(park.slug, park.nameTh);
  const evCharging = getParkEvCharging(park.slug, park.nameTh);

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
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/40 to-transparent" />

          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/60 px-3 py-1.5 text-xs font-bold text-white shadow-md backdrop-blur-md">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span>{park.province}</span>
            </span>
            <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-950/80 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-300 shadow-sm backdrop-blur-md">
              ภาคเหนือ
            </span>
          </div>

          <div className="absolute inset-x-4 bottom-4">
            <h2
              className="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-emerald-300 transition-colors drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] leading-snug break-words"
              title={park.nameTh}
            >
              {park.nameTh}
            </h2>
            <p className="mt-1 text-sm font-medium text-emerald-200/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] leading-snug break-words">
              {park.nameEn ?? "Northern Thailand National Park"}
            </p>
          </div>
        </div>

        <div className="ticket-divider space-y-3.5 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="guide-chip bg-[var(--mint)]/70 inline-flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-700 dark:text-emerald-300" />
              <span>เปิด {park.openTime} - {park.closeTime} น.</span>
            </span>
            {feeInfo.isFree ? (
              <span className="guide-chip bg-emerald-100 dark:bg-emerald-950 font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>เข้าชมฟรี (เตรียมการฯ)</span>
              </span>
            ) : (
              <span className="guide-chip bg-emerald-50 dark:bg-emerald-950/60 font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40 inline-flex items-center gap-1">
                <Ticket className="w-3 h-3 text-emerald-700 dark:text-emerald-300" />
                <span>ไทย ฿{feeInfo.thaiAdult}</span>
                <span className="opacity-40">·</span>
                <Car className="w-3 h-3 text-emerald-700 dark:text-emerald-300" />
                <span>฿{feeInfo.vehicles.car}</span>
              </span>
            )}
            {evCharging.hasEvCharger ? (
              <span className="guide-chip bg-emerald-100/90 dark:bg-emerald-950/80 font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-400/50 inline-flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>จุดชาร์จ EV</span>
              </span>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs font-medium text-[var(--muted)]">กดเพื่อดูจุดเด่นและวางแผนทริป</p>
            <span className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-500 dark:to-teal-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-950/20 ring-1 ring-white/20 dark:ring-emerald-300/30 transition-all group-hover:brightness-110 group-hover:shadow-lg active:scale-95">
              <span>ดูรายละเอียด</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
