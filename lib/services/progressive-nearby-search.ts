import type { NearbyCategory, NearbyPlace, NearbySearchResult } from "@/lib/services/nearby-places-service";
import { searchNearbyPlacesForPark } from "@/lib/services/nearby-places-service";

const RADII = [3000, 5000, 20000] as const;
const TARGET_PER_CATEGORY = 3;

type Search = typeof searchNearbyPlacesForPark;
type Options = { categories: NearbyCategory[]; radiusMeters: number; limit: number };

/**
 * Expand only categories that still have fewer than three distinct OSM places.
 * An explicit 20 km request searches 20 km directly. Do not treat upstream errors
 * as empty coverage and never discard verified places when a later round fails.
 */
export async function searchNearbyPlacesProgressivelyForPark(
  parkSlug: string,
  options: Options,
  signal?: AbortSignal,
  search: Search = searchNearbyPlacesForPark,
) {
  const categories = [...new Set(options.categories)];
  const startRadius = options.radiusMeters;
  const radii = startRadius >= 20000 ? [startRadius]
    : [...new Set([startRadius, ...RADII.filter((radius) => radius > startRadius)])];
  const found = new Map<NearbyCategory, Map<string, NearbyPlace>>(
    categories.map((category) => [category, new Map<string, NearbyPlace>()]),
  );
  const completedRadii: number[] = [];
  let finalResult: Awaited<ReturnType<Search>> | undefined;
  let lastSuccess: NearbySearchResult | undefined;
  let failedStatus: string | undefined;

  for (const radiusMeters of radii) {
    const missing = categories.filter((category) => (found.get(category)?.size ?? 0) < TARGET_PER_CATEGORY);
    if (!missing.length) break;
    const result = await search(parkSlug, {
      categories: missing,
      radiusMeters,
      limit: 20,
    }, {}, signal);
    finalResult = result;
    if (result.status !== "OK" && result.status !== "EMPTY") {
      failedStatus = result.status;
      break;
    }
    // Without verified search-scope metadata, do not claim a wider search.
    if (!("meta" in result) || !result.meta) return result;
    completedRadii.push(radiusMeters);
    lastSuccess = result as NearbySearchResult;
    for (const place of result.places) {
      const bucket = found.get(place.category);
      if (bucket) bucket.set(`${place.osmType}:${place.osmId}`, place);
    }
  }

  const places = [...found.values()].flatMap((bucket) => [...bucket.values()])
    .sort((a, b) => a.straightLineDistanceMeters - b.straightLineDistanceMeters)
    .slice(0, options.limit);
  if (!lastSuccess) return finalResult!;
  const radiusMeters = completedRadii.at(-1) ?? startRadius;
  return {
    ...lastSuccess,
    status: places.length ? "OK" as const : "EMPTY" as const,
    places,
    meta: {
      ...lastSuccess.meta,
      radiusMeters,
      categories,
      limit: options.limit,
      searchedRadiiMeters: completedRadii,
      ...(failedStatus ? { expansionInterruptedBy: failedStatus } : {}),
      coverageNote: `${lastSuccess.meta.coverageNote} ค้นขยายตามหมวดสูงสุด ${radiusMeters.toLocaleString("en-US")} เมตร; ผลเป็นระยะเส้นตรงจากพิกัดอุทยาน ไม่ใช่ระยะขับรถ`,
    },
  };
}
