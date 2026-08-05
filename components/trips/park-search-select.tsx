"use client";

import { useEffect, useRef, useState } from "react";
import type { ParkOptionDto } from "@/lib/mappers/park-dto";

type ParkSearchSelectProps = {
  id?: string;
  parks: ParkOptionDto[];
  selectedParkId: string;
  onSelectPark: (parkId: string) => void;
  hasError?: boolean;
};

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

  const selectedPark = parks.find((p) => p.id === selectedParkId);

  // Synchronize display text when selectedParkId changes externally
  useEffect(() => {
    if (selectedPark && !isOpen) {
      setSearchQuery(`${selectedPark.nameTh} (${selectedPark.province})`);
    } else if (!selectedParkId && !isOpen) {
      setSearchQuery("");
    }
  }, [selectedParkId, selectedPark, isOpen]);

  // Filter parks by query
  const filteredParks = parks.filter((park) => {
    if (!searchQuery.trim() || searchQuery === `${selectedPark?.nameTh} (${selectedPark?.province})`) {
      return true;
    }
    const q = searchQuery.toLowerCase().trim();
    return (
      park.nameTh.toLowerCase().includes(q) ||
      (park.nameEn && park.nameEn.toLowerCase().includes(q)) ||
      park.province.toLowerCase().includes(q)
    );
  });

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedPark) {
          setSearchQuery(`${selectedPark.nameTh} (${selectedPark.province})`);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedPark]);

  const handleSelect = (parkId: string) => {
    onSelectPark(parkId);
    const park = parks.find((p) => p.id === parkId);
    if (park) {
      setSearchQuery(`${park.nameTh} (${park.province})`);
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectPark("");
    setSearchQuery("");
    setIsOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
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
          placeholder="🔍 พิมพ์เพื่อค้นหาชื่ออุทยาน หรือ จังหวัด..."
          className={`form-control pr-10 text-sm font-medium transition-all placeholder:text-[var(--muted)] ${
            hasError ? "border-rose-400 bg-rose-50/40" : ""
          }`}
        />
        <div className="absolute right-3.5 flex items-center gap-1 text-[var(--muted)]">
          {searchQuery ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700"
              title="ล้างคำค้นหา"
            >
              ✕
            </button>
          ) : null}
          <span className="pointer-events-none text-xs text-slate-400">▼</span>
        </div>
      </div>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 max-h-64 overflow-y-auto rounded-[24px] border border-white/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl">
          {filteredParks.length > 0 ? (
            filteredParks.map((park) => {
              const isSelected = park.id === selectedParkId;
              return (
                <button
                  key={park.id}
                  type="button"
                  onClick={() => handleSelect(park.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-[var(--brand-soft)] text-[var(--brand-strong)] font-semibold"
                      : "text-[var(--foreground)] hover:bg-slate-100/80"
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="truncate text-sm font-semibold text-[var(--foreground)]">{park.nameTh}</span>
                    <span className="text-xs text-[var(--muted)]">📍 {park.province}</span>
                  </div>
                  {isSelected ? (
                    <span className="shrink-0 text-xs font-bold text-[var(--brand-strong)]">✓ เลือกอยู่</span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <div className="px-4 py-4 text-center text-xs text-[var(--muted)]">
              ไม่พบอุทยานที่ตรงกับคำค้นหา &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
