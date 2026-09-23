"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addDays,
  formatMonthYear,
  formatThaiDate,
  fromYMD,
  getCalendarDays,
  isPast,
  isSameDay,
  isToday,
  isWeekend,
  THAI_DAYS_SHORT,
  toYMD,
} from "@/lib/date";

export interface TripDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateYMD: string) => void;
  minDate?: Date;
  maxDate?: Date;
  id?: string;
  error?: string;
}

export function TripDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  id = "tripDate",
  error,
}: TripDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Selected date object
  const selectedDate = useMemo(() => {
    return value ? fromYMD(value) : null;
  }, [value]);

  // Current viewing month in calendar
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    return selectedDate && !isNaN(selectedDate.getTime())
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      : new Date();
  });

  const calendarDays = useMemo(() => getCalendarDays(viewMonth), [viewMonth]);

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isCurrentMonth = (date: Date) => date.getMonth() === viewMonth.getMonth();

  const handleSelectDate = (date: Date) => {
    const ymd = toYMD(date);
    onChange(ymd);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    startTransition(() => {
      setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    });
  };

  const handleNextMonth = () => {
    startTransition(() => {
      setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    });
  };

  const handleGoToToday = () => {
    const today = new Date();
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onChange(toYMD(today));
    setIsOpen(false);
  };

  // Quick Preset options
  const quickPresets = useMemo(() => {
    const now = new Date();
    const tomorrow = addDays(now, 1);

    // Calculate this coming Saturday & Sunday
    const currentDay = now.getDay();
    const daysUntilSat = (6 - currentDay + 7) % 7 || 7;
    const thisSat = addDays(now, daysUntilSat);
    const thisSun = addDays(now, daysUntilSat + 1);
    const nextWeek = addDays(now, 7);

    return [
      { label: "วันนี้", date: toYMD(now) },
      { label: "พรุ่งนี้", date: toYMD(tomorrow) },
      { label: "เสาร์นี้", date: toYMD(thisSat) },
      { label: "อาทิตย์นี้", date: toYMD(thisSun) },
      { label: "สัปดาห์หน้า", date: toYMD(nextWeek) },
    ];
  }, []);

  return (
    <div className="relative w-full min-w-0 max-w-full space-y-2">
      {/* Visual Trigger Box */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={`form-control group flex min-h-[3.8rem] w-full max-w-full items-center justify-between gap-2.5 sm:gap-3 rounded-2xl px-3 sm:px-4 py-2.5 transition-all cursor-pointer select-none ${
          error
            ? "border-rose-400/80 ring-2 ring-rose-500/20"
            : "hover:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/30"
        } bg-white/95 dark:bg-[#0c221b]/95`}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            {value ? (
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {formatThaiDate(value, { includeDay: true, includeYear: true })}
                </p>
                <p className="text-[10.5px] sm:text-[11px] font-medium text-emerald-700 dark:text-emerald-300/80 truncate">
                  {isToday(fromYMD(value)) ? "📍 วันนี้" : isPast(fromYMD(value)) ? "⚠️ วันที่ผ่านมาแล้ว" : "🗓️ วันที่กำหนด"}
                </p>
              </div>
            ) : (
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-400 dark:text-emerald-300/40 truncate">
                  แตะเพื่อเปิดปฏิทินเลือกวันเดินทาง...
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="rounded-lg bg-emerald-500/10 dark:bg-emerald-400/15 px-2 py-1 text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300">
            ปฏิทิน
          </span>
          <svg
            className={`h-4 w-4 text-slate-400 dark:text-emerald-300/60 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-emerald-600 dark:text-emerald-300" : ""
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Hidden native input for form compatibility & accessibility */}
      <input
        type="hidden"
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      {/* Quick Presets Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[11px] font-bold text-slate-500 dark:text-emerald-300/70 mr-0.5">
          ลัด:
        </span>
        {quickPresets.map((preset) => {
          const isSelected = value === preset.date;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.date)}
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-all active:scale-95 cursor-pointer ${
                isSelected
                  ? "bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-500 dark:to-teal-600 text-white shadow-xs ring-1 ring-white/20 dark:ring-emerald-300/30"
                  : "bg-slate-100 dark:bg-[#0e2a21] hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 text-slate-700 dark:text-emerald-200 border border-slate-200/80 dark:border-emerald-700/40"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Dropdown Calendar Modal / Card */}
      {isOpen ? (
        <div className="relative z-30 overflow-hidden rounded-3xl border border-emerald-600/20 dark:border-emerald-700/50 bg-white/95 dark:bg-[#0b2019]/95 p-4 sm:p-5 shadow-2xl shadow-emerald-950/20 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Calendar Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3 mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isPending}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 dark:text-emerald-200 hover:bg-slate-100 dark:hover:bg-emerald-900/50 active:scale-95 transition-all cursor-pointer"
              aria-label="เดือนก่อนหน้า"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="text-center">
              <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                {formatMonthYear(viewMonth)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isPending}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 dark:text-emerald-200 hover:bg-slate-100 dark:hover:bg-emerald-900/50 active:scale-95 transition-all cursor-pointer"
              aria-label="เดือนถัดไป"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-2 text-center">
            {THAI_DAYS_SHORT.map((day, idx) => {
              const isSun = idx === 0;
              const isSat = idx === 6;
              return (
                <div
                  key={day}
                  className={`text-xs font-bold py-1 ${
                    isSun
                      ? "text-rose-600 dark:text-rose-400"
                      : isSat
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-slate-500 dark:text-emerald-300/70"
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarDays.map((date, index) => {
              const inMonth = isCurrentMonth(date);
              const selected = selectedDate ? isSameDay(date, selectedDate) : false;
              const today = isToday(date);
              const past = isPast(date);
              const disabled = isDateDisabled(date);
              const weekend = isWeekend(date);

              if (!inMonth) {
                return (
                  <div
                    key={index}
                    className="flex aspect-square items-center justify-center text-xs text-slate-300 dark:text-white/10 font-normal select-none"
                  >
                    {date.getDate()}
                  </div>
                );
              }

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    if (disabled) return;
                    handleSelectDate(date);
                  }}
                  disabled={disabled}
                  className={`relative flex aspect-square items-center justify-center rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-90 cursor-pointer ${
                    selected
                      ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-extrabold shadow-md shadow-emerald-700/30 scale-105 z-10"
                      : today
                      ? "border-2 border-emerald-500 dark:border-emerald-400 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 font-bold"
                      : past
                      ? "text-slate-400 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/5"
                      : weekend
                      ? "text-amber-800 dark:text-amber-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/40"
                      : "text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-emerald-900/40"
                  } ${disabled ? "opacity-35 cursor-not-allowed hover:bg-transparent" : ""}`}
                >
                  <span>{date.getDate()}</span>
                  {today && !selected ? (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Calendar Bottom Actions */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-3 text-xs">
            <button
              type="button"
              onClick={handleGoToToday}
              className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
            >
              <span>📍 ไปที่วันนี้</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 px-3 py-1.5 font-bold text-slate-700 dark:text-emerald-200 cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
