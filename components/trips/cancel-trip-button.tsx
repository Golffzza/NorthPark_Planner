"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CancelTripButtonProps = {
  tripId: string;
};

export function CancelTripButton({ tripId }: CancelTripButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCancel() {
    const confirmed = window.confirm("ยืนยันยกเลิกทริปนี้?");

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
      window.alert("ไม่สามารถยกเลิกทริปได้ในตอนนี้");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={isSubmitting}
      className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm font-semibold text-rose-700 disabled:opacity-60"
    >
      {isSubmitting ? "กำลังยกเลิก..." : "ยกเลิกทริป"}
    </button>
  );
}
