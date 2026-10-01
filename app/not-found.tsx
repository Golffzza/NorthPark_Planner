import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center px-4 text-center">
      <div className="soft-card max-w-md w-full p-8 rounded-3xl border border-white/20 shadow-2xl space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 text-3xl">
          🌲
        </div>

        <div className="space-y-2">
          <span className="text-4xl font-extrabold text-emerald-500">404</span>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            ไม่พบหน้าที่คุณต้องการ
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            หน้าที่คุณกำลังค้นหาอาจถูกย้าย ลบ หรือไม่มีอยู่ในระบบ
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/parks"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-95"
          >
            <span>สำรวจอุทยานแห่งชาติ</span>
          </Link>

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
