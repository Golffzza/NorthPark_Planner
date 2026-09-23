import type { ParkDetailDto } from "@/lib/mappers/park-dto";

type AttractionListProps = {
  attractions: ParkDetailDto["attractions"];
};

const attractionTypeLabels: Record<string, { label: string; icon: string }> = {
  VIEWPOINT: { label: "จุดชมวิว", icon: "🏔️" },
  WATERFALL: { label: "น้ำตก", icon: "💦" },
  TRAIL: { label: "เส้นทางเดินป่า", icon: "🥾" },
  CAMPSITE: { label: "ลานกางเต็นท์", icon: "⛺" },
  OTHER: { label: "ธรรมชาติและไฮไลท์", icon: "🌲" },
};

export function AttractionList({ attractions }: AttractionListProps) {
  if (attractions.length === 0) {
    return (
      <section className="glass-panel space-y-3 rounded-[30px] p-6 border border-slate-200/80 dark:border-emerald-800/40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 text-base">
            ✨
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            จุดเด่นภายในอุทยาน
          </h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-emerald-200/70">
          ยังไม่มีข้อมูลจุดเด่นที่บันทึกไว้สำหรับอุทยานนี้
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 text-sm sm:text-base shadow-2xs">
            ✨
          </span>
          <h2 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            จุดเด่นภายในอุทยาน
          </h2>
        </div>
        <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-full bg-slate-100/90 dark:bg-emerald-950/60 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-emerald-300 border border-slate-200/80 dark:border-emerald-800/40 shadow-2xs">
          <span>🏔️</span>
          <span>{attractions.length} จุดไฮไลท์</span>
        </span>
      </div>

      <div className="grid gap-3.5 sm:gap-4">
        {attractions.map((attraction) => {
          const typeInfo = attractionTypeLabels[attraction.type] ?? { label: attraction.type, icon: "🌲" };
          return (
            <article
              key={attraction.id}
              className="glass-panel group overflow-hidden rounded-[26px] sm:rounded-[28px] border border-slate-200/80 dark:border-emerald-800/40 bg-white/90 dark:bg-[#0b1e17]/85 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-500/30"
            >
              <div className="grid gap-0 sm:grid-cols-[220px_1fr]">
                <div className="relative h-48 sm:h-auto min-h-[11rem] overflow-hidden bg-slate-100 dark:bg-emerald-950/40">
                  {attraction.imageUrl ? (
                    <div
                      className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url(${attraction.imageUrl})` }}
                      role="img"
                      aria-label={attraction.name}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl opacity-40">
                      {typeInfo.icon}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent sm:hidden" />
                </div>
                <div className="flex flex-col justify-between p-4.5 sm:p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 dark:bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                        <span>{typeInfo.icon}</span>
                        <span>{typeInfo.label}</span>
                      </span>
                    </div>
                    <h3 className="mt-2 text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                      {attraction.name}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-emerald-200/80 line-clamp-3 sm:line-clamp-4">
                      {attraction.description ?? "สถานที่ท่องเที่ยวธรรมชาติและจุดเช็กอินภายในอุทยาน"}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
