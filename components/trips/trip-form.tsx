// ./components/trips/trip-form.tsx

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { FormError } from "@/components/ui/form-error";
import { useToast } from "@/components/ui/toast";
import {
  Map,
  Edit3,
  Trees,
  Calendar,
  Car,
  MapPin,
  Check,
  Radio,
  Loader2,
  Bike,
  Train,
  Bus,
  CarFront,
  User,
  Users,
  Compass,
} from "lucide-react";
import {
  QUICK_ORIGIN_PRESETS,
  WEATHER_CONDITION_OPTIONS,
  TRANSPORT_MODE_OPTIONS,
} from "@/lib/constants/trip-form-options";
import type { ParkOptionDto } from "@/lib/mappers/park-dto";
import type { TripDetailDto } from "@/lib/mappers/trip-dto";
import { addDays, fromYMD, toYMD } from "@/lib/date";
import { toDateInputValue } from "@/lib/utils/date";

import { TripFormField } from "./trip-form-fields/trip-form-field";
import { ParkSearchSelect } from "./park-search-select";
import { TripDatePicker } from "./trip-date-picker";
import { TripTimePicker } from "./trip-time-picker";

type TripFormMode = "create" | "edit";

type TripFormProps = {
  mode: TripFormMode;
  parks: ParkOptionDto[];
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
  notes: string;
};

function getDefaultTripDate(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
  // Upcoming weekend (Saturday):
  let daysToAdd = (6 - dayOfWeek + 7) % 7;
  if (daysToAdd === 0) {
    // If today is Saturday, suggest tomorrow Sunday (+1 day)
    daysToAdd = 1;
  }
  const defaultDate = addDays(now, daysToAdd);
  return toYMD(defaultDate);
}

function getInitialState(
  mode: TripFormMode,
  initialParkId?: string,
  trip?: TripDetailDto,
): FormState {
  if (mode === "edit" && trip) {
    return {
      parkId: trip.park.id,
      tripDate: trip.tripDate ? toDateInputValue(trip.tripDate) : "",
      departAt: trip.departAt ?? "",
      originText: trip.originText ?? "",
      originLat: trip.originLat !== null ? String(trip.originLat) : "",
      originLng: trip.originLng !== null ? String(trip.originLng) : "",
      transportMode: trip.transportMode ?? "",
      travelerCount: trip.travelerCount === null ? "" : String(trip.travelerCount),
      weatherCondition: trip.weatherCondition ?? "",
      estimatedTravelMinutes: trip.estimatedTravelMinutes === null ? "" : String(trip.estimatedTravelMinutes),
      notes: trip.notes ?? "",
    };
  }

  return {
    parkId: initialParkId ?? "",
    tripDate: getDefaultTripDate(),
    departAt: "07:00",
    originText: "ตัวเมืองเชียงใหม่",
    originLat: "18.7883",
    originLng: "98.9853",
    transportMode: "CAR",
    travelerCount: "2",
    weatherCondition: "",
    estimatedTravelMinutes: "",
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
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ];
    const thaiYear = year > 2400 ? year : year + 543;
    const dateObj = new Date(year, month - 1, day);
    const dayNames = [
      "วันอาทิตย์",
      "วันจันทร์",
      "วันอังคาร",
      "วันพุธ",
      "วันพฤหัสบดี",
      "วันศุกร์",
      "วันเสาร์",
    ];
    const dayName = dayNames[dateObj.getDay()] ?? "วัน";

    return `${dayName}ที่ ${day} ${thaiMonths[month - 1]} พ.ศ. ${thaiYear}`;
  } catch {
    return dateStr;
  }
}

function getThaiTimeDescription(timeStr: string): {
  label: string;
  tone: "positive" | "neutral" | "warning";
} {
  if (!timeStr) return { label: "", tone: "neutral" };
  const [hourStr, minStr = "00"] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return { label: `${timeStr} น.`, tone: "neutral" };

  const formattedTime = `${hourStr.padStart(2, "0")}:${minStr.padStart(2, "0")} น.`;

  if (hour >= 5 && hour < 7) {
    return {
      label: `ออกเดินทาง ${formattedTime} (เช้าตรู่ • เหมาะชมพระอาทิตย์ขึ้น)`,
      tone: "positive",
    };
  } else if (hour >= 7 && hour < 9) {
    return {
      label: `ออกเดินทาง ${formattedTime} (ช่วงเช้า • เวลาแนะนำสำหรับขับรถขึ้นดอย)`,
      tone: "positive",
    };
  } else if (hour >= 9 && hour < 12) {
    return {
      label: `ออกเดินทาง ${formattedTime} (ช่วงสาย • สว่างชัดเจน)`,
      tone: "neutral",
    };
  } else if (hour >= 12 && hour < 15) {
    return { label: `ออกเดินทาง ${formattedTime} (ช่วงบ่าย)`, tone: "neutral" };
  } else if (hour >= 15 && hour < 17) {
    return {
      label: `ออกเดินทาง ${formattedTime} (บ่ายแก่ • ควรระวังเวลาพระอาทิตย์ตก)`,
      tone: "warning",
    };
  } else {
    return {
      label: `ออกเดินทาง ${formattedTime} (ช่วงค่ำ • ทัศนวิสัยจำกัด แนะนำปรับเวลา)`,
      tone: "warning",
    };
  }
}

const QUICK_TIME_PRESETS = [
  { label: "06:00 น.", time: "06:00" },
  { label: "07:30 น.", time: "07:30" },
  { label: "09:00 น.", time: "09:00" },
  { label: "13:00 น.", time: "13:00" },
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

type RefreshEvaluationErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: {
      tripDate?: string;
      lastSupportedDate?: string;
    };
  };
};

function getRefreshEvaluationErrorMessage(
  payload: RefreshEvaluationErrorPayload | null,
) {
  const code = payload?.error?.code;

  switch (code) {
    case "weather_forecast_not_available_yet":
      return [
        "บันทึกแผนการเดินทางเรียบร้อยแล้ว",
        "",
        "วันเดินทางยังอยู่นอกช่วงพยากรณ์อากาศที่ระบบรองรับ",
        "จึงยังไม่สามารถประเมินความพร้อมของแผนได้ในขณะนี้",
        "",
        "กรุณากลับมาประเมินอีกครั้งเมื่อใกล้วันเดินทาง",
      ].join("\n");

    case "trip_date_in_past":
      return [
        "บันทึกแผนการเดินทางแล้ว แต่วันที่เดินทางเป็นวันที่ผ่านมาแล้ว",
        "กรุณาแก้ไขวันที่เดินทางก่อนประเมินใหม่",
      ].join("\n");

    case "weather_sync_unavailable":
      return [
        "บันทึกแผนการเดินทางเรียบร้อยแล้ว",
        "",
        "ขณะนี้ไม่สามารถดึงข้อมูลพยากรณ์อากาศได้",
        "กรุณาลองประเมินใหม่อีกครั้งภายหลัง",
      ].join("\n");

    case "route_sync_unavailable":
      return [
        "บันทึกแผนการเดินทางเรียบร้อยแล้ว",
        "",
        "ขณะนี้ไม่สามารถคำนวณข้อมูลเส้นทางได้",
        "กรุณาลองประเมินใหม่อีกครั้งภายหลัง",
      ].join("\n");

    case "sunset_sync_unavailable":
      return [
        "บันทึกแผนการเดินทางเรียบร้อยแล้ว",
        "",
        "ขณะนี้ไม่สามารถเตรียมข้อมูลเวลาพระอาทิตย์ตกได้",
        "กรุณาลองประเมินใหม่อีกครั้งภายหลัง",
      ].join("\n");

    case "trip_context_missing":
      return [
        "บันทึกแผนการเดินทางเรียบร้อยแล้ว",
        "",
        "ข้อมูลบางส่วนยังไม่เพียงพอสำหรับการประเมิน",
        "กรุณาตรวจสอบข้อมูลทริปแล้วลองอีกครั้ง",
      ].join("\n");

    default:
      return (
        payload?.error?.message ??
        "สร้างทริปสำเร็จแล้ว แต่ยังประเมินอัตโนมัติไม่สำเร็จ คุณสามารถลองประเมินอีกครั้งจากหน้าผลประเมินได้"
      );
  }
}

export function TripForm({ mode, parks, initialParkId, trip }: TripFormProps) {
  const router = useRouter();
  const toast = useToast();
  const isCreateMode = mode === "create";
  const [formState, setFormState] = useState<FormState>(
    getInitialState(mode, initialParkId, trip),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingLocation, setIsSyncingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string>();

  const parkOptions = useMemo(() => parks, [parks]);

  function updateField<Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) {
    setFormState((current) => key === "originText"
      ? { ...current, originText: String(value), originLat: "", originLng: "" }
      : { ...current, [key]: value });
  }

  function handleSelectOriginPreset(
    preset: (typeof QUICK_ORIGIN_PRESETS)[number],
  ) {
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
          originText: "ตำแหน่งปัจจุบัน (GPS)",
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
        setLocationMessage("เชื่อมต่อพิกัดตำแหน่งปัจจุบันสำเร็จ");
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

  function scrollToFirstError(
    errors: Record<string, string>,
    generalError?: string,
  ) {
    const performScroll = () => {
      // 1. Specific field error mappings to container section IDs or inputs in top-to-bottom order
      const fieldMapping: Record<string, string[]> = {
        parkId: ["step-park", "parkId", "park-search-select"],
        tripDate: ["step-datetime", "tripDate"],
        departAt: ["step-datetime", "departAt"],
        originText: ["step-origin", "originText"],
        originLat: ["step-origin", "originText"],
        originLng: ["step-origin", "originText"],
        transportMode: ["step-origin", "transportMode"],
        travelerCount: ["step-origin", "travelerCount"],
        notes: ["notes"],
      };

      for (const [field, selectors] of Object.entries(fieldMapping)) {
        if (errors[field]) {
          for (const selector of selectors) {
            const el =
              document.getElementById(selector) ||
              document.querySelector(`[name="${selector}"]`);
            if (el) {
              const rect = el.getBoundingClientRect();
              const scrollTop =
                window.pageYOffset || document.documentElement.scrollTop;
              const targetY = scrollTop + rect.top - 80;
              window.scrollTo({
                top: Math.max(0, targetY),
                behavior: "smooth",
              });

              // Focus input if available
              const inputEl =
                el.tagName === "INPUT" ||
                el.tagName === "SELECT" ||
                el.tagName === "TEXTAREA"
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
      const firstErrorElement = document.querySelector<HTMLElement>(
        ".form-error, [role='alert']",
      );
      if (firstErrorElement) {
        const rect = firstErrorElement.getBoundingClientRect();
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
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
          const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;
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

    if (isCreateMode && (!formState.tripDate || formState.tripDate.trim().length === 0)) {
      missing.push("กรุณากำหนดวันที่เดินทาง");
      newFieldErrors.tripDate = "กรุณากำหนดวันที่เดินทาง";
    } else if (formState.tripDate) {
      const selected = fromYMD(formState.tripDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + 15);
      maxDate.setHours(23, 59, 59, 999);

      const target = new Date(selected);
      target.setHours(0, 0, 0, 0);

      if (target < today) {
        missing.push("ไม่สามารถเลือกวันเดินทางในอดีตได้");
        newFieldErrors.tripDate = "ไม่สามารถเลือกวันเดินทางในอดีตได้";
      } else if (target > maxDate) {
        missing.push("เลือกวันเดินทางได้ล่วงหน้าสูงสุด 16 วันเท่านั้น");
        newFieldErrors.tripDate =
          "เลือกวันเดินทางได้ล่วงหน้าสูงสุด 16 วัน (ตามช่วงพยากรณ์อากาศ)";
      }
    }

    if (isCreateMode && (!formState.departAt || formState.departAt.trim().length === 0)) {
      missing.push("กรุณาระบุเวลาออกเดินทาง");
      newFieldErrors.departAt = "กรุณาระบุเวลาออกเดินทาง";
    }

    if (isCreateMode && (!formState.originText || formState.originText.trim().length === 0)) {
      missing.push("กรุณาระบุจุดเริ่มต้นเดินทาง");
      newFieldErrors.originText = "กรุณาระบุจุดเริ่มต้นเดินทาง";
    }

    if (isCreateMode && !formState.weatherCondition) {
      missing.push("กรุณาระบุสภาพอากาศสำหรับการประเมินเบื้องต้น");
      newFieldErrors.weatherCondition = "กรุณาเลือกสภาพอากาศ";
    }

    if (isCreateMode && (!Number.isInteger(Number(formState.estimatedTravelMinutes)) || Number(formState.estimatedTravelMinutes) < 1)) {
      missing.push("กรุณาระบุเวลาเดินทางโดยประมาณ");
      newFieldErrors.estimatedTravelMinutes = "กรุณาระบุเวลาเดินทางเป็นนาที";
    }

    if (missing.length > 0) {
      setFieldErrors(newFieldErrors);
      scrollToFirstError(newFieldErrors);
      return;
    }

    if (
      isCreateMode &&
      (formState.originLat.trim().length === 0 ||
        formState.originLng.trim().length === 0)
    ) {
      const originError =
        "กรุณากดใช้ตำแหน่งปัจจุบันก่อนประเมินทริป เพื่อให้ระบบคำนวณเส้นทางได้";
      setFormError(originError);
      scrollToFirstError({}, originError);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      parkId: formState.parkId,
      tripDate: formState.tripDate || null,
      departAt: formState.departAt || null,
      originText: formState.originText || null,
      originLat: toOptionalNumber(formState.originLat) ?? null,
      originLng: toOptionalNumber(formState.originLng) ?? null,
      transportMode:
        formState.transportMode === "TRAIN"
          ? "PUBLIC_TRANSPORT"
          : formState.transportMode || null,
      travelerCount: formState.travelerCount ? Number(formState.travelerCount) : null,
      weatherCondition: formState.weatherCondition || null,
      estimatedTravelMinutes: formState.estimatedTravelMinutes ? Number(formState.estimatedTravelMinutes) : null,
      notes: formState.notes || undefined,
    };

    try {
      const response = await fetch(
        isCreateMode ? "/api/v1/trips" : `/api/v1/trips/${trip?.id}`,
        {
          method: isCreateMode ? "POST" : "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && Array.isArray(data.error?.details)) {
          const errors = Object.fromEntries(
            (data.error.details as ApiValidationDetail[]).map((detail) => [
              detail.field,
              detail.message,
            ]),
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
        const refreshResponse = await fetch(
          `/api/v1/trips/${tripId}/refresh-evaluation`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
          },
        );

        if (refreshResponse.ok) {
          router.push(`/trips/${tripId}/result`);
          router.refresh();
          return;
        }

        const refreshPayload = (await refreshResponse
          .json()
          .catch(() => null)) as RefreshEvaluationErrorPayload | null;

        const refreshMessage = getRefreshEvaluationErrorMessage(refreshPayload);
        toast.info(refreshMessage);

        router.push(`/trips/${tripId}/result`);
        router.refresh();
        return;
      }

      router.push(`/trips/${tripId}/result`);
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
        <h2 className="inline-flex items-center gap-2 text-base sm:text-lg font-semibold text-slate-900 dark:text-white font-heading">
          {mode === "create" ? (
            <Map className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Edit3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          )}
          <span>{mode === "create" ? "ขั้นตอนวางแผนทริป" : "ปรับแผนการเดินทาง"}</span>
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-emerald-200/80 font-normal leading-relaxed">
          กรอก 3 ขั้นตอนง่ายๆ เพื่อให้ระบบคำนวณและประเมินความปลอดภัยของทริป
        </p>

        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2.5">
          <div className="flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full bg-emerald-500/15 dark:bg-emerald-950/70 border border-emerald-500/35 px-2 text-center shadow-xs">
            <Trees className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" />
            <span className="text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
              1. อุทยาน
            </span>
          </div>
          <div className="flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full bg-slate-100/80 dark:bg-[#0c221b]/80 border border-slate-200/80 dark:border-emerald-800/40 px-2 text-center">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-emerald-300/70" />
            <span className="text-[11px] sm:text-xs font-medium text-slate-600 dark:text-emerald-200/70 whitespace-nowrap">
              2. วันเวลา
            </span>
          </div>
          <div className="flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full bg-slate-100/80 dark:bg-[#0c221b]/80 border border-slate-200/80 dark:border-emerald-800/40 px-2 text-center">
            <Car className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-emerald-300/70" />
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

      <section
        id="step-park"
        className="soft-card relative z-30 scroll-mt-28 rounded-3xl p-4.5 sm:p-6 border border-white/60 dark:border-emerald-800/40 shadow-lg shadow-emerald-950/5 backdrop-blur-2xl bg-white/85 dark:bg-[#0b1c16]/90 min-w-0 w-full max-w-full"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="guide-chip text-xs">Step 01</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-emerald-300/80">
              จุดหมายปลายทาง
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            จำเป็น
          </span>
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

      <section
        id="step-datetime"
        className="soft-card relative z-20 scroll-mt-28 rounded-3xl p-4.5 sm:p-6 border border-white/60 dark:border-emerald-800/40 shadow-lg shadow-emerald-950/5 backdrop-blur-2xl bg-white/85 dark:bg-[#0b1c16]/90 min-w-0 w-full max-w-full"
      >
        <div className="flex items-center gap-2">
          <span className="guide-chip text-xs">Step 02</span>
          <span className="text-xs font-semibold text-slate-500 dark:text-emerald-300/80">
            วันและเวลา
          </span>
        </div>
        <h3 className="mt-2.5 text-lg sm:text-xl font-semibold tracking-normal text-slate-900 dark:text-white font-heading">
          กำหนดวันและเวลาออกเดินทาง
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-emerald-200/80 font-normal leading-relaxed">
          เลือกวันเดินทางและเวลาที่เริ่มออกรถ เพื่อให้ระบบคำนวณระยะเวลา
          พระอาทิตย์ตก และสภาพอากาศได้อย่างแม่นยำ
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 min-w-0 w-full">
          {/* วันเดินทาง */}
          <div className="space-y-2 min-w-0 w-full max-w-full">
            <TripFormField
              label="วันเดินทาง"
              htmlFor="tripDate"
              hint="เลือกวันเดินทางได้ล่วงหน้าสูงสุด 16 วัน (สำหรับประเมินสภาพอากาศแบบเรียลไทม์)"
            >
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
            <TripFormField
              label="เวลาออกเดินทาง (24 ชม.)"
              htmlFor="departAt"
              hint="เวลาเริ่มออกเดินทางจากจุดเริ่มต้น"
            >
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

      <section
        id="step-origin"
        className="soft-card relative z-10 scroll-mt-28 rounded-3xl p-4.5 sm:p-6 border border-white/60 dark:border-emerald-800/40 shadow-lg shadow-emerald-950/5 backdrop-blur-2xl bg-white/85 dark:bg-[#0b1c16]/90 min-w-0 w-full max-w-full"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="guide-chip text-xs">Step 03</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-emerald-300/80">
              การเดินทาง
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            คำนวณเส้นทางอัตโนมัติ
          </span>
        </div>
        <h3 className="mt-2.5 text-lg sm:text-xl font-semibold tracking-normal text-slate-900 dark:text-white font-heading">
          ระบุจุดเริ่มต้นและรูปแบบการเดินทาง
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-emerald-200/80 font-normal leading-relaxed">
          เลือกจุดเริ่มต้นและประเภทพาหนะ เพื่อคำนวณระยะทาง เวลา
          และความพร้อมของเส้นทาง
        </p>

        <div className="mt-5 space-y-5">
          {/* จุดเริ่มต้นและ Quick Presets */}
          <div className="space-y-3">
            <TripFormField
              label="จุดเริ่มต้นเดินทาง"
              htmlFor="originText"
              hint="พิมพ์ชื่อสถานที่ หรือแตะเลือกจุดเริ่มต้นยอดนิยมด้านล่าง"
            >
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-base z-10 select-none">
                  <MapPin className="h-4 w-4 text-slate-400 dark:text-emerald-300/60" />
                </span>
                <input
                  id="originText"
                  type="text"
                  value={formState.originText}
                  onChange={(event) =>
                    updateField("originText", event.target.value)
                  }
                  placeholder="เช่น ตัวเมืองเชียงใหม่ สนามบินเชียงราย เมืองพิษณุโลก"
                  className="form-control !pl-11 !pr-4 text-sm font-semibold rounded-2xl bg-white/90 dark:bg-[#0c221b]/90 border-slate-200/80 dark:border-emerald-800/40 focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <FormError message={fieldErrors.originText} />
            </TripFormField>

            {/* Quick Origin Presets */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-500 dark:text-emerald-300/80">
                <MapPin className="h-3.5 w-3.5" />
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
                      {isSelected ? (
                        <Check className="h-3 w-3" />
                      ) : null}
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
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    <Radio className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    ระบุจากพิกัดตำแหน่งปัจจุบัน (GPS)
                  </p>
                  {formState.originLat && formState.originLng ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 dark:bg-emerald-400/20 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300">
                      <Check className="h-3 w-3" />
                      เชื่อมต่อพิกัดแล้ว
                    </span>
                  ) : null}
                </div>
                <p className="text-xs leading-5 text-slate-500 dark:text-emerald-200/70">
                  ดึงพิกัดจากมือถือหรือเบราว์เซอร์อัตโนมัติ
                  เพื่อคำนวณเส้นทางและเวลาเดินทางจริง
                </p>
                {locationMessage ? (
                  <p
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${locationMessage.includes("สำเร็จ") ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
                  >
                    {locationMessage.includes("สำเร็จ") ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : null}
                    <span>{locationMessage}</span>
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isSyncingLocation}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 dark:from-emerald-500 dark:to-teal-600 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 shadow-md shadow-emerald-900/15 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSyncingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Radio className="h-4 w-4" />
                )}
                <span>
                  {isSyncingLocation
                    ? "กำลังค้นหาตำแหน่ง..."
                    : "ใช้ตำแหน่งปัจจุบัน (GPS)"}
                </span>
              </button>
            </div>
          </div>

          {/* 1. รูปแบบการเดินทาง Visual Interactive Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                1. ประเภทพาหนะเดินทาง
              </label>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                แตะเพื่อเลือก
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
              {[
                {
                  value: "CAR",
                  label: "รถยนต์",
                  icon: Car,
                  desc: "เก๋ง / SUV / กระบะ",
                },
                {
                  value: "MOTORCYCLE",
                  label: "รถจักรยานยนต์",
                  icon: Bike,
                  desc: "ออโต้ / บิ๊กไบค์",
                },
                {
                  value: "TRAIN",
                  label: "รถไฟ",
                  icon: Train,
                  desc: "สายเหนือ / ขุนตาน",
                },
                {
                  value: "PUBLIC_TRANSPORT",
                  label: "รถสาธารณะ",
                  icon: Bus,
                  desc: "รถตู้ / สองแถว",
                },
                {
                  value: "OTHER",
                  label: "อื่น ๆ",
                  icon: CarFront,
                  desc: "เหมารถพร้อมคนขับ",
                },
              ].map((option) => {
                const isSelected = formState.transportMode === option.value;
                const Icon = option.icon;

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
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7 mb-1.5 transition-transform duration-200 group-hover:scale-110 text-emerald-700 dark:text-emerald-300" />
                    <span
                      className={`text-xs sm:text-sm font-bold ${isSelected ? "text-emerald-950 dark:text-emerald-200" : "text-slate-800 dark:text-slate-200"}`}
                    >
                      {option.label}
                    </span>
                    <span className="text-[10px] sm:text-[10.5px] text-slate-500 dark:text-emerald-300/70 mt-0.5">
                      {option.desc}
                    </span>
                    {isSelected ? (
                      <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <FormError message={fieldErrors.transportMode} />
          </div>

          {/* 2. จำนวนผู้เดินทาง Stepper & Quick Options */}
          <div className="space-y-2.5 border-t border-slate-200/80 dark:border-emerald-800/40 pt-4">
            <TripFormField
              label="2. จำนวนผู้เดินทางทั้งหมด (คน)"
              htmlFor="travelerCount"
              hint="แตะปุ่ม + / - หรือกดปุ่มลัด"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-2xl border border-slate-200/80 dark:border-emerald-800/40 bg-white/90 dark:bg-[#0c221b]/90 p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const current =
                        parseInt(formState.travelerCount, 10) || 1;
                      if (current > 1)
                        updateField("travelerCount", String(current - 1));
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
                    onChange={(event) =>
                      updateField("travelerCount", event.target.value)
                    }
                    className="w-14 border-0 bg-transparent text-center text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const current =
                        parseInt(formState.travelerCount, 10) || 1;
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
                    { label: "1 คน (เดี่ยว)", count: "1", icon: User },
                    { label: "2 คน (คู่)", count: "2", icon: Users },
                    { label: "4 คน (กลุ่ม)", count: "4", icon: Users },
                  ].map((preset) => {
                    const PresetIcon = preset.icon;
                    return (
                      <button
                        key={preset.count}
                        type="button"
                        onClick={() => updateField("travelerCount", preset.count)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-all active:scale-95 cursor-pointer ${
                          formState.travelerCount === preset.count
                            ? "bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-500 dark:to-teal-600 text-white shadow-xs ring-1 ring-white/20 dark:ring-emerald-300/30"
                            : "bg-slate-100 dark:bg-[#0e2a21] hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 text-slate-700 dark:text-emerald-200 border border-slate-200/80 dark:border-emerald-700/40"
                        }`}
                      >
                        <PresetIcon className="h-3 w-3" />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <FormError message={fieldErrors.travelerCount} />
            </TripFormField>
          </div>

          {/* ข้อมูลที่ผู้ใช้ระบุสำหรับการประเมินเบื้องต้น */}
          <div className="grid grid-cols-1 gap-4 border-t border-slate-200/80 pt-4 dark:border-emerald-800/40 sm:grid-cols-2">
            <TripFormField
              label="สภาพอากาศที่คาดไว้"
              htmlFor="weatherCondition"
              hint={isCreateMode ? "ระบุข้อมูลเบื้องต้นตามที่ทราบ ระบบจะตรวจพยากรณ์จริงเมื่อประเมิน" : "เว้นว่างได้หากยังไม่มีข้อมูล"}
            >
              <select
                id="weatherCondition"
                value={formState.weatherCondition}
                onChange={(event) => updateField("weatherCondition", event.target.value)}
                className={inputClassName}
              >
                <option value="">ยังไม่ระบุ</option>
                {WEATHER_CONDITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <FormError message={fieldErrors.weatherCondition} />
            </TripFormField>
            <TripFormField
              label="เวลาเดินทางโดยประมาณ (นาที)"
              htmlFor="estimatedTravelMinutes"
              hint="ระบุจากแผนของคุณ ระบบจะตรวจเส้นทางจริงเมื่อประเมิน"
            >
              <input
                id="estimatedTravelMinutes"
                type="number"
                min={1}
                step={1}
                value={formState.estimatedTravelMinutes}
                onChange={(event) => updateField("estimatedTravelMinutes", event.target.value)}
                className={inputClassName}
                placeholder="เช่น 180"
              />
              <FormError message={fieldErrors.estimatedTravelMinutes} />
            </TripFormField>
          </div>

          {/* 3. หมายเหตุเพิ่มเติม (ถ้ามี) */}
          <div className="space-y-2.5 border-t border-slate-200/80 dark:border-emerald-800/40 pt-4">
            <TripFormField
              label="3. หมายเหตุเพิ่มเติม (ถ้ามี)"
              htmlFor="notes"
              hint="เช่น เดินทางกับครอบครัว มีเด็กเล็ก หรืออยากเผื่อเวลาแวะพัก"
            >
              <input
                id="notes"
                type="text"
                value={formState.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="เช่น เดินทางกับครอบครัว, มีเด็กเล็ก"
                className="form-control !px-4 text-sm font-medium rounded-2xl bg-white/90 dark:bg-[#0c221b]/90 border-slate-200/80 dark:border-emerald-800/40 focus:ring-2 focus:ring-emerald-500/30"
              />
              <FormError message={fieldErrors.notes} />
            </TripFormField>
          </div>
        </div>
      </section>

      <FormError message={formError} />

      <div className="floating-action-bar">
        <div className="glass-tabbar rounded-3xl p-3 sm:p-3.5 border border-emerald-500/20 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-6 py-3.5 text-sm sm:text-base font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Compass className="h-5 w-5" />
              )}
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
