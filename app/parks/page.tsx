import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ParkCard } from "@/components/parks/park-card";
import { ParkPagination } from "@/components/parks/park-pagination";
import { ParkSearchBar } from "@/components/parks/park-search-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { getSuggestedOrPopularParks, listParkProvinces, listParks } from "@/lib/services/park-service";
import { BadRequestError } from "@/lib/validations/park-query";
import { parseParkListQuery } from "@/lib/validations/park-query";

type ParksPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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
  const suggestions = !hasResults ? await getSuggestedOrPopularParks(query) : null;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          compact
          eyebrow="คู่มือท่องเที่ยว"
          title="อุทยานแห่งชาติภาคเหนือ"
          description="เลือกดูอุทยาน เช็กจุดไฮไลท์ แล้วเริ่มวางแผนทริปได้ทันที"
          actions={
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-900/40 px-3 py-1.5 border border-emerald-500/20 text-xs font-semibold text-slate-700 dark:text-emerald-200">
              <span>🌲</span>
              <span>
                ทั้งหมด{" "}
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {parkResult.meta.total}
                </strong>{" "}
                แห่ง
              </span>
            </div>
          }
        />

        <ParkSearchBar defaultQuery={query.q} defaultProvince={query.province} provinces={provinces} />

        <div id="park-results" className="scroll-mt-24 space-y-4">
          {hasResults ? (
            <>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-700 dark:text-emerald-200">
                    {query.q || query.province ? (
                      <>
                        ผลการค้นหา{" "}
                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                          ({parkResult.meta.total} แห่ง)
                        </span>
                      </>
                    ) : (
                      <>
                        รายชื่ออุทยานทั้งหมด{" "}
                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                          ({parkResult.meta.total} แห่ง)
                        </span>
                      </>
                    )}
                  </h3>
                </div>
                {(query.q || query.province) ? (
                  <span className="text-xs text-slate-500 dark:text-emerald-300/70 font-medium">
                    {query.q ? `คำค้น "${query.q}"` : ""}
                    {query.q && query.province ? " • " : ""}
                    {query.province ? `จ.${query.province}` : ""}
                  </span>
                ) : null}
              </div>

              <section className="grid gap-4 md:grid-cols-2">
                {parkResult.data.map((park) => (
                  <ParkCard key={park.id} park={park} />
                ))}
              </section>

              <ParkPagination
                currentPage={parkResult.meta.page}
                totalPages={parkResult.meta.totalPages}
                totalItems={parkResult.meta.total}
                query={query}
              />
            </>
          ) : (
            <div className="space-y-6">
              <EmptyState
                title={
                  query.q
                    ? `ไม่พบอุทยานที่ตรงกับ "${query.q}"`
                    : "ยังไม่พบอุทยานที่ตรงกับตัวกรอง"
                }
                description={
                  query.q
                    ? "ลองตรวจสอบตัวสะกด หรือเลือกดูอุทยานแนะนำด้านล่างนี้ที่อาจตรงกับสถานที่ที่คุณต้องการ"
                    : "ลองเปลี่ยนการเลือกจังหวัด หรือล้างตัวกรองเพื่อกลับไปดูอุทยานภาคเหนือทั้งหมด"
                }
                actionLabel="ล้างตัวกรองและดูทั้งหมด"
                actionHref="/parks"
              />

              {suggestions && suggestions.parks.length > 0 ? (
                <section className="space-y-4 pt-2">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-600/20 dark:ring-emerald-400/30">
                        <span>{suggestions.type === "didYouMean" ? "💡" : "🌟"}</span>
                        <span>
                          {suggestions.type === "didYouMean"
                            ? `หรือคุณกำลังมองหา "${suggestions.matchedKeyword}"?`
                            : "อุทยานยอดนิยมแนะนำสำหรับคุณ"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-emerald-200/70 font-normal">
                        {suggestions.type === "didYouMean"
                          ? `พบอุทยานที่มีสถานที่หรือคำค้นใกล้เคียงกับที่คุณกำลังค้นหา`
                          : `สำรวจอุทยานไฮไลท์ภาคเหนือที่มีสถานที่ท่องเที่ยวและธรรมชาติยอดนิยม`}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {suggestions.parks.map((park) => (
                      <ParkCard key={park.id} park={park} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
