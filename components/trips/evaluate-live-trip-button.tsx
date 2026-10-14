"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EvaluateLiveTripButtonProps = {
  tripId: string;
  label?: string;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    missingFields?: string[];
  };
};

const fieldLabels: Record<string, string> = {
  tripDate: "วันเดินทาง", departAt: "เวลาออกเดินทาง", originText: "จุดเริ่มต้น",
  originLat: "พิกัดจุดเริ่มต้น", originLng: "พิกัดจุดเริ่มต้น",
  transportMode: "พาหนะ", travelerCount: "จำนวนผู้เดินทาง",
};

async function runStep(url: string) {
  const response = await fetch(url, {
    method: "POST",
  });

  if (response.ok) {
    return;
  }

  let payload: ApiErrorPayload | undefined;

  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = undefined;
  }

  if (payload?.error?.code === "incomplete_trip_information") {
    const missing = [...new Set((payload.error.missingFields ?? []).map((field) => fieldLabels[field] ?? field))];
    throw new Error(`กรุณาเติมข้อมูลก่อนประเมิน${missing.length ? `: ${missing.join(", ")}` : ""}`);
  }
  if (["weather_sync_unavailable", "route_sync_unavailable", "sunset_sync_unavailable"].includes(payload?.error?.code ?? "")) {
    throw new Error("ยังดึงข้อมูลอากาศ เส้นทาง หรือเวลาพระอาทิตย์ตกจากบริการภายนอกไม่ได้ กรุณาลองใหม่ภายหลัง");
  }
  throw new Error(payload?.error?.message ?? "ไม่สามารถประมวลผลข้อมูล live สำหรับทริปนี้ได้");
}

export function EvaluateLiveTripButton({ tripId, label = "ประเมินใหม่ด้วยข้อมูลล่าสุด" }: EvaluateLiveTripButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleEvaluateLive() {
    setIsSubmitting(true);

    try {
      await runStep(`/api/v1/trips/${tripId}/refresh-evaluation`);

      router.push(`/trips/${tripId}/result`);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "ไม่สามารถประเมินทริปด้วยข้อมูลจริงได้ในขณะนี้");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleEvaluateLive}
      disabled={isSubmitting}
      className="glass-button inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold disabled:opacity-60"
    >
      {isSubmitting ? "กำลังดึงข้อมูลและประเมิน..." : label}
    </button>
  );
}
