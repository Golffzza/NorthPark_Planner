import { z } from "zod";

import { getParkDetail, NotFoundError } from "@/lib/services/park-service";
import { nearbyPlacesRoutingService } from "@/lib/services/nearby-places-routing-service";

// Global OSM coverage; regional Overpass instances can return false EMPTY results for Thailand.
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OVERPASS_FALLBACK_URL = "https://overpass.private.coffee/api/interpreter";
const COORDINATE_REVIEW_SLUGS = new Set([
  "namtok-pha-charoen", "nanthaburi", "ramkhamhaeng", "si-satchanalai",
]);
const CACHE_TTL_MS = 10 * 60 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000;
const QUERY_TIMEOUT_SECONDS = 10;
const PRIMARY_TIMEOUT_MS = 13_000;
const FALLBACK_TIMEOUT_MS = 6_000;
const MAX_RESPONSE_BYTES = 2_000_000;

export const nearbyCategorySchema = z.enum([
  "food", "accommodation", "campsite", "attraction", "service",
]);
export type NearbyCategory = z.infer<typeof nearbyCategorySchema>;

export const nearbySearchSchema = z.object({
  categories: z.array(nearbyCategorySchema).min(1).max(5),
  radiusMeters: z.number().int().min(500).max(20000).default(3000),
  limit: z.number().int().min(1).max(20).default(10),
}).strict();
export type NearbySearchOptions = z.input<typeof nearbySearchSchema>;

type Coordinates = { lat: number; lng: number };
type OsmElement = {
  type?: unknown;
  id?: unknown;
  lat?: unknown;
  lon?: unknown;
  center?: { lat?: unknown; lon?: unknown };
  tags?: Record<string, unknown>;
};

export type NearbyPlace = {
  id: string;
  osmType: "node" | "way" | "relation";
  osmId: number;
  osmUrl: string;
  name: string;
  category: NearbyCategory;
  lat: number;
  lng: number;
  straightLineDistanceMeters: number;
  roadDistanceMeters?: number;
  estimatedDrivingMinutes?: number;
  routeStatus?: "OK" | "NO_ROUTE" | "UNSUPPORTED" | "UNAVAILABLE";
  source: "OPENSTREETMAP";
  openingHours?: string;
  phone?: string;
  website?: string;
};

type SearchStatus = "OK" | "EMPTY" | "UPSTREAM_TIMEOUT" | "UPSTREAM_RATE_LIMITED" | "UPSTREAM_UNAVAILABLE";
export type NearbySearchResult = {
  status: SearchStatus;
  places: NearbyPlace[];
  meta: {
    center: Coordinates;
    radiusMeters: number;
    categories: NearbyCategory[];
    limit: number;
    searchScope: "AROUND_PARK_COORDINATE";
    distanceMethod: "STRAIGHT_LINE";
    source: "OPENSTREETMAP_OVERPASS" | "GEOAPIFY_PLACES";
    coverageNote: string;
    cached: boolean;
  };
};

type OsmTagKey = "amenity" | "tourism" | "natural" | "historic" | "shop";
const TAG_VALUES: Record<NearbyCategory, Partial<Record<OsmTagKey, readonly string[]>>> = {
  food: { amenity: ["restaurant", "cafe", "fast_food", "food_court"] },
  accommodation: { tourism: ["hotel", "guest_house", "motel", "hostel", "chalet", "resort"] },
  campsite: { tourism: ["camp_site", "caravan_site"] },
  attraction: {
    tourism: ["attraction", "viewpoint", "museum", "picnic_site"],
    natural: ["waterfall"], historic: ["ruins", "monument", "memorial", "archaeological_site"],
  },
  service: { shop: ["convenience"], amenity: ["fuel"] },
};

// Geoapify Places categories: https://apidocs.geoapify.com/docs/places/
// Keep these narrow enough to match the existing Nearby categories.
const GEOAPIFY_CATEGORIES: Record<NearbyCategory, readonly string[]> = {
  food: ["catering.restaurant", "catering.cafe", "catering.fast_food", "catering.food_court"],
  accommodation: ["accommodation.hotel", "accommodation.guest_house", "accommodation.motel", "accommodation.hostel", "accommodation.chalet"],
  campsite: ["camping.camp_site", "camping.caravan_site"],
  attraction: ["tourism.attraction", "entertainment.museum", "leisure.picnic.picnic_site", "tourism.sights.archaeological_site", "tourism.sights.ruines", "tourism.sights.memorial"],
  service: ["commercial.convenience", "service.vehicle.fuel"],
};

export function getGeoapifyCategories(categories: readonly NearbyCategory[]): string[] {
  return [...new Set(categories.flatMap((category) => GEOAPIFY_CATEGORIES[category]))];
}

function validCoordinates({ lat, lng }: Coordinates): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function categoryOf(tags: Record<string, unknown>): NearbyCategory | undefined {
  if (["restaurant", "cafe", "fast_food", "food_court"].includes(String(tags.amenity))) return "food";
  if (["hotel", "guest_house", "motel", "hostel", "chalet", "resort"].includes(String(tags.tourism))) return "accommodation";
  if (["camp_site", "caravan_site"].includes(String(tags.tourism))) return "campsite";
  if (["attraction", "viewpoint", "museum", "picnic_site"].includes(String(tags.tourism)) || tags.natural === "waterfall" || ["ruins", "monument", "memorial", "archaeological_site"].includes(String(tags.historic))) return "attraction";
  if (tags.shop === "convenience" || tags.amenity === "fuel") return "service";
  return undefined;
}

function tagText(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : undefined;
}

function websiteTag(value: unknown): string | undefined {
  const candidate = tagText(value, 300);
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function straightLineMeters(a: Coordinates, b: Coordinates): number {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLng = (b.lng - a.lng) * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLng / 2) ** 2;
  return Math.round(6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

export function normalizeOverpassPlaces(
  elements: unknown,
  center: Coordinates,
  categories: readonly NearbyCategory[],
  radiusMeters: number,
  limit: number,
): NearbyPlace[] {
  if (!Array.isArray(elements)) return [];
  const byId = new Map<string, NearbyPlace>();
  for (const raw of elements as OsmElement[]) {
    if (!raw || !["node", "way", "relation"].includes(String(raw.type)) || !Number.isSafeInteger(raw.id) || Number(raw.id) <= 0) continue;
    const tags = raw.tags && typeof raw.tags === "object" && !Array.isArray(raw.tags) ? raw.tags : {};
    const name = tagText(tags.name, 160) ?? tagText(tags["name:th"], 160) ?? tagText(tags["name:en"], 160);
    const category = categoryOf(tags);
    if (!name || !category || !categories.includes(category)) continue;
    const rawLat = raw.type === "node" ? raw.lat : raw.center?.lat;
    const rawLng = raw.type === "node" ? raw.lon : raw.center?.lon;
    if (typeof rawLat !== "number" || typeof rawLng !== "number") continue;
    const lat = rawLat;
    const lng = rawLng;
    if (!validCoordinates({ lat, lng })) continue;
    const distance = straightLineMeters(center, { lat, lng });
    if (distance > radiusMeters) continue;
    const osmType = raw.type as NearbyPlace["osmType"];
    const osmId = raw.id as number;
    const id = `osm:${osmType}:${osmId}`;
    if (byId.has(id)) continue;
    byId.set(id, {
      id, osmType, osmId, osmUrl: `https://www.openstreetmap.org/${osmType}/${osmId}`, name, category, lat, lng,
      straightLineDistanceMeters: distance, source: "OPENSTREETMAP",
      ...(tagText(tags.opening_hours, 160) ? { openingHours: tagText(tags.opening_hours, 160) } : {}),
      ...(tagText(tags.phone, 80) ? { phone: tagText(tags.phone, 80) } : {}),
      ...(websiteTag(tags.website) ? { website: websiteTag(tags.website) } : {}),
    });
  }
  return [...byId.values()]
    .sort((a, b) => a.straightLineDistanceMeters - b.straightLineDistanceMeters || a.id.localeCompare(b.id))
    .slice(0, limit);
}

type GeoapifyFeature = {
  type?: unknown;
  properties?: unknown;
  geometry?: { type?: unknown; coordinates?: unknown };
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function geoapifyCategory(values: unknown): NearbyCategory | undefined {
  if (!Array.isArray(values)) return undefined;
  const categories = values.filter((value): value is string => typeof value === "string");
  for (const category of ["campsite", "accommodation", "food", "attraction", "service"] as const) {
    if (GEOAPIFY_CATEGORIES[category].some((key) =>
      categories.some((value) => value === key || value.startsWith(`${key}.`)))) {
      return category;
    }
  }
  return undefined;
}

/** Only OSM-backed Geoapify features can satisfy the existing OSM reference contract. */
export function normalizeGeoapifyPlaces(
  features: unknown,
  center: Coordinates,
  categories: readonly NearbyCategory[],
  radiusMeters: number,
  limit: number,
): NearbyPlace[] {
  if (!Array.isArray(features)) return [];
  const byId = new Map<string, NearbyPlace>();
  for (const feature of features as GeoapifyFeature[]) {
    if (!feature || feature.type !== "Feature") continue;
    const properties = record(feature.properties);
    const raw = record(record(properties.datasource).raw);
    const osmType = { n: "node", w: "way", r: "relation" }[String(raw.osm_type)] as NearbyPlace["osmType"] | undefined;
    const osmId = raw.osm_id;
    if (!osmType || !Number.isSafeInteger(osmId) || Number(osmId) <= 0) continue;
    const name = tagText(properties.name, 160) ?? tagText(raw["name:th"], 160)
      ?? tagText(raw.name, 160) ?? tagText(raw["name:en"], 160);
    const category = geoapifyCategory(properties.categories);
    if (!name || !category || !categories.includes(category)) continue;
    const point = feature.geometry?.type === "Point" && Array.isArray(feature.geometry.coordinates)
      ? feature.geometry.coordinates : undefined;
    const lat = typeof properties.lat === "number" ? properties.lat : point?.[1];
    const lng = typeof properties.lon === "number" ? properties.lon : point?.[0];
    if (typeof lat !== "number" || typeof lng !== "number" || !validCoordinates({ lat, lng })) continue;
    const distance = straightLineMeters(center, { lat, lng });
    if (distance > radiusMeters) continue;
    const id = `osm:${osmType}:${osmId}`;
    if (byId.has(id)) continue;
    const openingHours = tagText(properties.opening_hours, 160) ?? tagText(raw.opening_hours, 160);
    const phone = tagText(properties.phone, 80) ?? tagText(raw.phone, 80);
    const website = websiteTag(properties.website) ?? websiteTag(raw.website);
    byId.set(id, {
      id, osmType, osmId: osmId as number,
      osmUrl: `https://www.openstreetmap.org/${osmType}/${osmId}`,
      name, category, lat, lng, straightLineDistanceMeters: distance, source: "OPENSTREETMAP",
      ...(openingHours ? { openingHours } : {}),
      ...(phone ? { phone } : {}),
      ...(website ? { website } : {}),
    });
  }
  return [...byId.values()]
    .sort((a, b) => a.straightLineDistanceMeters - b.straightLineDistanceMeters || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function buildQuery(center: Coordinates, categories: NearbyCategory[], radiusMeters: number): string {
  // A bounding box uses OSM's spatial index; exact circle filtering happens after retrieval.
  const latitudeOffset = radiusMeters / 6_371_000 * 180 / Math.PI * 1.01;
  const longitudeOffset = latitudeOffset / Math.max(Math.cos(center.lat * Math.PI / 180), 0.01);
  const bbox = [
    Math.max(-90, center.lat - latitudeOffset),
    Math.max(-180, center.lng - longitudeOffset),
    Math.min(90, center.lat + latitudeOffset),
    Math.min(180, center.lng + longitudeOffset),
  ].map((coordinate) => coordinate.toFixed(6)).join(",");
  const valuesByKey = new Map<OsmTagKey, Set<string>>();
  for (const category of categories) {
    for (const [key, values] of Object.entries(TAG_VALUES[category]) as [OsmTagKey, readonly string[]][]) {
      const combined = valuesByKey.get(key) ?? new Set<string>();
      values.forEach((value) => combined.add(value));
      valuesByKey.set(key, combined);
    }
  }
  const clauses = [...valuesByKey].map(([key, values]) =>
    `nwr["${key}"~"^(${[...values].join("|")})$"]["name"];`,
  );
  return `[out:json][timeout:${QUERY_TIMEOUT_SECONDS}][bbox:${bbox}];(${clauses.join("")});out center 1000;`;
}

type SearchInput = NearbySearchOptions & { coordinates: Coordinates; signal?: AbortSignal };
type ServiceDependencies = { fetcher?: typeof fetch; now?: () => number; endpoints?: readonly string[] };

export function createNearbyPlacesService(dependencies: ServiceDependencies = {}) {
  const fetcher = dependencies.fetcher ?? fetch;
  const now = dependencies.now ?? Date.now;
  const endpoints = dependencies.endpoints ?? [OVERPASS_URL, OVERPASS_FALLBACK_URL];
  const cache = new Map<string, { expiresAt: number; result: NearbySearchResult }>();
  const pending = new Map<string, Promise<NearbySearchResult>>();
  let rateLimitedUntil = 0;
  let providerQueue: Promise<void> = Promise.resolve();

  async function withProviderSlot<T>(work: () => Promise<T>): Promise<T> {
    const previous = providerQueue;
    let release!: () => void;
    providerQueue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await work(); } finally { release(); }
  }

  async function search(input: SearchInput): Promise<NearbySearchResult> {
    const options = nearbySearchSchema.parse({
      categories: input.categories,
      radiusMeters: input.radiusMeters,
      limit: input.limit,
    });
    if (!validCoordinates(input.coordinates)) throw new Error("INVALID_COORDINATES");
    const categories = [...new Set(options.categories)].sort() as NearbyCategory[];
    const meta: NearbySearchResult["meta"] = {
      center: input.coordinates, radiusMeters: options.radiusMeters, categories,
      limit: options.limit, searchScope: "AROUND_PARK_COORDINATE", distanceMethod: "STRAIGHT_LINE",
      source: "OPENSTREETMAP_OVERPASS",
      coverageNote: "ผลจาก OSM รอบพิกัดอุทยาน อาจมีสถานที่ภายในเขตอุทยานและอาจไม่ครอบคลุมทุกแห่ง; ระยะทางเป็นเส้นตรง ไม่ใช่ระยะทางถนน",
      cached: false,
    };
    const result = (status: SearchStatus, places: NearbyPlace[] = []): NearbySearchResult => ({ status, places, meta });
    const present = (value: NearbySearchResult, cached: boolean): NearbySearchResult => ({
      ...value,
      places: value.places.slice(0, options.limit),
      meta: { ...value.meta, limit: options.limit, cached },
    });
    const key = JSON.stringify([input.coordinates.lat, input.coordinates.lng, categories, options.radiusMeters]);
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now()) return present(hit.result, true);
    if (rateLimitedUntil > now()) return result("UPSTREAM_RATE_LIMITED");
    const existing = pending.get(key);
    if (existing) return present(await existing, false);
    const task = withProviderSlot(async () => {
      if (rateLimitedUntil > now()) return result("UPSTREAM_RATE_LIMITED");
      const query = buildQuery(input.coordinates, categories, options.radiusMeters);
      let lastFailure: SearchStatus = "UPSTREAM_UNAVAILABLE";
      let sawTimeout = false;
      for (const [index, endpoint] of endpoints.entries()) {
        if (input.signal?.aborted) return result("UPSTREAM_TIMEOUT");
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), index === 0 ? PRIMARY_TIMEOUT_MS : FALLBACK_TIMEOUT_MS);
        const onAbort = () => controller.abort();
        input.signal?.addEventListener("abort", onAbort, { once: true });
        try {
          const response = await fetcher(endpoint, {
            method: "POST", redirect: "error", cache: "no-store", signal: controller.signal,
            headers: {
              "content-type": "application/x-www-form-urlencoded",
              accept: "application/json",
              "user-agent": "NorthPark_Planner/1.0 (+https://github.com/Golffzza/NorthPark_Planner)",
            },
            body: new URLSearchParams({ data: query }).toString(),
          });
          if (response.status === 429 || response.status === 406) {
            rateLimitedUntil = now() + RATE_LIMIT_COOLDOWN_MS;
            return result("UPSTREAM_RATE_LIMITED");
          }
          if (response.status === 408 || response.status === 504) {
            lastFailure = "UPSTREAM_TIMEOUT";
            sawTimeout = true;
            continue;
          }
          if (!response.ok || Number(response.headers.get("content-length")) > MAX_RESPONSE_BYTES) {
            lastFailure = "UPSTREAM_UNAVAILABLE";
            continue;
          }
          const body = await response.text();
          if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) {
            lastFailure = "UPSTREAM_UNAVAILABLE";
            continue;
          }
          const data = JSON.parse(body) as { elements?: unknown; remark?: unknown };
          if (typeof data.remark === "string") {
            lastFailure = /timed?\s*out|timeout/i.test(data.remark) ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE";
            sawTimeout ||= lastFailure === "UPSTREAM_TIMEOUT";
            continue;
          }
          if (!Array.isArray(data.elements)) {
            lastFailure = "UPSTREAM_UNAVAILABLE";
            continue;
          }
          const places = normalizeOverpassPlaces(data.elements, input.coordinates, categories, options.radiusMeters, 20);
          const found = result(places.length ? "OK" : "EMPTY", places);
          if (cache.size >= 100) cache.delete(cache.keys().next().value!);
          cache.set(key, { expiresAt: now() + CACHE_TTL_MS, result: found });
          return found;
        } catch (error) {
          lastFailure = controller.signal.aborted || (error instanceof Error && error.name === "AbortError") ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE";
          sawTimeout ||= lastFailure === "UPSTREAM_TIMEOUT";
        } finally {
          clearTimeout(timer);
          input.signal?.removeEventListener("abort", onAbort);
        }
      }
      return result(sawTimeout ? "UPSTREAM_TIMEOUT" : lastFailure);
    });
    pending.set(key, task);
    try { return present(await task, false); } finally { pending.delete(key); }
  }

  return { search };
}

const GEOAPIFY_PLACES_URL = "https://api.geoapify.com/v2/places";
const GEOAPIFY_TIMEOUT_MS = 10_000;
// One bounded request; unnamed or non-OSM features may be skipped by the mapper.
const GEOAPIFY_RESULT_LIMIT = 40;

type GeoapifyDependencies = {
  fetcher?: typeof fetch;
  now?: () => number;
  apiKey?: string;
  endpoint?: string;
};

export function createGeoapifyNearbyPlacesService(dependencies: GeoapifyDependencies = {}) {
  const fetcher = dependencies.fetcher ?? fetch;
  const now = dependencies.now ?? Date.now;
  const endpoint = dependencies.endpoint ?? GEOAPIFY_PLACES_URL;
  const cache = new Map<string, { expiresAt: number; result: NearbySearchResult }>();
  const pending = new Map<string, Promise<NearbySearchResult>>();
  let rateLimitedUntil = 0;
  let providerQueue: Promise<void> = Promise.resolve();

  async function search(input: SearchInput): Promise<NearbySearchResult> {
    const options = nearbySearchSchema.parse({
      categories: input.categories, radiusMeters: input.radiusMeters, limit: input.limit,
    });
    if (!validCoordinates(input.coordinates)) throw new Error("INVALID_COORDINATES");
    const categories = [...new Set(options.categories)].sort() as NearbyCategory[];
    const meta: NearbySearchResult["meta"] = {
      center: input.coordinates, radiusMeters: options.radiusMeters, categories,
      limit: options.limit, searchScope: "AROUND_PARK_COORDINATE", distanceMethod: "STRAIGHT_LINE",
      source: "GEOAPIFY_PLACES",
      coverageNote: "Geoapify Places รอบพิกัดอุทยาน; แสดงเฉพาะสถานที่ที่มีชื่อและ OSM ID ตรวจสอบได้จากผลลัพธ์หน้าแรก ระยะทางเป็นเส้นตรง ไม่ใช่ระยะขับรถ. © OpenStreetMap contributors; Powered by Geoapify (https://www.geoapify.com/)",
      cached: false,
    };
    const result = (status: SearchStatus, places: NearbyPlace[] = []): NearbySearchResult => ({ status, places, meta });
    const present = (value: NearbySearchResult, cached: boolean): NearbySearchResult => ({
      ...value, places: value.places.slice(0, options.limit),
      meta: { ...value.meta, limit: options.limit, cached },
    });
    const apiKey = (dependencies.apiKey ?? process.env.GEOAPIFY_API_KEY)?.trim();
    if (!apiKey || apiKey === "your_api_key_here") return result("UPSTREAM_UNAVAILABLE");
    const key = JSON.stringify([input.coordinates.lat, input.coordinates.lng, categories, options.radiusMeters]);
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now()) return present(hit.result, true);
    if (rateLimitedUntil > now()) return result("UPSTREAM_RATE_LIMITED");
    const existing = pending.get(key);
    if (existing) return present(await existing, false);
    const task = (async () => {
      const previous = providerQueue;
      let release!: () => void;
      providerQueue = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try {
        if (rateLimitedUntil > now()) return result("UPSTREAM_RATE_LIMITED");
        if (input.signal?.aborted) return result("UPSTREAM_TIMEOUT");
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), GEOAPIFY_TIMEOUT_MS);
        const onAbort = () => controller.abort();
        input.signal?.addEventListener("abort", onAbort, { once: true });
        try {
          const response = await fetcher(endpoint, {
            method: "POST", redirect: "error", cache: "no-store", signal: controller.signal,
            headers: { "content-type": "application/json", accept: "application/json", "x-api-key": apiKey },
            body: JSON.stringify({
              categories: getGeoapifyCategories(categories),
              filter: { type: "circle", lon: input.coordinates.lng, lat: input.coordinates.lat, radius: options.radiusMeters },
              bias: { type: "proximity", lon: input.coordinates.lng, lat: input.coordinates.lat },
              limit: GEOAPIFY_RESULT_LIMIT, lang: "th",
            }),
          });
          if (response.status === 429) {
            rateLimitedUntil = now() + RATE_LIMIT_COOLDOWN_MS;
            return result("UPSTREAM_RATE_LIMITED");
          }
          if (response.status === 408 || response.status === 504) return result("UPSTREAM_TIMEOUT");
          if (!response.ok || Number(response.headers.get("content-length")) > MAX_RESPONSE_BYTES) {
            return result("UPSTREAM_UNAVAILABLE");
          }
          const body = await response.text();
          if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) return result("UPSTREAM_UNAVAILABLE");
          const data = JSON.parse(body) as { type?: unknown; features?: unknown };
          if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) return result("UPSTREAM_UNAVAILABLE");
          const places = normalizeGeoapifyPlaces(data.features, input.coordinates, categories, options.radiusMeters, GEOAPIFY_RESULT_LIMIT);
          const found = result(places.length ? "OK" : "EMPTY", places);
          if (cache.size >= 100) cache.delete(cache.keys().next().value!);
          cache.set(key, { expiresAt: now() + CACHE_TTL_MS, result: found });
          return found;
        } catch (error) {
          return result(controller.signal.aborted || (error instanceof Error && error.name === "AbortError")
            ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE");
        } finally {
          clearTimeout(timer);
          input.signal?.removeEventListener("abort", onAbort);
        }
      } finally {
        release();
      }
    })();
    pending.set(key, task);
    try { return present(await task, false); } finally { pending.delete(key); }
  }

  return { search };
}

type NearbyPlacesEnvironment = Readonly<Record<string, string | undefined>>;

export function getNearbyPlacesProvider(environment: NearbyPlacesEnvironment = process.env): "geoapify" | "overpass" {
  const configured = environment.NEARBY_PLACES_PROVIDER?.trim().toLowerCase();
  if (!configured || configured === "geoapify") return "geoapify";
  if (configured === "overpass") return "overpass";
  throw new Error("NEARBY_PLACES_PROVIDER must be geoapify or overpass");
}

export function createConfiguredNearbyPlacesService(
  environment: NearbyPlacesEnvironment = process.env,
  dependencies: { geoapify?: ReturnType<typeof createGeoapifyNearbyPlacesService>; overpass?: ReturnType<typeof createNearbyPlacesService> } = {},
) {
  const geoapify = dependencies.geoapify ?? createGeoapifyNearbyPlacesService();
  const overpass = dependencies.overpass ?? createNearbyPlacesService();
  return {
    search(input: SearchInput) {
      return (getNearbyPlacesProvider(environment) === "geoapify" ? geoapify : overpass).search(input);
    },
  };
}

export const nearbyPlacesService = createConfiguredNearbyPlacesService();

type ParkForNearby = { id: string; slug: string; nameTh: string; latitude: number | null; longitude: number | null };
type ParkDependencies = {
  readPark?: (idOrSlug: string) => Promise<ParkForNearby>;
  search?: typeof nearbyPlacesService.search;
  enrichRoutes?: typeof nearbyPlacesRoutingService.enrich;
};

export async function searchNearbyPlacesForPark(
  idOrSlug: string,
  options: NearbySearchOptions,
  dependencies: ParkDependencies = {},
  signal?: AbortSignal,
) {
  let park: ParkForNearby;
  try {
    park = await (dependencies.readPark ?? getParkDetail)(idOrSlug);
  } catch (error) {
    if (error instanceof NotFoundError) return { status: "PARK_NOT_FOUND" as const };
    throw error;
  }
  const reference = { id: park.id, slug: park.slug, name: park.nameTh };
  if (COORDINATE_REVIEW_SLUGS.has(park.slug)) return { status: "COORDINATE_REVIEW_REQUIRED" as const, park: reference };
  if (park.latitude === null || park.longitude === null || !validCoordinates({ lat: park.latitude, lng: park.longitude })) {
    return { status: "INVALID_COORDINATES" as const, park: reference };
  }
  const search = dependencies.search ?? nearbyPlacesService.search;
  const center = { lat: park.latitude, lng: park.longitude };
  const result = await search({ ...options, coordinates: center, signal });
  if (result.status !== "OK") return { ...result, park: reference };
  try {
    const enrichRoutes = dependencies.enrichRoutes ?? nearbyPlacesRoutingService.enrich;
    return { ...result, places: await enrichRoutes(center, result.places, signal), park: reference };
  } catch {
    return { ...result, places: result.places.map((place) => ({ ...place, routeStatus: "UNAVAILABLE" as const })), park: reference };
  }
}
