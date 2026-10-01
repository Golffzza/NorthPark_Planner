"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TripCard } from "@/components/trips/trip-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { TripListDto } from "@/lib/mappers/trip-dto";

type TripsListViewProps = {
  trips: TripListDto[];
};

export function TripsListView({ trips }: TripsListViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "EVALUATED" | "DRAFT" | "CANCELLED">("ALL");

  // Summary statistics
  const stats = useMemo(() => {
    const total = trips.length;
    const evaluated = trips.filter((t) => t.latestEvaluation !== undefined).length;
    const highReady = trips.filter((t) => (t.latestEvaluation?.totalScore ?? 0) >= 80).length;
    const cancelled = trips.filter((t) => t.status === "CANCELLED").length;
    return { total, evaluated, highReady, cancelled };
  }, [trips]);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      // Status filter
      if (selectedFilter === "EVALUATED" && !trip.latestEvaluation) return false;
      if (selectedFilter === "DRAFT" && trip.status !== "DRAFT") return false;
      if (selectedFilter === "CANCELLED" && trip.status !== "CANCELLED") return false;

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchNameTh = trip.park.nameTh.toLowerCase().includes(query);
        const matchNameEn = trip.park.nameEn?.toLowerCase().includes(query) ?? false;
        const matchProvince = trip.park.province.toLowerCase().includes(query);
        const matchOrigin = trip.originText.toLowerCase().includes(query);
        return matchNameTh || matchNameEn || matchProvince || matchOrigin;
      }

      return true;
    });
  }, [trips, selectedFilter, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Quick Summary Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="rounded-2xl p-3 sm:p-4 bg-white/90 dark:bg-emerald-950/40 border border-slate-200/80 dark:border-emerald-500/20 backdrop-blur-md shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-emerald-300/70">
            <span>🗺️</span> ทริปทั้งหมด
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black font-heading text-slate-900 dark:text-white">
            {stats.total} <span className="text-xs font-normal text-slate-600 dark:text-emerald-200/60">รายการ</span>
          </p>
        </div>

        <div className="rounded-2xl p-3 sm:p-4 bg-white/90 dark:bg-emerald-950/40 border border-slate-200/80 dark:border-emerald-500/20 backdrop-blur-md shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-800 dark:text-cyan-300">
            <span>📊</span> ประเมินแล้ว
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black font-heading text-cyan-900 dark:text-cyan-200">
            {stats.evaluated} <span className="text-xs font-normal text-slate-600 dark:text-emerald-200/60">ทริป</span>
          </p>
        </div>

        <div className="rounded-2xl p-3 sm:p-4 bg-white/90 dark:bg-emerald-950/40 border border-slate-200/80 dark:border-emerald-500/20 backdrop-blur-md shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <span>🛡️</span> ความพร้อมสูง (80+)
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black font-heading text-emerald-900 dark:text-emerald-300">
            {stats.highReady} <span className="text-xs font-normal text-slate-600 dark:text-emerald-200/60">ทริป</span>
          </p>
        </div>

        <div className="rounded-2xl p-3 sm:p-4 bg-white/90 dark:bg-emerald-950/40 border border-slate-200/80 dark:border-emerald-500/20 backdrop-blur-md shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span>📁</span> จัดการทริป
          </div>
          <Link
            href="/trips/new"
            className="mt-1 inline-flex items-center gap-1 text-xs font-bold font-heading text-emerald-800 dark:text-emerald-400 hover:underline"
          >
            + วางแผนเพิ่ม →
          </Link>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-2xl bg-white/80 dark:bg-black/30 border border-slate-200/60 dark:border-white/5 backdrop-blur-md">
        {/* Search input */}
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่ออุทยาน, จังหวัด, หรือจุดเริ่มต้น..."
            className="w-full rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedFilter("ALL")}
            className={`rounded-full px-3 py-1.5 text-xs font-bold font-heading transition-all whitespace-nowrap cursor-pointer ${
              selectedFilter === "ALL"
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-slate-600 dark:text-emerald-200/70 hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            ทั้งหมด ({trips.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("EVALUATED")}
            className={`rounded-full px-3 py-1.5 text-xs font-bold font-heading transition-all whitespace-nowrap cursor-pointer ${
              selectedFilter === "EVALUATED"
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-slate-600 dark:text-emerald-200/70 hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            ประเมินแล้ว ({stats.evaluated})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("DRAFT")}
            className={`rounded-full px-3 py-1.5 text-xs font-bold font-heading transition-all whitespace-nowrap cursor-pointer ${
              selectedFilter === "DRAFT"
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-slate-600 dark:text-emerald-200/70 hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            ฉบับร่าง
          </button>
          {stats.cancelled > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFilter("CANCELLED")}
              className={`rounded-full px-3 py-1.5 text-xs font-bold font-heading transition-all whitespace-nowrap cursor-pointer ${
                selectedFilter === "CANCELLED"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-slate-600 dark:text-rose-300/70 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              ยกเลิกแล้ว ({stats.cancelled})
            </button>
          )}
        </div>
      </div>

      {/* Grid of Cards */}
      {filteredTrips.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {filteredTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </section>
      ) : (
        <EmptyState
          title={searchQuery ? "ไม่พบทริปที่ตรงกับการค้นหา" : "ยังไม่มีทริปในระบบ"}
          description={
            searchQuery
              ? "ลองค้นหาด้วยคำอื่น หรือกดล้างการค้นหาเพื่อดูทริปทั้งหมด"
              : "เริ่มสร้างทริปแรกของคุณเพื่อเก็บแผนการเดินทางและดูผลประเมินความปลอดภัย"
          }
          actionLabel={searchQuery ? "ล้างการค้นหา" : "สร้างทริปแรก"}
          actionHref={searchQuery ? undefined : "/trips/new"}
          onActionClick={searchQuery ? () => { setSearchQuery(""); setSelectedFilter("ALL"); } : undefined}
        />
      )}
    </div>
  );
}
