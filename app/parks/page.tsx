import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ParkCard } from "@/components/parks/park-card";
import { ParkSearchBar } from "@/components/parks/park-search-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { listParkProvinces, listParks } from "@/lib/services/park-service";
import { BadRequestError } from "@/lib/validations/park-query";
import { parseParkListQuery } from "@/lib/validations/park-query";

type ParksPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function buildSearchParams(query: Record<string, string>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value);
    }
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export default async function ParksPage({ searchParams }: ParksPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  const query = (() => {
    try {
      return parseParkListQuery(params);
    } catch (error) {
      if (error instanceof BadRequestError) {
        return {
          q: params.get("q")?.trim() || undefined,
          province: params.get("province")?.trim() || undefined,
          page: 1,
          perPage: 10,
        };
      }

      throw error;
    }
  })();

  const [parkResult, provinces] = await Promise.all([listParks(query), listParkProvinces()]);
  const hasResults = parkResult.data.length > 0;
  const prevPage = query.page > 1 ? query.page - 1 : null;
  const nextPage = query.page < parkResult.meta.totalPages ? query.page + 1 : null;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Park Guide"
          title="สำรวจอุทยานแห่งชาติในภาคเหนือ"
          description="เลือกอุทยานจากภาพ บรรยากาศจังหวัด และข้อมูลสำคัญแบบ travel guide ก่อนพาแผนเดินทางไปต่อใน trip planner"
          actions={
            <div className="dashboard-card rounded-[24px] px-4 py-3 text-sm text-[var(--muted)]">
              พบทั้งหมด <span className="font-semibold text-[var(--foreground)]">{parkResult.meta.total}</span> แห่ง
            </div>
          }
        />

        <ParkSearchBar defaultQuery={query.q} defaultProvince={query.province} provinces={provinces} />

        {hasResults ? (
          <>
            <section className="grid gap-4 md:grid-cols-2">
              {parkResult.data.map((park) => (
                <ParkCard key={park.id} park={park} />
              ))}
            </section>

            <section className="glass-panel flex flex-col gap-4 rounded-[32px] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  หน้า {parkResult.meta.page} จาก {parkResult.meta.totalPages || 1}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  เลื่อนดูอุทยานเพิ่มเติมหรือปรับตัวกรองเพื่อหา destination ที่ตรงกับ mood ของทริปมากขึ้น
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {prevPage ? (
                  <Link
                    href={`/parks${buildSearchParams({
                      ...(query.q ? { q: query.q } : {}),
                      ...(query.province ? { province: query.province } : {}),
                      page: String(prevPage),
                      perPage: String(query.perPage),
                    })}`}
                    className="ghost-button rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--foreground)]"
                  >
                    ก่อนหน้า
                  </Link>
                ) : null}
                {nextPage ? (
                  <Link
                    href={`/parks${buildSearchParams({
                      ...(query.q ? { q: query.q } : {}),
                      ...(query.province ? { province: query.province } : {}),
                      page: String(nextPage),
                      perPage: String(query.perPage),
                    })}`}
                    className="glass-button rounded-full px-4 py-2.5 text-sm font-semibold"
                  >
                    ถัดไป
                  </Link>
                ) : null}
              </div>
            </section>
          </>
        ) : (
          <EmptyState
            title="ยังไม่พบอุทยานที่ตรงกับการค้นหา"
            description="ลองเปลี่ยนคำค้นหา เลือกจังหวัดอื่น หรือรีเซ็ตตัวกรองเพื่อกลับไปดู park guide ทั้งหมด"
            actionLabel="ล้างตัวกรอง"
            actionHref="/parks"
          />
        )}
      </div>
    </AppShell>
  );
}
