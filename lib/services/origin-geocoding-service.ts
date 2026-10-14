export type OriginPlace = { id: string; name: string; lat: number; lng: number };

export class OriginGeocodingError extends Error {
  constructor(public readonly code: "invalid_query" | "busy" | "provider_unavailable") {
    super(code);
    this.name = "OriginGeocodingError";
  }
}

const cache = new Map<string, { results: OriginPlace[]; expiresAt: number }>();
let previousRequestStartedAt = 0;
let queue: Promise<void> = Promise.resolve();
let queuedRequests = 0;

async function waitForProviderSlot() {
  if (queuedRequests >= 4) throw new OriginGeocodingError("busy");
  queuedRequests += 1;
  const turn = queue.then(async () => {
    const delay = Math.max(0, 1100 - (Date.now() - previousRequestStartedAt));
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    previousRequestStartedAt = Date.now();
  });
  queue = turn.catch(() => undefined);
  try { await turn; } finally { queuedRequests -= 1; }
}

export async function searchOriginPlaces(rawQuery: string): Promise<OriginPlace[]> {
  const query = rawQuery.trim().replace(/\s+/g, " ");
  if (query.length < 3 || query.length > 120) throw new OriginGeocodingError("invalid_query");

  const cacheKey = query.toLocaleLowerCase("th-TH");
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.results;

  await waitForProviderSlot();
  const url = new URL(process.env.NOMINATIM_SEARCH_URL || "https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "th");
  url.searchParams.set("addressdetails", "0");

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "NorthParkPlanner/1.0 (https://github.com/Golffzza/NorthPark_Planner)",
        "Accept-Language": "th,en;q=0.8",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) throw new OriginGeocodingError("provider_unavailable");
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new OriginGeocodingError("provider_unavailable");
    const results: OriginPlace[] = data.slice(0, 5).flatMap((item: unknown) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      const lat = Number(row.lat);
      const lng = Number(row.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 ||
          typeof row.display_name !== "string" || !row.display_name.trim() ||
          (typeof row.place_id !== "number" && typeof row.place_id !== "string")) return [];
      return [{ id: String(row.place_id), name: row.display_name, lat, lng }];
    });
    if (cache.size >= 250) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey, { results, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    return results;
  } catch (error) {
    if (error instanceof OriginGeocodingError) throw error;
    throw new OriginGeocodingError("provider_unavailable");
  }
}
