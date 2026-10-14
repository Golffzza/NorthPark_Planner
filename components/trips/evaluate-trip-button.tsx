"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";

type EvaluateTripButtonProps = {
  tripId: string;
};

export function EvaluateTripButton({ tripId }: EvaluateTripButtonProps) {
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleEvaluate() {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/trips/${tripId}/evaluate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to evaluate trip");
      }

      router.push(`/trips/${tripId}/result`);
      router.refresh();
    } catch {
      toast.error("ไม่สามารถประเมินทริปด้วยค่าเริ่มต้นที่บันทึกไว้ได้ในขณะนี้");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleEvaluate}
      disabled={isSubmitting}
      className="ghost-button inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold disabled:opacity-60"
    >
      {isSubmitting ? "กำลังประเมิน..." : "ประเมินจากค่าที่บันทึกไว้"}
    </button>
  );
}
