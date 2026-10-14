"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        removeToast(id);
      }, 3500);
    },
    [removeToast],
  );

  const success = useCallback(
    (message: string) => showToast(message, "success"),
    [showToast],
  );

  const error = useCallback(
    (message: string) => showToast(message, "error"),
    [showToast],
  );

  const info = useCallback(
    (message: string) => showToast(message, "info"),
    [showToast],
  );

  const value = useMemo(
    () => ({ showToast, success, error, info }),
    [showToast, success, error, info],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container — Lightweight, top-center, GPU-friendly (no heavy blurs) */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4 sm:top-5"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-2xl border px-3.5 py-3 shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${
              toast.type === "success"
                ? "border-emerald-500/30 bg-[#061d15] text-white"
                : toast.type === "error"
                  ? "border-rose-500/30 bg-[#280811] text-white"
                  : "border-slate-700 bg-[#0e1714] text-white"
            }`}
          >
            {toast.type === "success" && (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            )}
            {toast.type === "error" && (
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
            )}
            {toast.type === "info" && (
              <Info className="h-5 w-5 shrink-0 text-cyan-400" />
            )}

            <p className="flex-1 text-xs sm:text-sm font-medium leading-snug">
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="rounded-lg p-1 text-white/60 hover:text-white transition-colors cursor-pointer"
              aria-label="ปิดการแจ้งเตือน"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if used outside provider (doesn't crash)
    return {
      showToast: (msg: string) => console.log(msg),
      success: (msg: string) => console.log(msg),
      error: (msg: string) => console.error(msg),
      info: (msg: string) => console.log(msg),
    };
  }
  return context;
}
