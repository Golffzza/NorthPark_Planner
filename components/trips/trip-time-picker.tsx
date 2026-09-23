"use client";

import { useMemo, useState } from "react";

export interface TripTimePickerProps {
  value: string; // HH:mm format e.g. "07:00"
  onChange: (time: string) => void;
  id?: string;
  error?: string;
}

export const TIME_SLOT_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
export const TIME_SLOT_MINUTES = ["00", "15", "30", "45"];

export function getTripTimeContext(timeStr: string): { label: string; period: string; icon: string } {
  if (!timeStr) return { label: "แตะเพื่อเลือกเวลาออกเดินทาง...", period: "", icon: "🕒" };
  const [hStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return { label: `${timeStr} น.`, period: "", icon: "🕒" };

  if (h >= 4 && h < 7) {
    return { label: `${timeStr} น.`, period: "เช้าตรู่ (ชมพระอาทิตย์ขึ้น)", icon: "🌅" };
  } else if (h >= 7 && h < 10) {
    return { label: `${timeStr} น.`, period: "ช่วงเช้า (เวลาแนะนำขับขึ้นดอย)", icon: "🚗" };
  } else if (h >= 10 && h < 13) {
    return { label: `${timeStr} น.`, period: "ช่วงสาย/เที่ยง", icon: "☀️" };
  } else if (h >= 13 && h < 16) {
    return { label: `${timeStr} น.`, period: "ช่วงบ่าย", icon: "🌤️" };
  } else if (h >= 16 && h < 19) {
    return { label: `${timeStr} น.`, period: "ช่วงเย็น (ก่อนพระอาทิตย์ตก)", icon: "🌇" };
  } else {
    return { label: `${timeStr} น.`, period: "ช่วงค่ำ/กลางคืน", icon: "🌙" };
  }
}

const COMMON_TIME_PRESETS = [
  { label: "🌅 06:00", time: "06:00", desc: "เช้าตรู่" },
  { label: "🚗 07:30", time: "07:30", desc: "ยอดนิยม" },
  { label: "☀️ 09:00", time: "09:00", desc: "สาย" },
  { label: "🌤️ 13:00", time: "13:00", desc: "บ่าย" },
];

export function TripTimePicker({
  value,
  onChange,
  id = "departAt",
  error,
}: TripTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse current hour & minute
  const [currentHour, currentMin] = useMemo(() => {
    if (!value) return ["07", "00"];
    const [h = "07", m = "00"] = value.split(":");
    return [h.padStart(2, "0"), m.padStart(2, "0")];
  }, [value]);

  const timeContext = useMemo(() => getTripTimeContext(value), [value]);

  const handleSelectHour = (hour: string) => {
    const newTime = `${hour}:${currentMin}`;
    onChange(newTime);
  };

  const handleSelectMinute = (minute: string) => {
    const newTime = `${currentHour}:${minute}`;
    onChange(newTime);
  };

  const handleSelectPreset = (timeStr: string) => {
    onChange(timeStr);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full min-w-0 max-w-full space-y-2">
      {/* Visual Trigger Box matching TripDatePicker */}
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 dark:bg-teal-400/20 text-teal-700 dark:text-teal-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            {value ? (
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {timeContext.icon} {timeContext.label}
                </p>
                <p className="text-[10.5px] sm:text-[11px] font-medium text-teal-700 dark:text-teal-300/80 truncate">
                  {timeContext.period}
                </p>
              </div>
            ) : (
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-400 dark:text-emerald-300/40 truncate">
                  แตะเพื่อเลือกเวลาออกเดินทาง...
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="rounded-lg bg-teal-500/10 dark:bg-teal-400/15 px-2 py-1 text-[11px] sm:text-xs font-bold text-teal-800 dark:text-teal-300">
            24 ชม.
          </span>
          <svg
            className={`h-4 w-4 text-slate-400 dark:text-emerald-300/60 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-teal-600 dark:text-teal-300" : ""
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

      {/* Hidden input for form sync */}
      <input type="hidden" id={id} name={id} value={value} />

      {/* Quick Time Presets Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[11px] font-bold text-slate-500 dark:text-emerald-300/70 mr-0.5">รอบ:</span>
        {COMMON_TIME_PRESETS.map((preset) => {
          const isSelected = value === preset.time;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleSelectPreset(preset.time)}
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-all active:scale-95 cursor-pointer ${
                isSelected
                  ? "bg-gradient-to-r from-teal-600 to-emerald-700 dark:from-teal-500 dark:to-emerald-600 text-white shadow-xs ring-1 ring-white/20 dark:ring-emerald-300/30"
                  : "bg-slate-100 dark:bg-[#0e2a21] hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 text-slate-700 dark:text-emerald-200 border border-slate-200/80 dark:border-emerald-700/40"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Dropdown Emerald / Liquid Glass Time Picker */}
      {isOpen ? (
        <div className="relative z-30 overflow-hidden w-full max-w-full rounded-3xl border border-teal-600/20 dark:border-teal-700/50 bg-white/95 dark:bg-[#0b2019]/95 p-4 sm:p-5 shadow-2xl shadow-emerald-950/20 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3 mb-3">
            <div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400">ระบบ 24 ชั่วโมง</span>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                เลือกเวลาออกเดินทาง
              </h4>
            </div>
            <div className="flex items-center gap-1 rounded-2xl bg-teal-500/15 dark:bg-teal-400/20 px-3 py-1.5 text-xs sm:text-sm font-black text-teal-900 dark:text-teal-200">
              <span>{currentHour}:{currentMin} น.</span>
            </div>
          </div>

          {/* Time Picker Columns */}
          <div className="grid grid-cols-2 gap-3">
            {/* Hours Column */}
            <div>
              <div className="text-[11.5px] font-bold text-slate-500 dark:text-emerald-300/70 mb-1.5 px-1 flex items-center justify-between">
                <span>ชั่วโมง (00-23)</span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">เลื่อนเพื่อดู</span>
              </div>
              <div className="max-h-48 overflow-y-auto pr-1 space-y-1 rounded-2xl bg-slate-50 dark:bg-black/20 p-1.5 border border-slate-200/70 dark:border-emerald-900/40 custom-scrollbar">
                {TIME_SLOT_HOURS.map((hour) => {
                  const isSelected = currentHour === hour;
                  const hNum = parseInt(hour, 10);
                  const icon = hNum >= 5 && hNum < 10 ? "🌅" : hNum >= 10 && hNum < 16 ? "☀️" : hNum >= 16 && hNum < 19 ? "🌇" : "🌙";

                  return (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => handleSelectHour(hour)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow-sm"
                          : "text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-emerald-900/40"
                      }`}
                    >
                      <span className="font-mono text-sm">{hour}</span>
                      <span className="text-xs opacity-75">{icon}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes Column */}
            <div>
              <div className="text-[11.5px] font-bold text-slate-500 dark:text-emerald-300/70 mb-1.5 px-1">
                <span>นาที</span>
              </div>
              <div className="space-y-1.5 rounded-2xl bg-slate-50 dark:bg-black/20 p-1.5 border border-slate-200/70 dark:border-emerald-900/40">
                {TIME_SLOT_MINUTES.map((min) => {
                  const isSelected = currentMin === min;
                  return (
                    <button
                      key={min}
                      type="button"
                      onClick={() => handleSelectMinute(min)}
                      className={`w-full flex items-center justify-center py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow-sm"
                          : "text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-emerald-900/40"
                      }`}
                    >
                      <span className="font-mono text-sm">:{min} น.</span>
                    </button>
                  );
                })}
              </div>

              {/* Time Context Info Box */}
              <div className="mt-3 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200/60 dark:border-teal-800/50 p-2 text-center">
                <p className="text-[11px] font-bold text-teal-900 dark:text-teal-200 truncate">
                  {timeContext.period}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-3 text-xs">
            <button
              type="button"
              onClick={() => {
                onChange("07:00");
                setIsOpen(false);
              }}
              className="inline-flex items-center gap-1 font-bold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
            >
              <span>🚗 เวลามาตรฐาน 07:00 น.</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 text-white px-4 py-1.5 font-bold shadow-sm active:scale-95 cursor-pointer"
            >
              เสร็จสิ้น
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
