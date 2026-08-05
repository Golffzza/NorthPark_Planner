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

const plannerSteps = [
  { id: "01", title: "เลือกอุทยาน", subtitle: "Park guide" },
  { id: "02", title: "กำหนดวันเวลา", subtitle: "Trip timing" },
  { id: "03", title: "ระบุจุดเริ่มต้น", subtitle: "Route ready" },
  { id: "04", title: "ตรวจค่าตั้งต้น", subtitle: "Safety fallback" },
];

const compactPlannerSteps = plannerSteps.map((step, index) =>
  index === 2 ? { ...step, subtitle: "Quick start" } : index === 3 ? { ...step, subtitle: "Optional" } : step,
);

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
  const displayPlannerSteps = useMemo(
    () => (isCreateMode ? compactPlannerSteps.slice(0, 3) : compactPlannerSteps),
    [isCreateMode],
  );

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="glass-panel rounded-[34px] px-5 py-6 sm:px-7">
        <p className="guide-chip">Step-Based Planner</p>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          {mode === "create" ? "วางแผนและประเมินทริปเลย" : "ปรับแผนเดินทางของคุณ"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          planner นี้ออกแบบให้ไล่ทีละขั้นเหมือน travel companion บนมือถือ พร้อมข้อมูลที่จำเป็นสำหรับ live
          weather, route และ sunset evaluation ในภายหลัง
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {displayPlannerSteps.map((step) => (
            <div key={step.id} className="dashboard-card rounded-[24px] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-strong)]">{step.id}</p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{step.title}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{step.subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="soft-card rounded-[34px] px-5 py-6 sm:px-7">
        <p className="guide-chip">Step 01</p>
        <h3 className="mt-4 text-xl font-semibold text-[var(--foreground)]">เลือกอุทยาน</h3>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          เลือก destination หลักของทริปก่อน เพื่อให้ข้อมูลเวลาทำการและบริบทของอุทยานเชื่อมกับ trip
          นี้โดยตรง
        </p>
        <div className="mt-5">
          <TripFormField label="อุทยานที่ต้องการเดินทาง" htmlFor="parkId" hint="พิมพ์ค้นหาชื่อหรือจังหวัดเพื่อเลือกอุทยาน">
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
          </TripFormField>
          <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
            รายละเอียดอุทยาน เช่น เวลาเปิด-ปิด และข้อมูลเตือนความปลอดภัยจะอัปเดตตามอุทยานที่เลือกที่นี่
          </p>
        </div>
      </section>

      <section className="soft-card rounded-[34px] px-5 py-6 sm:px-7">
        <p className="guide-chip">Step 02</p>
        <h3 className="mt-4 text-xl font-semibold text-[var(--foreground)]">กำหนดวันและเวลาเดินทาง</h3>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          กำหนดวันเดินทางและเวลาออกเดินทางให้ชัด เพื่อให้ระบบใช้ต่อกับ trip safety score ได้แม่นขึ้น
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <TripFormField label="วันเดินทาง" htmlFor="tripDate">
            <input
              id="tripDate"
              type="date"
              value={formState.tripDate}
              onChange={(event) => updateField("tripDate", event.target.value)}
              className={inputClassName}
            />
            <FormError message={fieldErrors.tripDate} />
          </TripFormField>
          <TripFormField label="เวลาออกเดินทาง" htmlFor="departAt">
            <input
              id="departAt"
              type="time"
              value={formState.departAt}
              onChange={(event) => updateField("departAt", event.target.value)}
              className={inputClassName}
            />
            <FormError message={fieldErrors.departAt} />
          </TripFormField>
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
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    formState.originText === preset.text
                      ? "bg-[var(--brand-strong)] text-white shadow-xs"
                      : "border border-slate-200/80 bg-white/80 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  📍 {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[24px] border border-white/60 bg-white/55 p-4 sm:flex-row sm:items-center sm:justify-between">
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
            className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-white/75 px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-[0_10px_24px_rgba(33,93,82,0.08)]"
          >
            {showAdvanced ? "Hide advanced settings" : "Open advanced settings"}
          </button>
        </div>

        {!showAdvanced ? (
          <div className="mt-4 rounded-[22px] border border-white/60 bg-white/50 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
            Using starter values: clear weather, 120 fallback minutes, and optional sunset/notes fields hidden.
          </div>
        ) : null}

        {showAdvanced ? <div className="mt-5 grid gap-5 rounded-[24px] border border-white/65 bg-white/45 p-4 sm:grid-cols-2 sm:p-5">
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
