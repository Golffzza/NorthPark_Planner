"use client";

import { useEffect, type ReactNode } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  icon?: "trash" | "warning";
  children?: ReactNode;
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "ยืนยันการลบ",
  cancelLabel = "ยกเลิก",
  isConfirming = false,
  icon = "trash",
  children,
}: ConfirmModalProps) {
  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isConfirming) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isConfirming, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      {/* Backdrop: simple semi-transparent black without GPU-heavy blur */}
      <div
        className="fixed inset-0 bg-black/65 transition-opacity"
        onClick={() => {
          if (!isConfirming) onClose();
        }}
      />

      {/* Modal content box: iOS bottom-sheet on mobile, centered card on tablet/desktop */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md rounded-t-[28px] sm:rounded-[28px] border border-white/10 bg-[#0c1f19] p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150">
        <div className="flex flex-col items-center text-center">
          {/* Icon Badge */}
          <div className="mb-3.5 flex h-13 w-13 items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/15 text-rose-400">
            {icon === "trash" ? (
              <Trash2 className="h-6 w-6 shrink-0" />
            ) : (
              <AlertTriangle className="h-6 w-6 shrink-0" />
            )}
          </div>

          {/* Title */}
          <h3
            id="confirm-modal-title"
            className="text-base sm:text-lg font-bold font-heading text-white"
          >
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs">
              {description}
            </p>
          )}

          {children}

          {/* Actions: Full touch target (h-11) */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 w-full">
            <button
              type="button"
              onClick={onClose}
              disabled={isConfirming}
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 text-xs sm:text-sm font-semibold text-slate-200 transition-all hover:bg-white/10 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isConfirming}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-rose-600 px-4 text-xs sm:text-sm font-bold font-heading text-white shadow-sm transition-all hover:bg-rose-500 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isConfirming ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>กำลังลบ...</span>
                </span>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
