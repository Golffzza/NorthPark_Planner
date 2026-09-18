"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CancelTripButtonProps = {
  tripId: string;
  isCancelled?: boolean;
  variant?: "default" | "compact";
};

export function CancelTripButton({
  tripId,
  isCancelled = false,
  variant = "default",
}: CancelTripButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isCancelled) {
    return null;
  }

  async function handleCancel() {
    const confirmed = window.confirm("คุณต้องการยกเลิกทริปนี้ใช่หรือไม่?");

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/trips/${tripId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to cancel trip");
      }

      router.refresh();
    } catch {
      window.alert("ไม่สามารถยกเลิกทริปได้ในตอนนี้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isCompact = variant === "compact";

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={isSubmitting}
      title="ยกเลิกทริปนี้"
      className={`group inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/40 font-semibold text-rose-700 dark:text-rose-300 shadow-2xs transition-all hover:bg-rose-100 dark:hover:bg-rose-900/50 active:scale-95 disabled:opacity-60 cursor-pointer ${
        isCompact
          ? "px-3 py-2 text-xs"
          : "px-4 py-3 text-sm"
      }`}
    >
      <svg
        className={`shrink-0 transition-transform group-hover:scale-110 ${isCompact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
        />
      </svg>
      <span>{isSubmitting ? "กำลังยกเลิก..." : "ยกเลิกทริป"}</span>
    </button>
  );
}
