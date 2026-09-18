"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { FormError } from "@/components/ui/form-error";
import { QUICK_ORIGIN_PRESETS, TRANSPORT_MODE_OPTIONS, WEATHER_CONDITION_OPTIONS } from "@/lib/constants/trip-form-options";
import type { TripDetailDto } from "@/lib/mappers/trip-dto";
import type { ParkOption } from "@/lib/services/park-service";
import { toDateInputValue } from "@/lib/utils/date";

import { TripFormField } from "./trip-form-fields/trip-form-field";
import { ParkSearchSelect } from "./park-search-select";

type TripFormMode = "create" | "edit";

type TripFormProps = {
  mode: TripFormMode;
  parks: ParkOption[];
  initialParkId?: string;
  trip?: TripDetailDto;
};

type ApiValidationDetail = {
  field: string;
  message: string;
  code: string;
};

type FormState = {
  parkId: string;
  tripDate: string;
  departAt: string;
  originText: string;
  originLat: string;
  originLng: string;
  transportMode: string;
  travelerCount: string;
  weatherCondition: string;
  estimatedTravelMinutes: string;
  mockSunsetTime: string;
  notes: string;
};

function getInitialState(mode: TripFormMode, initialParkId?: string, trip?: TripDetailDto): FormState {
  if (mode === "edit" && trip) {
    return {
      parkId: trip.park.id,
      tripDate: toDateInputValue(trip.tripDate),
      departAt: trip.departAt,
      originText: trip.originText,
      originLat: trip.originLat !== null ? String(trip.originLat) : "",
      originLng: trip.originLng !== null ? String(trip.originLng) : "",
      transportMode: trip.transportMode,
      travelerCount: String(trip.travelerCount),
      weatherCondition: trip.weatherCondition,
      estimatedTravelMinutes: String(trip.estimatedTravelMinutes),
      mockSunsetTime: trip.mockSunsetTime ?? "",
      notes: trip.notes ?? "",
    };
  }

  return {
    parkId: initialParkId ?? "",
    tripDate: "",
    departAt: "07:00",
    originText: "",
    originLat: "",
    originLng: "",
    transportMode: "CAR",
    travelerCount: "1",
    weatherCondition: "CLEAR",
    estimatedTravelMinutes: "120",
    mockSunsetTime: "",
    notes: "",
  };
}

function formatThaiDatePreview(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [yearStr, monthStr, dayStr] = dateStr.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    if (!year || !month || !day) return "";

    const thaiMonths = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const thaiYear = year > 2400 ? year : year + 543;
    const dateObj = new Date(year, month - 1, day);
    const dayNames = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
    const dayName = dayNames[dateObj.getDay()] ?? "วัน";

    return `${dayName}ที่ ${day} ${thaiMonths[month - 1]} พ.ศ. ${thaiYear}`;
  } catch {
    return dateStr;
  }
}

function getThaiTimeDescription(timeStr: string): { label: string; tone: "positive" | "neutral" | "warning" } {
  if (!timeStr) return { label: "", tone: "neutral" };
  const [hourStr, minStr = "00"] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return { label: `${timeStr} น.`, tone: "neutral" };

  const formattedTime = `${hourStr.padStart(2, "0")}:${minStr.padStart(2, "0")} น.`;

  if (hour >= 5 && hour < 7) {
    return { label: `ออกเดินทาง ${formattedTime} (เช้าตรู่ • เหมาะชมพระอาทิตย์ขึ้น)`, tone: "positive" };
  } else if (hour >= 7 && hour < 9) {
    return { label: `ออกเดินทาง ${formattedTime} (ช่วงเช้า • เวลาแนะนำสำหรับขับรถขึ้นดอย)`, tone: "positive" };
  } else if (hour >= 9 && hour < 12) {
    return { label: `ออกเดินทาง ${formattedTime} (ช่วงสาย • สว่างชัดเจน)`, tone: "neutral" };
  } else if (hour >= 12 && hour < 15) {
    return { label: `ออกเดินทาง ${formattedTime} (ช่วงบ่าย)`, tone: "neutral" };
  } else if (hour >= 15 && hour < 17) {
    return { label: `ออกเดินทาง ${formattedTime} (บ่ายแก่ • ควรระวังเวลาพระอาทิตย์ตก)`, tone: "warning" };
  } else {
    return { label: `ออกเดินทาง ${formattedTime} (ช่วงค่ำ • ทัศนวิสัยจำกัด แนะนำปรับเวลา)`, tone: "warning" };
  }
}

const QUICK_TIME_PRESETS = [
  { label: "🌅 06:00 น.", time: "06:00" },
  { label: "🚗 07:30 น.", time: "07:30" },
  { label: "☀️ 09:00 น.", time: "09:00" },
  { label: "🌤️ 13:00 น.", time: "13:00" },
];

function getQuickDatePresets() {
  const now = new Date();
  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const saturday = new Date(now);
  const dayOfWeek = saturday.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  saturday.setDate(saturday.getDate() + daysUntilSaturday);

  return [
    { label: "วันนี้", date: formatDate(today) },
    { label: "พรุ่งนี้", date: formatDate(tomorrow) },
    { label: "เสาร์นี้", date: formatDate(saturday) },
  ];
}

const inputClassName = "form-control";

function toOptionalNumber(value: string) {
  if (value.trim().length === 0) {
    return undefined;
  }

  return Number(value);
}

export function TripForm({ mode, parks, initialParkId, trip }: TripFormProps) {
  const router = useRouter();
  const isCreateMode = mode === "create";
  const [formState, setFormState] = useState<FormState>(getInitialState(mode, initialParkId, trip));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(mode === "edit");
  const [isSyncingLocation, setIsSyncingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string>();

  const parkOptions = useMemo(() => parks, [parks]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function handleSelectOriginPreset(preset: (typeof QUICK_ORIGIN_PRESETS)[number]) {
    setFormState((current) => ({
      ...current,
      originText: preset.text,
      originLat: String(preset.lat),
      originLng: String(preset.lng),
    }));
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.originText;
      delete nextErrors.originLat;
      delete nextErrors.originLng;
      return nextErrors;
    });
    setLocationMessage(`เลือกจุดเริ่มต้น: ${preset.label}`);
  }

  function handleUseCurrentLocation() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationMessage("This device does not support location sync.");
      return;
    }

    setIsSyncingLocation(true);
    setLocationMessage("กำลังระบุตำแหน่งปัจจุบัน...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormState((current) => ({
          ...current,
          originText: current.originText.trim().length > 0 ? current.originText : "ตำแหน่งปัจจุบัน",
          originLat: position.coords.latitude.toFixed(6),
          originLng: position.coords.longitude.toFixed(6),
        }));
        setFieldErrors((current) => {
          const nextErrors = { ...current };
          delete nextErrors.originText;
          delete nextErrors.originLat;
          delete nextErrors.originLng;
          return nextErrors;
        });
        setLocationMessage("Current location synced.");
        setIsSyncingLocation(false);
      },
      (error) => {
        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. You can still type a starting point manually."
            : "Unable to read current location right now. Please try again.",
        );
        setIsSyncingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(undefined);

    const missing: string[] = [];
    const newFieldErrors: Record<string, string> = {};

    if (!formState.parkId || formState.parkId.trim().length === 0) {
      missing.push("กรุณาเลือกอุทยานแห่งชาติปลายทาง");
      newFieldErrors.parkId = "กรุณาเลือกอุทยานแห่งชาติปลายทาง";
    }

    if (!formState.tripDate || formState.tripDate.trim().length === 0) {
      missing.push("กรุณากำหนดวันที่เดินทาง");
      newFieldErrors.tripDate = "กรุณากำหนดวันที่เดินทาง";
    }

    if (!formState.departAt || formState.departAt.trim().length === 0) {
      missing.push("กรุณาระบุเวลาออกเดินทาง");
      newFieldErrors.departAt = "กรุณาระบุเวลาออกเดินทาง";
    }

    if (!formState.originText || formState.originText.trim().length === 0) {
      missing.push("กรุณาระบุจุดเริ่มต้นเดินทาง");
      newFieldErrors.originText = "กรุณาระบุจุดเริ่มต้นเดินทาง";
    }

    if (missing.length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    if (isCreateMode && (formState.originLat.trim().length === 0 || formState.originLng.trim().length === 0)) {
      setFormError("กรุณากดใช้ตำแหน่งปัจจุบันก่อนประเมินทริป เพื่อให้ระบบคำนวณเส้นทางได้");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      parkId: formState.parkId,
      tripDate: formState.tripDate,
      departAt: formState.departAt,
      originText: formState.originText,
      originLat: toOptionalNumber(formState.originLat),
      originLng: toOptionalNumber(formState.originLng),
      transportMode: formState.transportMode,
      travelerCount: Number(formState.travelerCount),
      weatherCondition: formState.weatherCondition,
      estimatedTravelMinutes: Number(formState.estimatedTravelMinutes),
      mockSunsetTime: formState.mockSunsetTime || undefined,
      notes: formState.notes || undefined,
    };

    try {
      const response = await fetch(isCreateMode ? "/api/v1/trips" : `/api/v1/trips/${trip?.id}`, {
        method: isCreateMode ? "POST" : "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && Array.isArray(data.error?.details)) {
          const errors = Object.fromEntries(
            (data.error.details as ApiValidationDetail[]).map((detail) => [detail.field, detail.message]),
          );
          setFieldErrors(errors);
        } else {
          setFormError(data.error?.message ?? "ไม่สามารถบันทึกทริปได้");
        }

        return;
      }

      const tripId = data.data?.id;

      if (!tripId) {
        throw new Error("Trip id is missing from response");
      }

      if (isCreateMode) {
        const refreshResponse = await fetch(`/api/v1/trips/${tripId}/refresh-evaluation`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
        });

        if (refreshResponse.ok) {
          router.push(`/trips/${tripId}/result`);
          router.refresh();
          return;
        }

        const refreshPayload = await refreshResponse.json().catch(() => null);
        const refreshMessage =
          refreshPayload?.error?.message ??
          "สร้างทริปสำเร็จแล้ว แต่ยังประเมินอัตโนมัติไม่สำเร็จ คุณสามารถเข้าไปประเมินต่อจากหน้ารายละเอียดทริปได้";

        if (typeof window !== "undefined") {
          window.alert(refreshMessage);
        }

        router.push(`/trips/${tripId}`);
        router.refresh();
        return;
      }

      router.push(`/trips/${tripId}`);
      router.refresh();
    } catch {
      setFormError("ไม่สามารถเชื่อมต่อกับระบบได้ในขณะนี้");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      <section className="glass-panel rounded-[26px] p-4 sm:p-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)]">
            {mode === "create" ? "🗺️ ขั้นตอนวางแผนทริป" : "✏️ ปรับแผนการเดินทาง"}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            กรอก 3 ขั้นตอนง่ายๆ เพื่อให้ระบบคำนวณและประเมินความปลอดภัยของทริป
          </p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500/15 dark:bg-emerald-950/60 border border-emerald-500/30 py-2 px-1.5 text-center">
            <span className="text-xs">🌲</span>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">1. อุทยาน</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] py-2 px-1.5 text-center">
            <span className="text-xs">📅</span>
            <span className="text-xs font-medium text-[var(--muted)]">2. วันเวลา</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] py-2 px-1.5 text-center">
            <span className="text-xs">🚗</span>
            <span className="text-xs font-medium text-[var(--muted)]">3. จุดเริ่มต้น</span>
          </div>
        </div>
      </section>

      <section className="soft-card rounded-[28px] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="guide-chip text-xs">Step 01</span>
          <span className="text-[11px] text-[var(--muted)]">จำเป็น</span>
        </div>
        <h3 className="mt-2 text-lg sm:text-xl font-bold text-[var(--foreground)]">เลือกอุทยาน</h3>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          เลือกจุดหมายปลายทางของทริป
        </p>
        <div className="mt-4">
          <ParkSearchSelect
            id="parkId"
            parks={parkOptions}
            selectedParkId={formState.parkId}
            onSelectPark={(parkId) => {
              updateField("parkId", parkId);
              if (parkId) {
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next.parkId;
                  return next;
                });
              }
            }}
            hasError={!!fieldErrors.parkId}
          />
          <FormError message={fieldErrors.parkId} />
        </div>
      </section>

      <section className="soft-card rounded-[32px] sm:rounded-[36px] p-5 sm:p-7 border border-white/60 dark:border-emerald-800/40 shadow-lg shadow-emerald-950/5 backdrop-blur-2xl bg-white/85 dark:bg-[#0b1c16]/90">
        <div className="flex items-center gap-2">
          <span className="guide-chip text-xs">Step 02</span>
          <span className="text-xs font-semibold text-slate-500 dark:text-emerald-300/80">วันและเวลา</span>
        </div>
        <h3 className="mt-3 text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          กำหนดวันและเวลาออกเดินทาง
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-emerald-200/70 font-normal">
          เลือกวันเดินทางและเวลาที่เริ่มออกรถ เพื่อให้ระบบคำนวณระยะเวลา พระอาทิตย์ตก และสภาพอากาศได้อย่างแม่นยำ
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {/* วันเดินทาง */}
          <div className="space-y-2.5">
            <TripFormField label="วันเดินทาง" htmlFor="tripDate" hint="แตะเลือกวันที่หรือกดปุ่มลัด">
              <input
                id="tripDate"
                type="date"
                value={formState.tripDate}
                onChange={(event) => updateField("tripDate", event.target.value)}
                className="form-control text-sm font-semibold rounded-2xl bg-white/90 dark:bg-[#0c221b]/90 border-slate-200/80 dark:border-emerald-800/40 focus:ring-2 focus:ring-emerald-500/30"
              />
              <FormError message={fieldErrors.tripDate} />
            </TripFormField>

            {/* Quick Date Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-emerald-300/70 mr-0.5">ลัด:</span>
              {getQuickDatePresets().map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => updateField("tripDate", preset.date)}
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-all active:scale-95 cursor-pointer ${
                    formState.tripDate === preset.date
                      ? "bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-500 dark:to-teal-600 text-white shadow-xs ring-1 ring-white/20 dark:ring-emerald-300/30"
                      : "bg-slate-100 dark:bg-[#0e2a21] hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 text-slate-700 dark:text-emerald-200 border border-slate-200/80 dark:border-emerald-700/40"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Thai Date Preview Badge */}
            {formState.tripDate ? (
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                <span>🗓️</span>
                <span>{formatThaiDatePreview(formState.tripDate)}</span>
              </div>
            ) : null}
          </div>

          {/* เวลาออกเดินทาง */}
          <div className="space-y-2.5">
            <TripFormField label="เวลาออกเดินทาง (24 ชม.)" htmlFor="departAt" hint="เวลาเริ่มออกเดินทางจากจุดเริ่มต้น">
              <input
                id="departAt"
                type="time"
                value={formState.departAt}
                onChange={(event) => updateField("departAt", event.target.value)}
                className="form-control text-sm font-semibold rounded-2xl bg-white/90 dark:bg-[#0c221b]/90 border-slate-200/80 dark:border-emerald-800/40 focus:ring-2 focus:ring-emerald-500/30"
              />
              <FormError message={fieldErrors.departAt} />
            </TripFormField>

            {/* Quick Time Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-emerald-300/70 mr-0.5">รอบ:</span>
              {QUICK_TIME_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => updateField("departAt", preset.time)}
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-all active:scale-95 cursor-pointer ${
                    formState.departAt === preset.time
                      ? "bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-500 dark:to-teal-600 text-white shadow-xs ring-1 ring-white/20 dark:ring-emerald-300/30"
                      : "bg-slate-100 dark:bg-[#0e2a21] hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 text-slate-700 dark:text-emerald-200 border border-slate-200/80 dark:border-emerald-700/40"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Thai Time Context Badge */}
            {formState.departAt ? (
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/80 px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/50">
                <span>⏰</span>
                <span>{getThaiTimeDescription(formState.departAt).label}</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="soft-card rounded-[34px] px-5 py-6 sm:px-7">
        <p className="guide-chip">Step 03</p>
        <h3 className="mt-4 text-xl font-semibold text-[var(--foreground)]">ระบุจุดเริ่มต้นและรูปแบบการเดินทาง</h3>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          ส่วนนี้คือ route-ready block ของ planner ถ้าใส่พิกัดต้นทางครบ ระบบจะพร้อมสำหรับ route sync
          และ live evaluation ทันที
        </p>
        <div className="mt-5 grid gap-5">
          <TripFormField label="จุดเริ่มต้น" htmlFor="originText" hint="เช่น ตัวเมืองเชียงใหม่ หรืออำเภอที่เริ่มเดินทาง">
            <input
              id="originText"
              type="text"
              value={formState.originText}
              onChange={(event) => updateField("originText", event.target.value)}
              placeholder="เช่น ตัวเมืองเชียงใหม่"
              className={inputClassName}
            />
            <FormError message={fieldErrors.originText} />
          </TripFormField>

          <div>
            <p className="mb-2.5 text-xs font-semibold text-[var(--muted)]">หรือเลือกจุดเริ่มต้นลัด (Quick Location Presets):</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_ORIGIN_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectOriginPreset(preset)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    formState.originText === preset.text
                      ? "bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-500 dark:to-teal-600 text-white shadow-sm ring-1 ring-white/20 dark:ring-emerald-300/30"
                      : "border border-slate-200/80 bg-white/80 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  📍 {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[24px] border border-white/60 bg-white/55 dark:border-white/10 dark:bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--foreground)]">Sync current location (GPS)</p>
              <p className="text-xs leading-6 text-[var(--muted)]">
                ใช้พิกัดปัจจุบันจากเบอร์/เบราว์เซอร์เพื่อคำนวณเส้นทางและเวลาเดินทางจริงอัตโนมัติ
              </p>
              {locationMessage ? <p className="text-xs leading-6 font-semibold text-[var(--brand-strong)]">{locationMessage}</p> : null}
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isSyncingLocation}
              className="glass-button inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSyncingLocation ? "กำลังค้นหาตำแหน่ง..." : "ใช้ตำแหน่งปัจจุบัน (GPS)"}
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TripFormField label="รูปแบบการเดินทาง" htmlFor="transportMode">
              <select
                id="transportMode"
                value={formState.transportMode}
                onChange={(event) => updateField("transportMode", event.target.value)}
                className={inputClassName}
              >
                {TRANSPORT_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-white text-slate-900 dark:bg-[#0d2820] dark:text-emerald-100">
                    {option.label}
                  </option>
                ))}
              </select>
              <FormError message={fieldErrors.transportMode} />
            </TripFormField>
            <TripFormField label="จำนวนผู้เดินทาง" htmlFor="travelerCount">
              <input
                id="travelerCount"
                type="number"
                min={1}
                value={formState.travelerCount}
                onChange={(event) => updateField("travelerCount", event.target.value)}
                className={inputClassName}
              />
              <FormError message={fieldErrors.travelerCount} />
            </TripFormField>
          </div>
        </div>
      </section>

      {!isCreateMode ? <section className="soft-card rounded-[30px] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="guide-chip">Step 04</p>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Advanced settings</h3>
            <p className="text-sm leading-6 text-[var(--muted)]">
              Default fallback values are ready. Open this section only when you want to fine-tune the trip.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-white/75 dark:bg-slate-800/80 px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-[0_10px_24px_rgba(33,93,82,0.08)]"
          >
            {showAdvanced ? "Hide advanced settings" : "Open advanced settings"}
          </button>
        </div>

        {!showAdvanced ? (
          <div className="mt-4 rounded-[22px] border border-white/60 bg-white/50 dark:border-white/10 dark:bg-white/5 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
            Using starter values: clear weather, 120 fallback minutes, and optional sunset/notes fields hidden.
          </div>
        ) : null}

        {showAdvanced ? <div className="mt-5 grid gap-5 rounded-[24px] border border-white/65 bg-white/45 dark:border-white/10 dark:bg-white/5 p-4 sm:grid-cols-2 sm:p-5">
          <TripFormField label="สภาพอากาศของอุทยาน" htmlFor="weatherCondition">
            <select
              id="weatherCondition"
              value={formState.weatherCondition}
              onChange={(event) => updateField("weatherCondition", event.target.value)}
              className={inputClassName}
            >
              {WEATHER_CONDITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FormError message={fieldErrors.weatherCondition} />
          </TripFormField>
          <TripFormField label="ระยะเวลาเดินทาง (นาที)" htmlFor="estimatedTravelMinutes" hint="ใช้เป็นค่าตั้งต้นก่อน route sync">
            <input
              id="estimatedTravelMinutes"
              type="number"
              min={1}
              value={formState.estimatedTravelMinutes}
              onChange={(event) => updateField("estimatedTravelMinutes", event.target.value)}
              className={inputClassName}
            />
            <FormError message={fieldErrors.estimatedTravelMinutes} />
          </TripFormField>
          <TripFormField label="เวลา sunset ตั้งต้น" htmlFor="mockSunsetTime" hint="ใช้เป็น fallback หากยังไม่ได้ sync sunset ล่าสุด">
            <input
              id="mockSunsetTime"
              type="time"
              value={formState.mockSunsetTime}
              onChange={(event) => updateField("mockSunsetTime", event.target.value)}
              className={inputClassName}
            />
            <FormError message={fieldErrors.mockSunsetTime} />
          </TripFormField>
          <TripFormField label="หมายเหตุเพิ่มเติม" htmlFor="notes" hint="เช่น เดินทางกับครอบครัว หรืออยากเผื่อเวลาแวะพัก">
            <input
              id="notes"
              type="text"
              value={formState.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="เช่น เดินทางกับครอบครัว"
              className={inputClassName}
            />
            <FormError message={fieldErrors.notes} />
          </TripFormField>
        </div> : null}
      </section> : null}

      <FormError message={formError} />

      <div className="floating-action-bar">
        <div className="glass-tabbar rounded-[30px] px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isSubmitting}
              className="glass-button inline-flex flex-1 items-center justify-center rounded-full px-5 py-3.5 text-sm font-semibold disabled:opacity-60"
            >
              {isSubmitting
                ? isCreateMode
                  ? "กำลังประเมินทริป..."
                  : "กำลังบันทึก..."
                : isCreateMode
                  ? "ประเมินทริป"
                  : "บันทึกการแก้ไข"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="ghost-button inline-flex items-center justify-center rounded-full px-5 py-3.5 text-sm font-semibold text-[var(--foreground)]"
            >
              ย้อนกลับ
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
