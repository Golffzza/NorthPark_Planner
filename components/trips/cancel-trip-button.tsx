"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast } from "@/components/ui/toast";

type CancelTripButtonProps = {
  tripId: string;
  isCancelled?: boolean;
  variant?: "default" | "compact" | "icon" | "full" | "menuItem";
  label?: string;
  parkName?: string;
  onBeforeOpen?: () => void;
};

export function CancelTripButton({
  tripId,
  isCancelled = false,
  variant = "default",
  label,
  parkName,
  onBeforeOpen,
}: CancelTripButtonProps) {
  const router = useRouter();
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isCancelled) {
    return null;
  }

  async function handleConfirmCancel() {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/trips/${tripId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to cancel trip");
      }

      setIsModalOpen(false);
      toast.success("ยกเลิกทริปเรียบร้อยแล้ว");
      router.refresh();
    } catch {
      toast.error("ไม่สามารถยกเลิกทริปได้ในตอนนี้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  }

  const modalElement = (
    <ConfirmModal
      isOpen={isModalOpen}
      onClose={() => {
        if (!isSubmitting) setIsModalOpen(false);
      }}
      onConfirm={handleConfirmCancel}
      isConfirming={isSubmitting}
      title={parkName ? `ต้องการยกเลิกทริปไป "${parkName}"?` : "คุณแน่ใจหรือไม่ที่จะยกเลิกทริปนี้?"}
      description="ทริปนี้จะถูกยกเลิกและไม่สามารถแก้ไขหรือประเมินใหม่ได้ แต่ข้อมูลและผลประเมินเดิมยังอยู่ในประวัติ"
      confirmLabel="ยืนยันการยกเลิก"
      cancelLabel="ยกเลิก"
      icon="trash"
    />
  );

  if (variant === "menuItem") {
    const text = label ?? (isSubmitting ? "กำลังยกเลิก..." : "ยกเลิกทริปนี้");
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBeforeOpen?.();
            setIsModalOpen(true);
          }}
          disabled={isSubmitting}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-bold font-heading text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer text-left disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4 shrink-0" />
          <span className="text-xs font-bold font-heading leading-normal">{text}</span>
        </button>
        {modalElement}
      </>
    );
  }

  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={isSubmitting}
          title="ยกเลิกทริป"
          className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rose-600/80 bg-[#280811] hover:bg-[#3a0c1a] text-white shadow-sm transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
        >
          <Trash2 className="h-4 w-4 transition-transform group-hover:scale-110" />
        </button>
        {modalElement}
      </>
    );
  }

  if (variant === "full") {
    const text = label ?? (isSubmitting ? "กำลังยกเลิก..." : "ยกเลิกทริป");
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={isSubmitting}
          title="ยกเลิกทริป"
          className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full border border-rose-600/40 bg-rose-950/5 px-3 text-xs font-bold font-heading text-rose-700 transition-all hover:bg-rose-500/10 active:scale-[0.98] dark:border-rose-500/60 dark:bg-[#280811] dark:text-rose-200 dark:hover:bg-[#3a0c1a] sm:text-sm whitespace-nowrap disabled:opacity-60 cursor-pointer"
        >
          <Trash2 className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
          <span>{text}</span>
        </button>
        {modalElement}
      </>
    );
  }

  if (variant === "compact") {
    const text = label ?? (isSubmitting ? "กำลังยกเลิก..." : "ยกเลิกทริป");
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={isSubmitting}
          title="ยกเลิกทริป"
          className="group inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-rose-200 bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/50 shadow-2xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer whitespace-nowrap"
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110" />
          <span>{text}</span>
        </button>
        {modalElement}
      </>
    );
  }

  const text = label ?? (isSubmitting ? "กำลังยกเลิก..." : "ยกเลิกทริป");
  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        disabled={isSubmitting}
        title="ยกเลิกทริป"
        className="group inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-full px-4 sm:px-5 text-xs sm:text-sm font-semibold text-rose-200 bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/50 shadow-2xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer whitespace-nowrap"
      >
        <Trash2 className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110" />
        <span>{text}</span>
      </button>
      {modalElement}
    </>
  );
}
