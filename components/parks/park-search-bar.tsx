"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ParkSearchBarProps = {
  defaultQuery?: string;
  defaultProvince?: string;
  provinces: string[];
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
}: ParkSearchBarProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(defaultQuery);
  const [selectedProvince, setSelectedProvince] = useState(defaultProvince);

  useEffect(() => {
    setSearchTerm(defaultQuery);
  }, [defaultQuery]);

  useEffect(() => {
    setSelectedProvince(defaultProvince);
  }, [defaultProvince]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
    }
    if (selectedProvince) {
      params.set("province", selectedProvince);
    }
    const queryStr = params.toString();
    router.push(queryStr ? `/parks?${queryStr}` : "/parks", { scroll: false });
  };

  const handleSuggestionClick = (query: string) => {
    setSearchTerm(query);
    const params = new URLSearchParams();
    params.set("q", query);
    if (selectedProvince) {
      params.set("province", selectedProvince);
    }
    router.push(`/parks?${params.toString()}`, { scroll: false });
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    setSearchTerm("");
    setSelectedProvince("");
    router.push("/parks", { scroll: false });
  };

  const hasFilter = Boolean(defaultQuery || defaultProvince || searchTerm || selectedProvince);

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel relative overflow-hidden rounded-[32px] sm:rounded-[36px] p-5 sm:p-7 border border-white/60 dark:border-emerald-800/40 shadow-lg shadow-emerald-950/5 backdrop-blur-2xl bg-white/85 dark:bg-[#0b1c16]/90"
    >
      {/* Decorative background ambient glow */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl" />

      <div className="relative z-10 mb-5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 px-3.5 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-600/20 dark:ring-emerald-400/30">
          <span>🔍</span>
          <span>ค้นหาสถานที่ & ไฮไลท์อุทยาน</span>
        </div>
        <h2 className="mt-2.5 text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
          ค้นหาอุทยาน น้ำตก ยอดดอย หรือจุดชมวิวที่อยากไป
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-emerald-200/70 font-normal">
          พิมพ์ค้นหาได้ทั้งชื่ออุทยาน, จังหวัด, ชื่อน้ำตก, เส้นทางเดินป่า หรือกิจกรรมที่คุณต้องการ
        </p>
      </div>

      <div className="relative z-10 grid gap-3 sm:grid-cols-[1fr_200px_auto]">
        {/* Search Query Input */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-emerald-200/90 flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span>ค้นหาตามชื่อ / ไฮไลท์สถานที่</span>
          </span>
          <div className="relative">
            <input
              type="search"
              name="q"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="เช่น น้ำตกแม่เกิ๋งหลวง, ทุ่งดอกบัวตอง, ภูสอยดาว..."
              className="form-control text-sm font-medium rounded-2xl bg-white/90 dark:bg-[#0c221b]/90 border-slate-200/80 dark:border-emerald-800/40 focus:ring-2 focus:ring-emerald-500/30 placeholder:text-slate-400 dark:placeholder:text-emerald-300/40"
            />
          </div>
        </label>

        {/* Province Select */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-emerald-200/90 flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>เลือกจังหวัด</span>
          </span>
          <select
            name="province"
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="form-control text-sm font-medium rounded-2xl bg-white/90 dark:bg-[#0c221b]/90 border-slate-200/80 dark:border-emerald-800/40 focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="" className="bg-white text-slate-900 dark:bg-[#0d2820] dark:text-emerald-100">ทุกจังหวัด (ภาคเหนือ)</option>
            {provinces.map((province) => (
              <option key={province} value={province} className="bg-white text-slate-900 dark:bg-[#0d2820] dark:text-emerald-100">
                {province}
              </option>
            ))}
          </select>
        </label>

        {/* Submit & Reset Buttons */}
        <div className="flex items-end gap-2 pt-1 sm:pt-0">
          <button
            type="submit"
            className="glass-button h-[3.6rem] flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold shadow-md shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span>ค้นหา</span>
          </button>

          {hasFilter ? (
            <button
              type="button"
              onClick={handleClear}
              className="ghost-button h-[3.6rem] inline-flex items-center justify-center rounded-2xl px-4 text-xs font-semibold text-slate-600 dark:text-emerald-200 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all cursor-pointer"
              title="ล้างตัวกรอง"
            >
              ล้างค่า
            </button>
          ) : null}
        </div>
      </div>

      {/* Quick Suggestion Chips for Beginners */}
      <div className="relative z-10 mt-3.5 pt-3 border-t border-slate-100 dark:border-white/5">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-emerald-300/80 mr-0.5">
            <span>✨</span> ไฮไลท์แนะนำ:
          </span>
          {popularSuggestions.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleSuggestionClick(item.query)}
              className="inline-flex items-center rounded-full bg-slate-100/90 dark:bg-emerald-950/60 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 px-2.5 py-1 text-[11.5px] font-medium text-slate-700 dark:text-emerald-200 border border-slate-200/70 dark:border-emerald-800/40 shadow-2xs transition-colors active:scale-95 cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
