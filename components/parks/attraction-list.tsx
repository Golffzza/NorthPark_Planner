import type { ParkDetailDto } from "@/lib/mappers/park-dto";

type AttractionListProps = {
  attractions: ParkDetailDto["attractions"];
};

export function AttractionList({ attractions }: AttractionListProps) {
  return (
    <section className="space-y-4">
      <div>
        <span className="guide-chip">Park Highlights</span>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          จุดเด่นภายในอุทยาน
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          ใช้เป็น guide list สำหรับเลือกจุดแวะหลัก วางจังหวะการเที่ยว และดูบรรยากาศของอุทยานก่อนเริ่มทริป
        </p>
      </div>
      <div className="grid gap-4">
        {attractions.map((attraction) => (
          <article key={attraction.id} className="soft-card overflow-hidden rounded-[32px]">
            <div className="grid gap-0 sm:grid-cols-[190px_1fr]">
              <div className="park-media-placeholder relative min-h-[11rem]">
                {attraction.imageUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${attraction.imageUrl})` }}
                    role="img"
                    aria-label={attraction.name}
                  />
                ) : null}
              </div>
              <div className="px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{attraction.name}</h3>
                    <p className="mt-2 inline-flex rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">
                      {attraction.type}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                  {attraction.description ?? "สถานที่ท่องเที่ยวธรรมชาติภายในอุทยาน"}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
