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
import { TripDatePicker } from "./trip-date-picker";
import { TripTimePicker } from "./trip-time-picker";

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
  drivetrain: string;
  engineType: string;
  motorcycleType: string;
  trainType: string;
  rentVehicleAtDestination: string;
  mountainExperience: string;
  coDriver: string;
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
      drivetrain: "2WD",
      engineType: "ICE",
      motorcycleType: "MANUAL_BIGBIKE",
      trainType: "CNR_SLEEPER",
      rentVehicleAtDestination: "NO",
      mountainExperience: "BEGINNER",
      coDriver: "SOLO",
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
    drivetrain: "2WD",
    engineType: "ICE",
    motorcycleType: "MANUAL_BIGBIKE",
    trainType: "CNR_SLEEPER",
    rentVehicleAtDestination: "NO",
    mountainExperience: "BEGINNER",
    coDriver: "SOLO",
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
      setLocationMessage("อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง GPS");
      return;
    }

    setIsSyncingLocation(true);
    setLocationMessage("กำลังระบุตำแหน่งปัจจุบัน...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormState((current) => ({
          ...current,
          originText: current.originText.trim().length > 0 ? current.originText : "ตำแหน่งปัจจุบัน (GPS)",
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
        setLocationMessage("✓ เชื่อมต่อพิกัดตำแหน่งปัจจุบันสำเร็จ");
        setIsSyncingLocation(false);
      },
      (error) => {
        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? "ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง (สามารถพิมพ์ชื่อจุดเริ่มต้น หรือแตะเลือกจุดเริ่มต้นยอดนิยมได้)"
            : "ไม่สามารถระบุตำแหน่งได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
        );
        setIsSyncingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }

  function scrollToFirstError(errors: Record<string, string>, generalError?: string) {
    // If error is in advanced fields, ensure advanced section is open
    if (errors.weatherCondition || errors.estimatedTravelMinutes || errors.mockSunsetTime || errors.notes) {
      setShowAdvanced(true);
    }

    const performScroll = () => {
      // 1. Specific field error mappings to container section IDs or inputs in top-to-bottom order
      const fieldMapping: Record<string, string[]> = {
        parkId: ["step-park", "parkId", "park-search-select"],
        tripDate: ["step-datetime", "tripDate"],
        departAt: ["step-datetime", "departAt"],
        originText: ["step-origin", "originText"],
        originLat: ["step-origin", "originText"],
        originLng: ["step-origin", "originText"],
        transportMode: ["step-preferences", "transportMode"],
        travelerCount: ["step-preferences", "travelerCount"],
        weatherCondition: ["step-advanced", "weatherCondition"],
        estimatedTravelMinutes: ["step-advanced", "estimatedTravelMinutes"],
        mockSunsetTime: ["step-advanced", "mockSunsetTime"],
        notes: ["step-advanced", "notes"],
      };

      for (const [field, selectors] of Object.entries(fieldMapping)) {
        if (errors[field]) {
          for (const selector of selectors) {
            const el = document.getElementById(selector) || document.querySelector(`[name="${selector}"]`);
            if (el) {
              const rect = el.getBoundingClientRect();
              const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
              const targetY = scrollTop + rect.top - 80;
              window.scrollTo({
                top: Math.max(0, targetY),
                behavior: "smooth",
              });

              // Focus input if available
              const inputEl = el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA"
                ? (el as HTMLElement)
                : el.querySelector<HTMLElement>("input, select, textarea");
              if (inputEl && typeof inputEl.focus === "function") {
                inputEl.focus({ preventScroll: true });
              }
              return;
            }
          }
        }
      }

      // 2. Query any visible form-error element in the DOM
      const firstErrorElement = document.querySelector<HTMLElement>(".form-error, [role='alert']");
      if (firstErrorElement) {
        const rect = firstErrorElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = scrollTop + rect.top - 100;
        window.scrollTo({
          top: Math.max(0, targetY),
          behavior: "smooth",
        });
        return;
      }

      // 3. If general error exists or fallback, scroll directly to top of page/form
      if (generalError || Object.keys(errors).length > 0) {
        const topErrorEl = document.getElementById("form-top-error");
        if (topErrorEl) {
          const rect = topErrorEl.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          window.scrollTo({
            top: Math.max(0, scrollTop + rect.top - 80),
            behavior: "smooth",
          });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    };

    // Run immediately and after a short tick to ensure React DOM commit
    requestAnimationFrame(performScroll);
    setTimeout(performScroll, 50);
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
      scrollToFirstError(newFieldErrors);
      return;
    }

    if (isCreateMode && (formState.originLat.trim().length === 0 || formState.originLng.trim().length === 0)) {
      const originError = "กรุณากดใช้ตำแหน่งปัจจุบันก่อนประเมินทริป เพื่อให้ระบบคำนวณเส้นทางได้";
      setFormError(originError);
      scrollToFirstError({}, originError);
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
      transportMode: formState.transportMode === "TRAIN" ? "PUBLIC_TRANSPORT" : formState.transportMode,
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
          scrollToFirstError(errors);
        } else {
          const msg = data.error?.message ?? "ไม่สามารถบันทึกทริปได้";
          setFormError(msg);
          scrollToFirstError({}, msg);
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
      const connError = "ไม่สามารถเชื่อมต่อกับระบบได้ในขณะนี้";
      setFormError(connError);
      scrollToFirstError({}, connError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {/* Overview Steps Card */}
      <section className="soft-card relative overflow-hidden rounded-3xl p-4.5 sm:p-6 border border-white/60 dark:border-emerald-800/40 shadow-md shadow-emerald-950/5 backdrop-blur-2xl bg-white/85 dark:bg-[#0b1c16]/90">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white font-heading">
          {mode === "create" ? "🗺️ ขั้นตอนวางแผนทริป" : "✏️ ปรับแผนการเดินทาง"}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-emerald-200/80 font-normal leading-relaxed">
          กรอก 3 ขั้นตอนง่ายๆ เพื่อให้ระบบคำนวณและประเมินความปลอดภัยของทริป
        </p>

        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2.5">
          <div className="flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full bg-emerald-500/15 dark:bg-emerald-950/70 border border-emerald-500/35 px-2 text-center shadow-xs">
            <span className="text-xs shrink-0">🌲</span>
            <span className="text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
              1. อุทยาน
            </span>
          </div>
          <div className="flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full bg-slate-100/80 dark:bg-[#0c221b]/80 border border-slate-200/80 dark:border-emerald-800/40 px-2 text-center">
            <span className="text-xs shrink-0">🗓️</span>
            <span className="text-[11px] sm:text-xs font-medium text-slate-600 dark:text-emerald-200/70 whitespace-nowrap">
              2. วันเวลา
            </span>
          </div>
          <div className="flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full bg-slate-100/80 dark:bg-[#0c221b]/80 border border-slate-200/80 dark:border-emerald-800/40 px-2 text-center">
            <span className="text-xs shrink-0">🚗</span>
            <span className="text-[11px] sm:text-xs font-medium text-slate-600 dark:text-emerald-200/70 whitespace-nowrap">
              3. จุดเริ่มต้น
            </span>
          </div>
        </div>
      </section>

      {formError ? (
        <div id="form-top-error" className="scroll-mt-28">
          <FormError message={formError} />
        </div>
      ) : null}

      <section id="step-park" className="soft-card relative z-30 scroll-mt-28 rounded-3xl p-4.5 sm:p-6 border border-white/60 dark:border-emerald-800/40 shadow-lg shadow-emerald-950/5 backdrop-blur-2xl bg-white/85 dark:bg-[#0b1c16]/90 min-w-0 w-full max-w-full">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="guide-chip text-xs">Step 01</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-emerald-300/80">จุดหมายปลายทาง</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/20">จำเป็น</span>
        </div>
        <h3 className="mt-2.5 text-lg sm:text-xl font-semibold tracking-normal text-slate-900 dark:text-white font-heading">
          เลือกอุทยานแห่งชาติ
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-emerald-200/80 font-normal leading-relaxed">
          ค้นหาและเลือกอุทยานแห่งชาติในภาคเหนือที่คุณต้องการเดินทางไป
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

      <section id="step-datetime" className="soft-card relative z-20 scroll-mt-28 rounded-3xl p-4.5 sm:p-6 border border-white/60 dark:border-emerald-800/40 shadow-lg shadow-emerald-950/5 backdrop-blur-2xl bg-white/85 dark:bg-[#0b1c16]/90 min-w-0 w-full max-w-full">
        <div className="flex items-center gap-2">
          <span className="guide-chip text-xs">Step 02</span>
          <span className="text-xs font-semibold text-slate-500 dark:text-emerald-300/80">วันและเวลา</span>
        </div>
        <h3 className="mt-2.5 text-lg sm:text-xl font-semibold tracking-normal text-slate-900 dark:text-white font-heading">
          กำหนดวันและเวลาออกเดินทาง
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-emerald-200/80 font-normal leading-relaxed">
          เลือกวันเดินทางและเวลาที่เริ่มออกรถ เพื่อให้ระบบคำนวณระยะเวลา พระอาทิตย์ตก และสภาพอากาศได้อย่างแม่นยำ
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 min-w-0 w-full">
          {/* วันเดินทาง */}
          <div className="space-y-2 min-w-0 w-full max-w-full">
            <TripFormField label="วันเดินทาง" htmlFor="tripDate" hint="แตะเลือกวันที่หรือกดปุ่มลัด">
              <TripDatePicker
                id="tripDate"
                value={formState.tripDate}
                onChange={(dateStr) => updateField("tripDate", dateStr)}
                error={fieldErrors.tripDate}
              />
              <FormError message={fieldErrors.tripDate} />
            </TripFormField>
          </div>

          {/* เวลาออกเดินทาง */}
          <div className="space-y-2 min-w-0 w-full max-w-full">
            <TripFormField label="เวลาออกเดินทาง (24 ชม.)" htmlFor="departAt" hint="เวลาเริ่มออกเดินทางจากจุดเริ่มต้น">
              <TripTimePicker
                id="departAt"
                value={formState.departAt}
                onChange={(timeStr) => updateField("departAt", timeStr)}
                error={fieldErrors.departAt}
              />
              <FormError message={fieldErrors.departAt} />
            </TripFormField>
          </div>
        </div>
      </section>

      <section id="step-origin" className="soft-card relative z-10 scroll-mt-28 rounded-3xl p-4.5 sm:p-6 border border-white/60 dark:border-emerald-800/40 shadow-lg shadow-emerald-950/5 backdrop-blur-2xl bg-white/85 dark:bg-[#0b1c16]/90 min-w-0 w-full max-w-full">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="guide-chip text-xs">Step 03</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-emerald-300/80">การเดินทาง</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            คำนวณเส้นทางอัตโนมัติ
          </span>
        </div>
        <h3 className="mt-2.5 text-lg sm:text-xl font-semibold tracking-normal text-slate-900 dark:text-white font-heading">
          ระบุจุดเริ่มต้นและรูปแบบการเดินทาง
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-emerald-200/80 font-normal leading-relaxed">
          เลือกจุดเริ่มต้นและประเภทพาหนะ เพื่อคำนวณระยะทาง เวลา และความพร้อมของเส้นทาง
        </p>

        <div className="mt-5 space-y-5">
          {/* จุดเริ่มต้นและ Quick Presets */}
          <div className="space-y-3">
            <TripFormField label="จุดเริ่มต้นเดินทาง" htmlFor="originText" hint="พิมพ์ชื่อสถานที่ หรือแตะเลือกจุดเริ่มต้นยอดนิยมด้านล่าง">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-base z-10 select-none">
                  📍
                </span>
                <input
                  id="originText"
                  type="text"
                  value={formState.originText}
                  onChange={(event) => updateField("originText", event.target.value)}
                  placeholder="เช่น ตัวเมืองเชียงใหม่ สนามบินเชียงราย เมืองพิษณุโลก"
                  className="form-control !pl-11 !pr-4 text-sm font-semibold rounded-2xl bg-white/90 dark:bg-[#0c221b]/90 border-slate-200/80 dark:border-emerald-800/40 focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <FormError message={fieldErrors.originText} />
            </TripFormField>

            {/* Quick Origin Presets */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-500 dark:text-emerald-300/80">
                <span>📍</span>
                <span>จุดเริ่มต้นยอดนิยม (แตะเพื่อเลือก):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ORIGIN_PRESETS.map((preset) => {
                  const isSelected = formState.originText === preset.text;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSelectOriginPreset(preset)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-500 dark:to-teal-600 text-white shadow-xs ring-1 ring-white/20 dark:ring-emerald-300/30"
                          : "bg-slate-100 dark:bg-[#0e2a21] hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 text-slate-700 dark:text-emerald-200 border border-slate-200/80 dark:border-emerald-700/40"
                      }`}
                    >
                      <span>{preset.label}</span>
                      {isSelected ? <span className="text-[10px] font-bold">✓</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* GPS Sync Card */}
          <div className="rounded-2xl sm:rounded-3xl border border-emerald-500/30 dark:border-emerald-700/40 bg-gradient-to-br from-emerald-50/70 via-white/80 to-teal-50/50 dark:from-[#09231c]/80 dark:via-[#0b2820]/60 dark:to-[#071a15]/80 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 dark:bg-emerald-500/20 text-sm">
                    🛰️
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">ระบุจากพิกัดตำแหน่งปัจจุบัน (GPS)</p>
                  {formState.originLat && formState.originLng ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 dark:bg-emerald-400/20 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300">
                      ✓ เชื่อมต่อพิกัดแล้ว
                    </span>
                  ) : null}
                </div>
                <p className="text-xs leading-5 text-slate-500 dark:text-emerald-200/70">
                  ดึงพิกัดจากมือถือหรือเบราว์เซอร์อัตโนมัติ เพื่อคำนวณเส้นทางและเวลาเดินทางจริง
                </p>
                {locationMessage ? (
                  <p className={`text-xs font-semibold ${locationMessage.includes("สำเร็จ") ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {locationMessage}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isSyncingLocation}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 dark:from-emerald-500 dark:to-teal-600 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 shadow-md shadow-emerald-900/15 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{isSyncingLocation ? "⏳" : "📡"}</span>
                <span>{isSyncingLocation ? "กำลังค้นหาตำแหน่ง..." : "ใช้ตำแหน่งปัจจุบัน (GPS)"}</span>
              </button>
            </div>
          </div>

          {/* 1. รูปแบบการเดินทาง Visual Interactive Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                1. ประเภทพาหนะเดินทาง
              </label>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">แตะเพื่อเลือก</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
              {[
                { value: "CAR", label: "รถยนต์", icon: "🚗", desc: "เก๋ง / SUV / กระบะ" },
                { value: "MOTORCYCLE", label: "มอเตอร์ไซค์", icon: "🛵", desc: "ออโต้ / บิ๊กไบค์" },
                { value: "TRAIN", label: "รถไฟ", icon: "🚆", desc: "สายเหนือ / ขุนตาน" },
                { value: "PUBLIC_TRANSPORT", label: "รถสาธารณะ", icon: "🚌", desc: "รถตู้ / สองแถว" },
                { value: "OTHER", label: "อื่น ๆ", icon: "🚙", desc: "เหมารถพร้อมคนขับ" },
              ].map((option) => {
                const isSelected = formState.transportMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField("transportMode", option.value)}
                    className={`group relative flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl border transition-all duration-200 active:scale-95 cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-b from-emerald-500/20 to-teal-500/25 dark:from-emerald-950/90 dark:to-teal-950/80 border-emerald-500 dark:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.22)] ring-2 ring-emerald-500/40 dark:ring-emerald-400/40"
                        : "bg-white/90 dark:bg-[#0c221b]/80 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/30 border-slate-200/80 dark:border-emerald-800/40 text-slate-700 dark:text-emerald-100"
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl mb-1.5 transition-transform duration-200 group-hover:scale-110">{option.icon}</span>
                    <span className={`text-xs sm:text-sm font-bold ${isSelected ? "text-emerald-950 dark:text-emerald-200" : "text-slate-800 dark:text-slate-200"}`}>
                      {option.label}
                    </span>
                    <span className="text-[10px] sm:text-[10.5px] text-slate-500 dark:text-emerald-300/70 mt-0.5">
                      {option.desc}
                    </span>
                    {isSelected ? (
                      <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <FormError message={fieldErrors.transportMode} />
          </div>

          {/* 2. Conditional Sub-options (Dynamic Expansion) */}
          {formState.transportMode === "CAR" && (
            <div className="animate-in fade-in slide-in-from-top-3 duration-250 space-y-4 rounded-2xl border border-emerald-500/30 dark:border-emerald-700/40 bg-emerald-50/60 dark:bg-emerald-950/40 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span>⚙️</span>
                <span>รายละเอียดระบบรถยนต์</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Drivetrain Option */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ระบบขับเคลื่อน</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateField("drivetrain", "2WD")}
                      className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition-all active:scale-95 cursor-pointer ${
                        formState.drivetrain === "2WD"
                          ? "border-emerald-500 bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-900 dark:text-white shadow-xs ring-1 ring-emerald-500/50"
                          : "border-slate-200 dark:border-emerald-900/40 bg-white/80 dark:bg-black/20 text-slate-600 dark:text-slate-400 hover:border-emerald-600 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <span className="text-sm font-bold">2WD</span>
                      <span className="text-[10.5px]">ขับเคลื่อน 2 ล้อ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateField("drivetrain", "4WD_AWD")}
                      className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition-all active:scale-95 cursor-pointer ${
                        formState.drivetrain === "4WD_AWD"
                          ? "border-emerald-500 bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-900 dark:text-white shadow-xs ring-1 ring-emerald-500/50"
                          : "border-slate-200 dark:border-emerald-900/40 bg-white/80 dark:bg-black/20 text-slate-600 dark:text-slate-400 hover:border-emerald-600 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <span className="text-sm font-bold">4WD / AWD</span>
                      <span className="text-[10.5px]">ขับเคลื่อน 4 ล้อ</span>
                    </button>
                  </div>
                </div>

                {/* Engine Type Option */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ประเภทเครื่องยนต์ / พลังงาน</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateField("engineType", "ICE")}
                      className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition-all active:scale-95 cursor-pointer ${
                        formState.engineType === "ICE"
                          ? "border-emerald-500 bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-900 dark:text-white shadow-xs ring-1 ring-emerald-500/50"
                          : "border-slate-200 dark:border-emerald-900/40 bg-white/80 dark:bg-black/20 text-slate-600 dark:text-slate-400 hover:border-emerald-600 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <span className="text-sm font-bold">⛽ น้ำมัน / ไฮบริด</span>
                      <span className="text-[10.5px]">ICE Engine</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateField("engineType", "EV")}
                      className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition-all active:scale-95 cursor-pointer ${
                        formState.engineType === "EV"
                          ? "border-emerald-500 bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-900 dark:text-white shadow-xs ring-1 ring-emerald-500/50"
                          : "border-slate-200 dark:border-emerald-900/40 bg-white/80 dark:bg-black/20 text-slate-600 dark:text-slate-400 hover:border-emerald-600 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <span className="text-sm font-bold">⚡ ไฟฟ้า 100%</span>
                      <span className="text-[10.5px]">EV Electric</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Motorcycle Sub-options */}
          {formState.transportMode === "MOTORCYCLE" && (
            <div className="animate-in fade-in slide-in-from-top-3 duration-250 space-y-3 rounded-2xl border border-emerald-500/30 dark:border-emerald-700/40 bg-emerald-50/60 dark:bg-emerald-950/40 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span>⚙️</span>
                <span>ประเภทและขนาดเครื่องยนต์มอเตอร์ไซค์</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField("motorcycleType", "AUTO_UNDER_150")}
                  className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all active:scale-95 cursor-pointer ${
                    formState.motorcycleType === "AUTO_UNDER_150"
                      ? "border-emerald-500 bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-900 dark:text-white shadow-xs ring-1 ring-emerald-500/50"
                      : "border-slate-200 dark:border-emerald-900/40 bg-white/80 dark:bg-black/20 text-slate-600 dark:text-slate-400 hover:border-emerald-600 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span className="text-2xl mb-1">🛵</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">ออโตเมติก (&lt;150cc)</span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">Scooter / รถเกียร์ออโต้</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateField("motorcycleType", "MANUAL_BIGBIKE")}
                  className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all active:scale-95 cursor-pointer ${
                    formState.motorcycleType === "MANUAL_BIGBIKE"
                      ? "border-emerald-500 bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-900 dark:text-white shadow-xs ring-1 ring-emerald-500/50"
                      : "border-slate-200 dark:border-emerald-900/40 bg-white/80 dark:bg-black/20 text-slate-600 dark:text-slate-400 hover:border-emerald-600 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span className="text-2xl mb-1">🏍️</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">เกียร์ธรรมดา / Big Bike</span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">คลัตช์มือ / วิบาก / Touring</span>
                </button>
              </div>
            </div>
          )}

          {/* Train Sub-options & Northern Rail Route Info */}
          {formState.transportMode === "TRAIN" && (
            <div className="animate-in fade-in slide-in-from-top-3 duration-250 space-y-3.5 rounded-2xl border border-emerald-500/30 dark:border-emerald-700/40 bg-emerald-50/60 dark:bg-emerald-950/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <span>🚆</span>
                  <span>ข้อมูลและประเภทการเดินทางด้วยรถไฟสายเหนือ</span>
                </div>
                <span className="inline-flex shrink-0 items-center justify-center text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/20 whitespace-nowrap">
                  ความปลอดภัยสูง
                </span>
              </div>

              {/* Train Class / Type Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ประเภทขบวนรถไฟที่เลือกใช้
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => updateField("trainType", "CNR_SLEEPER")}
                    className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all active:scale-95 cursor-pointer ${
                      formState.trainType === "CNR_SLEEPER"
                        ? "border-emerald-500 bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-900 dark:text-white shadow-xs ring-1 ring-emerald-500/50"
                        : "border-slate-200 dark:border-emerald-900/40 bg-white/80 dark:bg-black/20 text-slate-600 dark:text-slate-400 hover:border-emerald-600 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <span className="text-2xl mb-1">🛌</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">ด่วนพิเศษ CNR / ตู้นอน</span>
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">ขบวนอุตราวิถี ปรับอากาศ นอนสบาย</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField("trainType", "RAPID_LOCAL")}
                    className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all active:scale-95 cursor-pointer ${
                      formState.trainType === "RAPID_LOCAL"
                        ? "border-emerald-500 bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-900 dark:text-white shadow-xs ring-1 ring-emerald-500/50"
                        : "border-slate-200 dark:border-emerald-900/40 bg-white/80 dark:bg-black/20 text-slate-600 dark:text-slate-400 hover:border-emerald-600 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <span className="text-2xl mb-1">🪟</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">รถเร็ว / รถธรรมดาท้องถิ่น</span>
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">สัมผัสวิวธรรมชาติ สบายๆ</span>
                  </button>
                </div>
              </div>

              {/* Park Train Connection Highlight */}
              <div className="rounded-xl border border-emerald-500/30 bg-white/90 dark:bg-emerald-950/60 p-3 text-xs text-slate-700 dark:text-emerald-100 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                  <span>💡</span>
                  <span>ข้อแนะนำการเดินทางด้วยรถไฟสู่อุทยานแห่งชาติภาคเหนือ:</span>
                </div>
                <div className="text-[11.5px] leading-relaxed text-slate-600 dark:text-emerald-200/90 space-y-1">
                  <p>
                    • <strong className="text-emerald-700 dark:text-emerald-300">อุทยานแห่งชาติดอยขุนตาล:</strong> สามารถนั่งรถไฟลงที่ <em>"สถานีรถไฟขุนตาน"</em> แล้วเดินเท้าตรงเข้าสู่ที่ทำการอุทยานฯ ได้ทันที ผ่านอุโมงค์ขุนตาน
                  </p>
                  <p>
                    • <strong className="text-emerald-700 dark:text-emerald-300">อุทยานฯ อื่นๆ ในภาคเหนือ:</strong> ลงที่สถานีหลัก เช่น สถานีเชียงใหม่ สถานีลำปาง สถานีเด่นชัย (แพร่/น่าน) สถานีพิษณุโลก แล้วต่อรถสองแถว รถโดยสารประจำทาง หรือเช่ารถขับ
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* สำหรับ รถไฟ / รถสาธารณะ: ถามความต้องการเช่ารถขับเองที่ปลายทาง */}
          {(formState.transportMode === "TRAIN" || formState.transportMode === "PUBLIC_TRANSPORT" || formState.transportMode === "OTHER") && (
            <div className="animate-in fade-in slide-in-from-top-3 duration-250 space-y-3.5 rounded-2xl border border-emerald-500/30 dark:border-emerald-700/40 bg-white/90 dark:bg-emerald-950/40 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>🚗</span>
                    <span>คุณต้องการเช่ารถขับเองที่ปลายทางหรือไม่?</span>
                  </label>
                  <p className="text-xs text-slate-500 dark:text-emerald-300/70">
                    เช่น เช่ารถยนต์หรือเช่ามอเตอร์ไซค์ขับต่อจากสถานี/จุดส่งผู้โดยสาร
                  </p>
                </div>

                <div className="inline-flex rounded-xl bg-slate-100 dark:bg-black/30 p-1 border border-slate-200/80 dark:border-emerald-900/40 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateField("rentVehicleAtDestination", "NO")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                      formState.rentVehicleAtDestination === "NO"
                        ? "bg-white dark:bg-emerald-600 text-emerald-800 dark:text-white shadow-xs font-extrabold border border-slate-200/60 dark:border-emerald-500"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    ❌ ไม่ใช่ (ใช้รถสาธารณะต่อ)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("rentVehicleAtDestination", "YES")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                      formState.rentVehicleAtDestination === "YES"
                        ? "bg-emerald-600 dark:bg-emerald-500 text-white shadow-xs font-extrabold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    🔑 ใช่ (เช่าขับเอง)
                  </button>
                </div>
              </div>

              {formState.rentVehicleAtDestination === "NO" && (
                <div className="animate-in fade-in duration-200 flex items-start gap-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-900/30 border border-emerald-500/20 p-3 text-xs text-emerald-800 dark:text-emerald-200">
                  <span className="text-base leading-none shrink-0 mt-0.5">🛡️</span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-emerald-900 dark:text-emerald-300">
                      ระบบประเมินความปลอดภัยสูงมาก
                    </p>
                    <p className="text-[11px] leading-relaxed text-emerald-800/90 dark:text-emerald-300/80">
                      เนื่องจากใช้บริการรถสาธารณะ/รถสองแถวของอุทยาน/เดินเท้า จึงไม่มีความเสี่ยงเรื่องการขับขี่บนทางลาดชันหรือโค้งหักศอกด้วยตนเอง (ระบบจะซ่อนการประเมินผู้ขับขี่ส่วนนี้)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Driver Readiness Profile Section - แสดงเมื่อขับไปเองตั้งแต่ต้น หรือเลือกเช่ารถขับเองที่ปลายทาง */}
          {(formState.transportMode === "CAR" ||
            formState.transportMode === "MOTORCYCLE" ||
            formState.rentVehicleAtDestination === "YES") && (
            <div className="animate-in fade-in slide-in-from-top-3 duration-250 space-y-4 border-t border-slate-200/80 dark:border-emerald-800/40 pt-4">
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  2. ประเมินความพร้อมของผู้ขับขี่ {formState.rentVehicleAtDestination === "YES" ? "(สำหรับขับรถเช่าปลายทาง)" : ""}
                </label>
                <p className="text-xs text-slate-500 dark:text-emerald-300/70">
                  ประเมินประสบการณ์เพื่อความปลอดภัยบนเส้นทางลาดชันและคดเคี้ยว
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Mountain Experience */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ประสบการณ์ขับรถขึ้น-ลงเขา
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateField("mountainExperience", "BEGINNER")}
                      className={`flex flex-col items-center rounded-2xl border p-3 text-center transition-all active:scale-95 cursor-pointer ${
                        formState.mountainExperience === "BEGINNER"
                          ? "border-emerald-500 bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-900 dark:text-white shadow-[0_0_15px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/50"
                          : "border-slate-200/80 dark:border-emerald-900/40 bg-white/80 dark:bg-emerald-950/20 text-slate-600 dark:text-slate-400 hover:border-emerald-600"
                      }`}
                    >
                      <span className="text-2xl mb-1">🔰</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">มือใหม่ทางเขา</span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">ยังไม่คุ้นเคยเส้นทางชัน</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateField("mountainExperience", "EXPERIENCED")}
                      className={`flex flex-col items-center rounded-2xl border p-3 text-center transition-all active:scale-95 cursor-pointer ${
                        formState.mountainExperience === "EXPERIENCED"
                          ? "border-emerald-500 bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-900 dark:text-white shadow-[0_0_15px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/50"
                          : "border-slate-200/80 dark:border-emerald-900/40 bg-white/80 dark:bg-emerald-950/20 text-slate-600 dark:text-slate-400 hover:border-emerald-600"
                      }`}
                    >
                      <span className="text-2xl mb-1">🏔️</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">ชำนาญทางเขา</span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">เคยขับเส้นทางดอยสูง</span>
                    </button>
                  </div>
                </div>

                {/* Co-Driver / Fatigue Risk */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    จำนวนคนขับ (ประเมินความล้า)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateField("coDriver", "SOLO")}
                      className={`flex flex-col items-center rounded-2xl border p-3 text-center transition-all active:scale-95 cursor-pointer ${
                        formState.coDriver === "SOLO"
                          ? "border-emerald-500 bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-900 dark:text-white shadow-[0_0_15px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/50"
                          : "border-slate-200/80 dark:border-emerald-900/40 bg-white/80 dark:bg-emerald-950/20 text-slate-600 dark:text-slate-400 hover:border-emerald-600"
                      }`}
                    >
                      <span className="text-2xl mb-1">👤</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">ขับคนเดียว (Solo)</span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">ไม่มีผู้ช่วยสลับขับ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateField("coDriver", "CO_DRIVER")}
                      className={`flex flex-col items-center rounded-2xl border p-3 text-center transition-all active:scale-95 cursor-pointer ${
                        formState.coDriver === "CO_DRIVER"
                          ? "border-emerald-500 bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-900 dark:text-white shadow-[0_0_15px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/50"
                          : "border-slate-200/80 dark:border-emerald-900/40 bg-white/80 dark:bg-emerald-950/20 text-slate-600 dark:text-slate-400 hover:border-emerald-600"
                      }`}
                    >
                      <span className="text-2xl mb-1">👥</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">มีคนสลับขับ</span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">ลดความเหนื่อยล้า</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Live Mountain Readiness Safety Insight Card */}
          <div className="rounded-2xl border border-emerald-500/30 dark:border-emerald-700/40 bg-emerald-500/10 dark:bg-emerald-950/50 p-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">🧭</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-300">
                  ข้อแนะนำความปลอดภัยสำหรับพาหนะ & ผู้ขับขี่
                </span>
              </div>
              <div className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-[11px] sm:text-xs font-bold tracking-tight whitespace-nowrap shadow-xs backdrop-blur-md transition-all ${
                (formState.transportMode !== "CAR" && formState.transportMode !== "MOTORCYCLE" && formState.rentVehicleAtDestination === "NO") ||
                (formState.mountainExperience === "EXPERIENCED" && (formState.transportMode !== "CAR" || formState.drivetrain === "4WD_AWD"))
                  ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 shadow-emerald-950/10"
                  : "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-amber-950/10"
              }`}>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  (formState.transportMode !== "CAR" && formState.transportMode !== "MOTORCYCLE" && formState.rentVehicleAtDestination === "NO") ||
                  (formState.mountainExperience === "EXPERIENCED" && (formState.transportMode !== "CAR" || formState.drivetrain === "4WD_AWD"))
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-amber-500"
                }`} />
                <span className="text-center font-extrabold leading-none">
                  {formState.transportMode !== "CAR" && formState.transportMode !== "MOTORCYCLE" && formState.rentVehicleAtDestination === "NO"
                    ? "ความปลอดภัยสูงมาก"
                    : formState.mountainExperience === "EXPERIENCED"
                    ? "ความพร้อมสูง"
                    : "ควรเพิ่มความระมัดระวัง"}
                </span>
              </div>
            </div>

            <ul className="mt-2.5 space-y-1.5 text-[11.5px] text-slate-700 dark:text-slate-300">
              {/* รถไฟ กรณีไม่เช่ารถขับเอง */}
              {formState.transportMode === "TRAIN" && formState.rentVehicleAtDestination === "NO" && (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                    <span>เดินทางด้วยรถไฟ: ความปลอดภัยสูงมาก ไม่มีความเสี่ยงเรื่องการขับรถบนทางลาดชันหรือโค้งหักศอก</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 dark:text-teal-400 font-bold">•</span>
                    <span>หากเดินทางไปอุทยานแห่งชาติดอยขุนตาล สามารถลงที่สถานีขุนตานและเดินเท้าสู่อุทยานได้โดยตรง</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-600 dark:text-slate-400 font-bold">•</span>
                    <span>แนะนำตรวจสอบตารางเดินรถไฟและสำรองที่นั่งล่วงหน้า โดยเฉพาะขบวนด่วนพิเศษช่วงวันหยุด</span>
                  </li>
                </>
              )}

              {/* รถสาธารณะ/อื่น ๆ กรณีไม่เช่ารถขับเอง */}
              {(formState.transportMode === "PUBLIC_TRANSPORT" || formState.transportMode === "OTHER") && formState.rentVehicleAtDestination === "NO" && (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                    <span>ใช้บริการรถสาธารณะ/เหมารถพร้อมคนขับท้องถิ่น: มีความชำนาญทางสูงและปลอดภัย ไม่เหนื่อยล้าจากการขับเอง</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 dark:text-teal-400 font-bold">•</span>
                    <span>แนะนำตรวจสอบรอบเวลาเดินรถสองแถวของอุทยาน หรือนัดหมายเวลากลับกับคนขับรถท้องถิ่นล่วงหน้า</span>
                  </li>
                </>
              )}

              {/* กรณีเช่ารถขับเองที่ปลายทาง */}
              {formState.transportMode !== "CAR" && formState.transportMode !== "MOTORCYCLE" && formState.rentVehicleAtDestination === "YES" && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                  <span>เช่ารถขับต่อที่ปลายทาง: ควรตรวจเช็กระบบเบรก ยาง และกำลังเครื่องยนต์ของรถเช่าก่อนขับขึ้นดอย</span>
                </li>
              )}

              {/* คำแนะนำสำหรับรถยนต์ */}
              {formState.transportMode === "CAR" && formState.drivetrain === "4WD_AWD" && (
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                  <span>ระบบ 4WD/AWD ยึดเกาะถนนโค้งลาดชันได้มั่นคง ปลอดภัยสูง</span>
                </li>
              )}
              {formState.transportMode === "CAR" && formState.drivetrain === "2WD" && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                  <span>รถขับเคลื่อน 2 ล้อ ควรระวังทางดินชันหรือพื้นผิวลื่นช่วงฝนตก</span>
                </li>
              )}
              {formState.transportMode === "CAR" && formState.engineType === "EV" && (
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 dark:text-teal-400 font-bold">•</span>
                  <span>รถยนต์ไฟฟ้า (EV) ควรตรวจสอบสถานีชาร์จตามเส้นทาง และเผื่อพลังงานขณะขับขึ้นดอยสูง</span>
                </li>
              )}

              {/* คำแนะนำสำหรับมอเตอร์ไซค์ */}
              {formState.transportMode === "MOTORCYCLE" && formState.motorcycleType === "AUTO_UNDER_150" && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                  <span>รถออโตเมติก &lt;150cc ควรระวังระบบเบรกไหม้ขณะลงทางชัน ใช้ Engine Brake ช่วยเป็นระยะ</span>
                </li>
              )}

              {/* คำแนะนำผู้ขับขี่ (แสดงเมื่อขับเองหรือเช่าขับ) */}
              {(formState.transportMode === "CAR" || formState.transportMode === "MOTORCYCLE" || formState.rentVehicleAtDestination === "YES") && (
                <>
                  {formState.mountainExperience === "BEGINNER" && (
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                      <span>มือใหม่ทางเขา ควรใช้ความเร็วต่ำ เปิดไฟหน้ารถเมื่อมีหมอก และงดแซงในทางโค้ง</span>
                    </li>
                  )}
                  {formState.coDriver === "SOLO" && (
                    <li className="flex items-start gap-2">
                      <span className="text-slate-600 dark:text-slate-400 font-bold">•</span>
                      <span>ขับคนเดียว ควรแวะจุดพักรถทุก 2 ชั่วโมงเพื่อป้องกันความเหนื่อยล้าสะสม</span>
                    </li>
                  )}
                  {formState.coDriver === "CO_DRIVER" && (
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                      <span>มีผู้ช่วยสลับขับ ช่วยลดความเสี่ยงจากความเหนื่อยล้าได้เป็นอย่างดี</span>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>

          {/* 5. จำนวนผู้เดินทาง Stepper & Quick Options */}
          <div className="space-y-2.5 border-t border-slate-200/80 dark:border-emerald-800/40 pt-4">
            <TripFormField label="3. จำนวนผู้เดินทางทั้งหมด (คน)" htmlFor="travelerCount" hint="แตะปุ่ม + / - หรือกดปุ่มลัด">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-2xl border border-slate-200/80 dark:border-emerald-800/40 bg-white/90 dark:bg-[#0c221b]/90 p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(formState.travelerCount, 10) || 1;
                      if (current > 1) updateField("travelerCount", String(current - 1));
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-[#0e2a21] hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-slate-700 dark:text-emerald-200 font-bold transition-all active:scale-90 cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    id="travelerCount"
                    type="number"
                    min={1}
                    value={formState.travelerCount}
                    onChange={(event) => updateField("travelerCount", event.target.value)}
                    className="w-14 border-0 bg-transparent text-center text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(formState.travelerCount, 10) || 1;
                      updateField("travelerCount", String(current + 1));
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-[#0e2a21] hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-slate-700 dark:text-emerald-200 font-bold transition-all active:scale-90 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Quick traveler presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: "👤 1 คน (เดี่ยว)", count: "1" },
                    { label: "👥 2 คน (คู่)", count: "2" },
                    { label: "👨‍👩‍👧 4 คน (กลุ่ม)", count: "4" },
                  ].map((preset) => (
                    <button
                      key={preset.count}
                      type="button"
                      onClick={() => updateField("travelerCount", preset.count)}
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-all active:scale-95 cursor-pointer ${
                        formState.travelerCount === preset.count
                          ? "bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-500 dark:to-teal-600 text-white shadow-xs ring-1 ring-white/20 dark:ring-emerald-300/30"
                          : "bg-slate-100 dark:bg-[#0e2a21] hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 text-slate-700 dark:text-emerald-200 border border-slate-200/80 dark:border-emerald-700/40"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <FormError message={fieldErrors.travelerCount} />
            </TripFormField>
          </div>
        </div>
      </section>

      {!isCreateMode ? (
        <section className="soft-card rounded-3xl p-4.5 sm:p-6 border border-white/60 dark:border-emerald-800/40 shadow-md shadow-emerald-950/5 backdrop-blur-2xl bg-white/85 dark:bg-[#0b1c16]/90">
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="guide-chip text-xs">Step 04</span>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white font-heading">
                ตั้งค่าขั้นสูง (Advanced Settings)
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-emerald-200/80 font-normal leading-relaxed">
                ระบบใส่ค่าเริ่มต้นที่ปลอดภัยไว้แล้ว เปิดส่วนนี้เมื่อต้องการปรับแต่งเพิ่มเติม
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
              className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-300 dark:border-emerald-700/60 bg-white/80 dark:bg-emerald-950/60 hover:bg-emerald-50 dark:hover:bg-emerald-900/50 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-emerald-200 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              {showAdvanced ? "ซ่อนการตั้งค่าขั้นสูง" : "เปิดการตั้งค่าขั้นสูง"}
            </button>
          </div>

          {!showAdvanced ? (
            <div className="mt-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/80 dark:border-white/10 dark:bg-emerald-950/30 px-4 py-3 text-xs sm:text-sm text-slate-600 dark:text-emerald-200/80 leading-relaxed">
              ใช้ค่ามาตรฐาน: อากาศแจ่มใส เวลาเดินทาง 120 นาที และซ่อนตัวเลือกเพิ่มเติม
            </div>
          ) : null}

          {showAdvanced ? (
            <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/60 dark:border-white/10 dark:bg-emerald-950/40 p-4 sm:grid-cols-2">
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
            </div>
          ) : null}
        </section>
      ) : null}

      <FormError message={formError} />

      <div className="floating-action-bar">
        <div className="glass-tabbar rounded-3xl p-3 sm:p-3.5 border border-emerald-500/20 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-6 py-3.5 text-sm sm:text-base font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
            >
              <span>{isSubmitting ? "⏳" : "🧭"}</span>
              <span>
                {isSubmitting
                  ? isCreateMode
                    ? "กำลังประเมินทริป..."
                    : "กำลังบันทึก..."
                  : isCreateMode
                    ? "ประเมินทริป"
                    : "บันทึกการแก้ไข"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-300 dark:border-emerald-800/50 bg-slate-100/90 dark:bg-emerald-950/60 hover:bg-slate-200 dark:hover:bg-emerald-900/60 px-5 py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-emerald-200 active:scale-95 transition-all cursor-pointer"
            >
              ย้อนกลับ
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
