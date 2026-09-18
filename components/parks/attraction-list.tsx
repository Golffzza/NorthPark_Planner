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
  return (
    <section className="space-y-4">
      <div>
        <span className="guide-chip">จุดเด่นอุทยาน</span>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          จุดเด่นภายในอุทยาน
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          ใช้เป็น guide list สำหรับเลือกจุดแวะหลัก วางจังหวะการเที่ยว และดูบรรยากาศของอุทยานก่อนเริ่มทริป
        </p>
      </div>
      <div className="grid gap-4">
        {attractions.map((attraction) => {
          const typeInfo = attractionTypeLabels[attraction.type] ?? { label: attraction.type, icon: "🌲" };
          return (
            <article key={attraction.id} className="soft-card overflow-hidden rounded-[32px] transition-shadow duration-300 hover:shadow-lg">
              <div className="grid gap-0 sm:grid-cols-[240px_1fr]">
                <div className="park-media-placeholder relative h-52 sm:h-auto min-h-[12rem] overflow-hidden">
                  {attraction.imageUrl ? (
                    <div
                      className="h-full w-full bg-cover bg-center transition-transform duration-500 hover:scale-105"
                      style={{ backgroundImage: `url(${attraction.imageUrl})` }}
                      role="img"
                      aria-label={attraction.name}
                    />
                  ) : null}
                </div>
                <div className="flex flex-col justify-between px-5 py-5 sm:px-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
                        <span>{typeInfo.icon}</span>
                        <span>{typeInfo.label}</span>
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-[var(--foreground)]">{attraction.name}</h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                      {attraction.description ?? "สถานที่ท่องเที่ยวธรรมชาติภายในอุทยาน"}
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
