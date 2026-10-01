"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error Boundary]:", error);
  }, [error]);

  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center px-4 text-center">
      <div className="soft-card max-w-md w-full p-8 rounded-3xl border border-white/20 shadow-2xl space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 text-3xl">
          ⚠️
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            ขออภัย เกิดข้อผิดพลาดในการโหลดข้อมูล
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ระบบพบปัญหาชั่วคราวขณะประมวลผล กรุณาลองใหม่อีกครั้ง หรือกลับไปหน้าหลัก
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>ลองใหม่อีกครั้ง</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 backdrop-blur-md transition-all active:scale-95"
          >
            <span>กลับหน้าหลัก</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
