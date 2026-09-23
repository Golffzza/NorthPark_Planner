"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { getParkEvCharging } from "@/lib/data/park-ev-charging";
import type { ParkOption } from "@/lib/services/park-service";

type ParkSearchBarProps = {
  defaultQuery?: string;
  defaultProvince?: string;
  provinces: string[];
  parks?: ParkOption[];
};

const popularSuggestions = [
  { label: "💦 น้ำตกแม่เกิ๋งหลวง", query: "น้ำตกแม่เกิ๋งหลวง" },
  { label: "🌼 ทุ่งดอกบัวตอง", query: "ทุ่งดอกบัวตอง" },
  { label: "🌲 ลานสนภูสอยดาว", query: "ลานสนสามใบ" },
  { label: "⛰️ ยอดภูเมี่ยง", query: "ยอดภูเมี่ยง" },
  { label: "🚤 ล่องเรือสาละวิน", query: "ล่องเรือ" },
  { label: "🌅 กิ่วแม่ปาน", query: "กิ่วแม่ปาน" },
  { label: "⛺ ลานกางเต็นท์", query: "ลานกางเต็นท์" },
];

export function ParkSearchBar({
  defaultQuery = "",
  defaultProvince = "",
  provinces,
  parks = [],
}: ParkSearchBarProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(defaultQuery);
  const [selectedProvince, setSelectedProvince] = useState(defaultProvince);
  const [isOpen, setIsOpen] = useState(false);
  const [isProvinceOpen, setIsProvinceOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const provinceContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(defaultQuery);
  }, [defaultQuery]);

  useEffect(() => {
    setSelectedProvince(defaultProvince);
  }, [defaultProvince]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (provinceContainerRef.current && !provinceContainerRef.current.contains(event.target as Node)) {
        setIsProvinceOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredParks = useMemo(() => {
    if (!parks || parks.length === 0) return [];
    let list = parks;
    if (selectedProvince) {
      list = list.filter((p) => p.province === selectedProvince);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.nameTh.toLowerCase().includes(q) ||
          (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
          p.province.toLowerCase().includes(q)
      );
    }
    return list;
  }, [parks, searchTerm, selectedProvince]);

  const scrollToResults = () => {
    setTimeout(() => {
      const el = document.getElementById("park-results");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsOpen(false);
    setIsProvinceOpen(false);
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
    }
    if (selectedProvince) {
      params.set("province", selectedProvince);
    }
    const queryStr = params.toString();
    router.push(queryStr ? `/parks?${queryStr}` : "/parks", { scroll: false });
    scrollToResults();
  };

  const handleSuggestionClick = (query: string) => {
    setSearchTerm(query);
    setIsOpen(false);
    setIsProvinceOpen(false);
    const params = new URLSearchParams();
    params.set("q", query);
    if (selectedProvince) {
      params.set("province", selectedProvince);
    }
    router.push(`/parks?${params.toString()}`, { scroll: false });
    scrollToResults();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    setSearchTerm("");
    setSelectedProvince("");
    setIsOpen(false);
    setIsProvinceOpen(false);
    router.push("/parks", { scroll: false });
  };

  const hasFilter = Boolean(defaultQuery || defaultProvince || searchTerm || selectedProvince);

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      className="glass-panel relative overflow-visible rounded-3xl p-4 sm:p-6 border border-white/60 dark:border-emerald-800/40 shadow-lg shadow-emerald-950/5 backdrop-blur-2xl bg-white/85 dark:bg-[#0b1c16]/90"
    >
      {/* Decorative background ambient glow */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl" />

      {/* Header Info */}
      <div className="relative z-10 mb-4 sm:mb-5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-600/20 dark:ring-emerald-400/30">
          <span>🔍</span>
          <span>ค้นหาสถานที่ & ไฮไลท์อุทยาน</span>
        </div>
        <h2 className="mt-2.5 text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white leading-snug font-heading">
          ค้นหาอุทยาน น้ำตก ยอดดอย หรือจุดชมวิว
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm md:text-base text-slate-600 dark:text-emerald-200/80 font-normal leading-relaxed">
          ค้นหาด้วยชื่ออุทยาน จังหวัด น้ำตก หรือจุดชมวิวที่สนใจ
        </p>
      </div>

      {/* Main Search Controls Grid */}
      <div className="relative z-20 grid gap-3 sm:grid-cols-[1fr_210px_auto]">
        {/* Search Query Input with Dropdown Popup */}
        <div ref={searchContainerRef} className="relative flex flex-col gap-1.5">
          <label htmlFor="park-search-input" className="text-xs font-semibold text-slate-700 dark:text-emerald-200/90 flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span>ค้นหาตามชื่อ / ไฮไลท์สถานที่</span>
          </label>
          <div className="relative">
            <input
              id="park-search-input"
              type="search"
              name="q"
              value={searchTerm}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!isOpen) setIsOpen(true);
                setIsProvinceOpen(false);
              }}
              onFocus={() => {
                setIsOpen(true);
                setIsProvinceOpen(false);
              }}
              placeholder="ค้นหาชื่ออุทยาน หรือจังหวัด..."
              className="h-11 sm:h-12 w-full rounded-2xl border border-slate-200/80 bg-white/95 px-3.5 pr-20 text-xs sm:text-sm font-medium text-slate-900 shadow-xs outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-emerald-800/50 dark:bg-[#0c221b]/95 dark:text-white dark:placeholder:text-emerald-300/40"
            />
            {parks.length > 0 ? (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-emerald-300/80">
                {filteredParks.length} แห่ง
              </span>
            ) : null}
          </div>

          {/* Autocomplete Dropdown Popup */}
          {isOpen && filteredParks.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-64 overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-emerald-800/60 bg-white/98 dark:bg-[#0c231c] p-1.5 shadow-2xl backdrop-blur-2xl ring-1 ring-black/10 dark:ring-emerald-500/20">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:text-emerald-300/80 border-b border-slate-100 dark:border-white/10 mb-1 flex items-center justify-between">
                <span>ผลการค้นหา ({filteredParks.length})</span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  ปิด ✕
                </button>
              </div>

              <div className="space-y-0.5">
                {filteredParks.map((park) => {
                  const evCharging = getParkEvCharging(park.slug, park.nameTh);
                  return (
                    <button
                      key={park.id}
                      type="button"
                      onClick={() => {
                        setSearchTerm(park.nameTh);
                        setIsOpen(false);
                        router.push(`/parks/${park.slug}`);
                      }}
                      className="group flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-all text-slate-800 dark:text-white hover:bg-slate-100/90 dark:hover:bg-emerald-950/60 cursor-pointer"
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
                        <span className="truncate text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          {park.nameTh}
                        </span>

                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-emerald-200/70">
                          <span>📍 {park.province}</span>
                          {park.openTime && park.closeTime ? (
                            <span className="text-[10px] opacity-75">· ⏰ {park.openTime}-{park.closeTime}</span>
                          ) : null}
                        </div>

                        {evCharging.hasEvCharger ? (
                          <div className="mt-1 flex items-center">
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/15 dark:bg-emerald-400/20 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              ⚡ มีจุดชาร์จ EV
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Custom Styled Province Dropdown */}
        <div ref={provinceContainerRef} className="relative flex flex-col gap-1.5">
          <input type="hidden" name="province" value={selectedProvince} />
          <span className="text-xs font-semibold text-slate-700 dark:text-emerald-200/90 flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>เลือกจังหวัด</span>
          </span>

          <button
            type="button"
            onClick={() => {
              setIsProvinceOpen((prev) => !prev);
              setIsOpen(false);
            }}
            className="flex h-11 sm:h-12 w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white/95 px-3.5 text-xs sm:text-sm font-medium text-slate-900 shadow-xs outline-none transition-all hover:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-emerald-800/50 dark:bg-[#0c221b]/95 dark:text-white cursor-pointer"
          >
            <span className="truncate">
              {selectedProvince ? `จ.${selectedProvince}` : "ทุกจังหวัด (ภาคเหนือ)"}
            </span>
            <svg
              className={`h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 transition-transform duration-200 ${
                isProvinceOpen ? "rotate-180" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {/* Floating Province Dropdown Popup */}
          {isProvinceOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-64 overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-emerald-800/60 bg-white/98 dark:bg-[#0c231c] p-1.5 shadow-2xl backdrop-blur-2xl ring-1 ring-black/10 dark:ring-emerald-500/20">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:text-emerald-300/80 border-b border-slate-100 dark:border-white/10 mb-1 flex items-center justify-between">
                <span>เลือกจังหวัด (ภาคเหนือ)</span>
                <button
                  type="button"
                  onClick={() => setIsProvinceOpen(false)}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  ปิด ✕
                </button>
              </div>

              <div className="space-y-0.5">
                {/* All Provinces Option */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProvince("");
                    setIsProvinceOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all cursor-pointer ${
                    !selectedProvince
                      ? "bg-emerald-500/15 dark:bg-emerald-400/20 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/40 font-bold"
                      : "text-slate-800 dark:text-white hover:bg-slate-100/90 dark:hover:bg-emerald-950/60"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>🌲</span>
                    <span>ทุกจังหวัด (ภาคเหนือ)</span>
                  </span>
                  <span className="text-[10px] opacity-75 font-normal">
                    {parks.length} แห่ง
                  </span>
                </button>

                {/* Specific Provinces */}
                {provinces.map((province) => {
                  const isSelected = selectedProvince === province;
                  const parkCount = parks.filter((p) => p.province === province).length;
                  return (
                    <button
                      key={province}
                      type="button"
                      onClick={() => {
                        setSelectedProvince(province);
                        setIsProvinceOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-500/15 dark:bg-emerald-400/20 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/40 font-bold"
                          : "text-slate-800 dark:text-white hover:bg-slate-100/90 dark:hover:bg-emerald-950/60"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>📍</span>
                        <span>{province}</span>
                      </span>
                      {parkCount > 0 ? (
                        <span className="rounded-md bg-emerald-500/10 dark:bg-emerald-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                          {parkCount} แห่ง
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Submit & Reset Buttons */}
        <div className="flex items-end gap-2 pt-0.5 sm:pt-0">
          <button
            type="submit"
            className="flex-1 sm:flex-none inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-6 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-emerald-500/20 transition-all hover:brightness-105 active:scale-95 cursor-pointer"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span>ค้นหา</span>
          </button>

          {hasFilter ? (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex h-11 sm:h-12 items-center justify-center gap-1.5 rounded-2xl border border-slate-300 dark:border-emerald-700/60 bg-slate-100 hover:bg-rose-50 dark:bg-emerald-950/80 dark:hover:bg-rose-950/40 px-4 text-xs sm:text-sm font-semibold text-slate-700 hover:text-rose-600 dark:text-emerald-100 dark:hover:text-rose-200 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="ล้างค่าการค้นหาและตัวกรอง"
            >
              <svg className="h-3.5 w-3.5 text-slate-500 hover:text-rose-500 dark:text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              <span>ล้างค่า</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Quick Suggestion Chips for Beginners */}
      <div className="relative z-10 mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-emerald-300/80 mr-0.5">
            <span>✨</span> ไฮไลท์แนะนำ:
          </span>
          {popularSuggestions.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleSuggestionClick(item.query)}
              className="inline-flex items-center rounded-full bg-slate-100/90 dark:bg-emerald-950/60 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-slate-700 dark:text-emerald-200 border border-slate-200/70 dark:border-emerald-800/40 shadow-2xs transition-colors active:scale-95 cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
