"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CancelTripButtonProps = {
  tripId: string;
  isCancelled?: boolean;
  variant?: "default" | "compact" | "icon" | "full";
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
    const confirmed = window.confirm("คุณต้องการลบแผนที่/ยกเลิกทริปนี้ใช่หรือไม่?");

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
      window.alert("ไม่สามารถลบแผนที่ได้ในตอนนี้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleCancel}
        disabled={isSubmitting}
        title="ลบแผนที่"
        className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rose-600/80 bg-[#280811] hover:bg-[#3a0c1a] text-white shadow-sm transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
      >
        <svg
          className="h-4 w-4 transition-transform group-hover:scale-110"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <line x1="10" x2="10" y1="11" y2="17" />
          <line x1="14" x2="14" y1="11" y2="17" />
        </svg>
      </button>
    );
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleCancel}
        disabled={isSubmitting}
        title="ลบแผนที่"
        className="w-full h-11 px-3 inline-flex items-center justify-center gap-2 rounded-full border border-rose-600/80 bg-[#280811] hover:bg-[#3a0c1a] font-heading font-bold text-xs sm:text-sm text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer whitespace-nowrap"
      >
        <svg
          className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <line x1="10" x2="10" y1="11" y2="17" />
          <line x1="14" x2="14" y1="11" y2="17" />
        </svg>
        <span>{isSubmitting ? "กำลังลบ..." : "ลบแผนที่"}</span>
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleCancel}
        disabled={isSubmitting}
        title="ลบแผนที่"
        className="group inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-rose-200 bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/50 shadow-2xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer whitespace-nowrap"
      >
        <svg
          className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <line x1="10" x2="10" y1="11" y2="17" />
          <line x1="14" x2="14" y1="11" y2="17" />
        </svg>
        <span>{isSubmitting ? "กำลังลบ..." : "ลบแผนที่"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={isSubmitting}
      title="ลบแผนที่"
      className="group inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full px-4 sm:px-5 text-xs sm:text-sm font-semibold text-rose-200 bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/50 shadow-2xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer whitespace-nowrap"
    >
      <svg
        className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        <line x1="10" x2="10" y1="11" y2="17" />
        <line x1="14" x2="14" y1="11" y2="17" />
      </svg>
      <span>{isSubmitting ? "กำลังลบ..." : "ลบแผนที่"}</span>
    </button>
  );
}
