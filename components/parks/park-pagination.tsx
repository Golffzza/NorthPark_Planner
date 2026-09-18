import Link from "next/link";

type ParkPaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  query: {
    q?: string;
    province?: string;
    perPage?: number;
  };
};

function buildUrl(page: number, query: ParkPaginationProps["query"]) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.province) params.set("province", query.province);
  if (page > 1) params.set("page", String(page));
  if (query.perPage && query.perPage !== 6) params.set("perPage", String(query.perPage));

  const qs = params.toString();
  return `/parks${qs ? `?${qs}` : ""}`;
}

export function ParkPagination({
  currentPage,
  totalPages,
  query,
}: ParkPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  // Generate page numbers to show (e.g. [1, 2, 3, 4, 5])
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="sticky bottom-20 sm:bottom-6 z-30 mt-8 flex justify-center px-3 pointer-events-none">
      <nav
        aria-label="การแบ่งหน้าอุทยาน"
        className="pointer-events-auto glass-tabbar flex items-center gap-1 sm:gap-1.5 rounded-full p-1.5 sm:p-2 shadow-2xl shadow-emerald-950/20 dark:shadow-black/70 ring-1 ring-emerald-900/10 dark:ring-white/10 transition-all duration-300 max-w-full"
      >
        {/* Previous Button */}
        {prevPage ? (
          <Link
            href={buildUrl(prevPage, query)}
            scroll={false}
            className="inline-flex h-8 w-8 sm:h-9 sm:w-auto items-center justify-center gap-1 rounded-full bg-white/70 hover:bg-white dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 px-2 sm:px-3.5 text-xs sm:text-sm font-semibold text-[var(--foreground)] border border-emerald-800/15 dark:border-emerald-600/30 transition-all duration-200 active:scale-95 shadow-2xs"
            aria-label="ไปหน้าก่อนหน้า"
          >
            <svg
              className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">ก่อนหน้า</span>
          </Link>
        ) : (
          <span
            className="inline-flex h-8 w-8 sm:h-9 sm:w-auto items-center justify-center gap-1 rounded-full px-2 sm:px-3.5 text-xs sm:text-sm font-medium text-[var(--muted)] opacity-30 cursor-not-allowed select-none"
            aria-disabled="true"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">ก่อนหน้า</span>
          </span>
        )}

        {/* Page Number Pills */}
        <div className="flex items-center gap-1 px-1">
          {pageNumbers.map((p, idx) => {
            if (p === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-xs text-[var(--muted)] opacity-60 select-none font-bold"
                >
                  •••
                </span>
              );
            }

            const isActive = p === currentPage;

            return (
              <Link
                key={p}
                href={buildUrl(p, query)}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-all duration-200 active:scale-90 ${
                  isActive
                    ? "bg-gradient-to-b from-[var(--brand)] to-[var(--brand-strong)] dark:from-emerald-500 dark:to-teal-600 text-white shadow-md shadow-emerald-950/40 scale-105"
                    : "text-[var(--foreground)] hover:bg-emerald-500/15 dark:hover:bg-emerald-400/15 hover:text-[var(--brand-strong)] dark:hover:text-emerald-300"
                }`}
              >
                {p}
              </Link>
            );
          })}
        </div>

        {/* Next Button */}
        {nextPage ? (
          <Link
            href={buildUrl(nextPage, query)}
            scroll={false}
            className="inline-flex h-8 w-8 sm:h-9 sm:w-auto items-center justify-center gap-1 rounded-full bg-gradient-to-b from-[var(--brand)] to-[var(--brand-strong)] dark:from-emerald-500 dark:to-teal-600 hover:opacity-95 px-2 sm:px-3.5 text-xs sm:text-sm font-bold text-white transition-all duration-200 active:scale-95 shadow-md shadow-emerald-950/30 dark:shadow-emerald-950/60"
            aria-label="ไปหน้าถัดไป"
          >
            <span className="hidden sm:inline">ถัดไป</span>
            <svg
              className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <span
            className="inline-flex h-8 w-8 sm:h-9 sm:w-auto items-center justify-center gap-1 rounded-full px-2 sm:px-3.5 text-xs sm:text-sm font-medium text-[var(--muted)] opacity-30 cursor-not-allowed select-none"
            aria-disabled="true"
          >
            <span className="hidden sm:inline">ถัดไป</span>
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </nav>
    </div>
  );
}
