"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EvaluateLiveTripButtonProps = {
  tripId: string;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
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

  throw new Error(payload?.error?.message ?? "ไม่สามารถประมวลผลข้อมูล live สำหรับทริปนี้ได้");
}

export function EvaluateLiveTripButton({ tripId }: EvaluateLiveTripButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleEvaluateLive() {
    setIsSubmitting(true);

    try {
      await runStep(`/api/v1/trips/${tripId}/weather-sync`);
      await runStep(`/api/v1/trips/${tripId}/route-sync`);
      await runStep(`/api/v1/trips/${tripId}/sunset-sync`);
      await runStep(`/api/v1/trips/${tripId}/evaluate-live`);

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
      {isSubmitting ? "กำลัง sync และประเมิน..." : "Sync ข้อมูลจริงและประเมิน"}
    </button>
  );
}
