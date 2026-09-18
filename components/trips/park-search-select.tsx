"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ParkOption } from "@/lib/services/park-service";

type ParkSearchSelectProps = {
  id?: string;
  parks: ParkOption[];
  selectedParkId: string;
  onSelectPark: (parkId: string) => void;
  hasError?: boolean;
};

// Curated popular parks with short, mobile-friendly labels
const POPULAR_PARK_SLUGS = [
  { slug: "doi-inthanon", icon: "🌲", label: "ดอยอินทนนท์" },
  { slug: "doi-suthep-pui", icon: "⛰️", label: "ดอยสุเทพ" },
  { slug: "huai-nam-dang", icon: "🏔️", label: "ห้วยน้ำดัง" },
  { slug: "sri-nan", icon: "⛺", label: "ดอยเสมอดาว" },
  { slug: "jae-son", icon: "♨️", label: "แจ้ซ้อน" },
  { slug: "phu-chi-fa", icon: "🍃", label: "ภูชี้ฟ้า" },
];

export function ParkSearchSelect({
  id = "parkId",
  parks,
  selectedParkId,
  onSelectPark,
  hasError = false,
}: ParkSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedPark = useMemo(
    () => parks.find((p) => p.id === selectedParkId || p.slug === selectedParkId),
    [parks, selectedParkId],
  );

  // Filter parks by query
  const filteredParks = useMemo(() => {
    if (!searchQuery.trim()) {
      return parks;
    }
    const q = searchQuery.toLowerCase().trim();
    return parks.filter(
      (park) =>
        park.nameTh.toLowerCase().includes(q) ||
        (park.nameEn && park.nameEn.toLowerCase().includes(q)) ||
        park.province.toLowerCase().includes(q),
    );
  }, [parks, searchQuery]);

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (parkId: string) => {
    onSelectPark(parkId);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onSelectPark("");
    setSearchQuery("");
    setIsOpen(true);
    inputRef.current?.focus();
  };

  // If a park is selected and the dropdown is NOT open, show the Selected Park Card
  if (selectedPark && !isOpen) {
    return (
      <div className="space-y-2.5">
        <div
          className={`group relative overflow-hidden rounded-[22px] border bg-[var(--surface-strong)] transition-all duration-300 shadow-md ${
            hasError
              ? "border-rose-400 bg-rose-50/20 ring-2 ring-rose-400/30"
              : "border-[var(--brand-border)] hover:border-[var(--brand-strong)]"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-stretch">
            {/* Thumbnail */}
            <div className="relative h-28 sm:h-auto sm:w-40 shrink-0 overflow-hidden bg-slate-900">
              {selectedPark.coverImageUrl ? (
                <div
                  className="h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${selectedPark.coverImageUrl})` }}
                  role="img"
                  aria-label={selectedPark.nameTh}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-emerald-950 text-2xl text-emerald-400">
                  🌲
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden" />
              <div className="absolute top-2 left-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
                  ✓ เลือกแล้ว
                </span>
              </div>
            </div>

            {/* Info & Details */}
            <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4">
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                    📍 {selectedPark.province}
                  </span>
                  {selectedPark.openTime && selectedPark.closeTime ? (
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)] border border-slate-200/60 dark:border-slate-700/60">
                      ⏰ {selectedPark.openTime} - {selectedPark.closeTime} น.
                    </span>
                  ) : null}
                </div>

                <h4 className="mt-1.5 text-base font-bold text-[var(--foreground)] leading-snug">
                  {selectedPark.nameTh}
                </h4>
                {selectedPark.nameEn ? (
                  <p className="text-[11px] text-[var(--muted)] truncate">
                    {selectedPark.nameEn}
                  </p>
                ) : null}
              </div>

              {/* Action Toolbar */}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(true);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)] transition-all hover:bg-emerald-200/80 dark:hover:bg-emerald-900 active:scale-95"
                  >
                    🔄 เปลี่ยน
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-full px-2 py-1 text-xs text-[var(--muted)] hover:text-rose-600 transition-colors"
                  >
                    ล้าง
                  </button>
                </div>

                <Link
                  href={`/parks/${selectedPark.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[var(--brand-strong)] hover:underline"
                >
                  ดูข้อมูล ↗
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-3">
      {/* 🌟 Quick Recommendations */}
      <div>
        <p className="text-xs font-semibold text-[var(--muted)]">🌟 อุทยานยอดนิยม</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {POPULAR_PARK_SLUGS.map((item) => {
            const parkMatch = parks.find((p) => p.slug === item.slug);
            if (!parkMatch) return null;
            const isSelected = selectedParkId === parkMatch.id || selectedParkId === parkMatch.slug;

            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => handleSelect(parkMatch.id)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-all active:scale-95 ${
                  isSelected
                    ? "bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-500 dark:to-teal-600 text-white shadow-sm font-bold ring-1 ring-white/20 dark:ring-emerald-300/30"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-500"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🔍 Search Input & Results Dropdown */}
      <div className="relative w-full pt-0.5">
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center text-[var(--muted)]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="ค้นหาชื่ออุทยาน หรือจังหวัด..."
            className={`form-control !pl-10.5 !pr-20 py-2.5 text-xs sm:text-sm font-medium transition-all placeholder:text-[var(--muted)] ${
              hasError ? "border-rose-400 bg-rose-50/40 ring-2 ring-rose-400/30" : ""
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="rounded-full p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                title="ล้างคำค้นหา"
              >
                ✕
              </button>
            ) : null}
            <span className="rounded-full bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
              {filteredParks.length} แห่ง
            </span>
          </div>
        </div>

        {/* Dropdown Options List */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-64 overflow-y-auto rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-strong)] p-1.5 shadow-2xl backdrop-blur-2xl">
            <div className="px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)] border-b border-[var(--border)] mb-1 flex items-center justify-between">
              <span>ผลการค้นหา ({filteredParks.length})</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[10px] text-[var(--brand-strong)] hover:underline"
              >
                ปิด ✕
              </button>
            </div>

            {filteredParks.length > 0 ? (
              <div className="space-y-0.5">
                {filteredParks.map((park) => {
                  const isSelected = park.id === selectedParkId || park.slug === selectedParkId;
                  return (
                    <button
                      key={park.id}
                      type="button"
                      onClick={() => handleSelect(park.id)}
                      className={`group flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-all ${
                        isSelected
                          ? "bg-[var(--brand-soft)] text-[var(--brand-strong)] font-semibold dark:bg-emerald-900/60 dark:text-emerald-300 ring-1 ring-emerald-500/40"
                          : "text-[var(--foreground)] hover:bg-slate-100/90 dark:hover:bg-emerald-950/50"
                      }`}
                    >
                      {/* Mini Thumbnail */}
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                        {park.coverImageUrl ? (
                          <div
                            className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                            style={{ backgroundImage: `url(${park.coverImageUrl})` }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm">
                            🌲
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex flex-1 flex-col min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-xs font-bold text-[var(--foreground)] group-hover:text-[var(--brand-strong)]">
                            {park.nameTh}
                          </span>
                          {isSelected ? (
                            <span className="shrink-0 rounded-full bg-emerald-500 px-1.5 py-0.2 text-[9px] font-bold text-white">
                              ✓ เลือกอยู่
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                          <span>📍 {park.province}</span>
                          {park.openTime && park.closeTime ? (
                            <span className="text-[10px] opacity-75">· ⏰ {park.openTime}-{park.closeTime}</span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-4 text-center space-y-1">
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  ไม่พบอุทยานที่ตรงกับ &quot;{searchQuery}&quot;
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-1 inline-flex items-center rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--brand-strong)]"
                >
                  แสดงทั้งหมด
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
