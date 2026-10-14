import { describe, expect, it, vi } from "vitest";

import {
  createNearbyPlacesService,
  nearbySearchSchema,
  normalizeOverpassPlaces,
  searchNearbyPlacesForPark,
} from "@/lib/services/nearby-places-service";

const origin = { lat: 16.88, lng: 99.14 };
const elements = [
  { type: "node", id: 2, lat: 16.881, lon: 99.14, tags: { name: "Cafe A", amenity: "cafe", opening_hours: "Mo-Fr 08:00-17:00" } },
  { type: "way", id: 3, center: { lat: 16.882, lon: 99.14 }, tags: { name: "Hotel B", tourism: "hotel" } },
  { type: "relation", id: 4, center: { lat: 16.883, lon: 99.14 }, tags: { name: "Camp C", tourism: "camp_site" } },
  { type: "node", id: 2, lat: 16.881, lon: 99.14, tags: { name: "Cafe A", amenity: "cafe" } },
  { type: "node", id: 5, lat: 16.881, lon: 99.14, tags: { amenity: "restaurant" } },
  { type: "node", id: 6, lat: 0, lon: 0, tags: { name: "Far", amenity: "cafe" } },
  { type: "node", id: 7, lat: null, lon: null, tags: { name: "Missing coordinates", amenity: "cafe" } },
  { type: "way", id: 9, tags: { name: "Missing center", amenity: "cafe" } },
];

describe("nearby places service", () => {
  it("normalizes node, way and relation, sorts, deduplicates, and filters category and radius", () => {
    const places = normalizeOverpassPlaces(elements, origin, ["food", "accommodation", "campsite"], 1000, 10);
    expect(places.map((place) => place.id)).toEqual(["osm:node:2", "osm:way:3", "osm:relation:4"]);
    expect(places[0]).toMatchObject({ name: "Cafe A", category: "food", source: "OPENSTREETMAP", osmUrl: "https://www.openstreetmap.org/node/2", straightLineDistanceMeters: expect.any(Number), openingHours: "Mo-Fr 08:00-17:00" });
    expect(places[0].straightLineDistanceMeters).toBeGreaterThan(100);
    expect(places[0].straightLineDistanceMeters).toBeLessThan(120);
    expect(normalizeOverpassPlaces(elements, origin, ["food"], 1000, 1)).toHaveLength(1);
  });

  it("validates bounded categories, radius, and limit", () => {
    expect(nearbySearchSchema.safeParse({ categories: ["food"], radiusMeters: 5000, limit: 20 }).success).toBe(true);
    for (const input of [
      { categories: ["bad"] },
      { categories: ["food"], radiusMeters: 50000 },
      { categories: ["food"], limit: 100 },
      { categories: [] },
    ]) expect(nearbySearchSchema.safeParse(input).success).toBe(false);
  });

  it("maps attractions and services only from their tags and rejects unsafe website values", () => {
    const places = normalizeOverpassPlaces([
      { type: "node", id: 10, lat: 16.881, lon: 99.14, tags: { name: "Waterfall", natural: "waterfall" } },
      { type: "node", id: 11, lat: 16.882, lon: 99.14, tags: { name: "Fuel", amenity: "fuel", website: "javascript:alert(1)" } },
    ], origin, ["attraction", "service"], 1000, 10);
    expect(places.map((place) => place.category)).toEqual(["attraction", "service"]);
    expect(places[1]).not.toHaveProperty("website");
  });

  it("caches successful empty responses and sends bounded fixed Overpass query", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ elements: [] }), { status: 200 }));
    const service = createNearbyPlacesService({ fetcher, now: () => 1000 });
    const input = { coordinates: origin, categories: ["food" as const], radiusMeters: 1000, limit: 5 };
    expect((await service.search(input)).status).toBe("EMPTY");
    expect((await service.search(input)).status).toBe("EMPTY");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://overpass-api.de/api/interpreter");
    expect(init.headers["user-agent"]).toContain("NorthPark_Planner/");
    expect(init.redirect).toBe("error");
    const query = new URLSearchParams(init.body).get("data");
    expect(query).toContain("[bbox:16.870917,99.130508,16.889083,99.149492]");
    expect(query).toContain('nwr["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]["name"]');
    expect(query).not.toContain("around:");
    expect(query).toContain("out center");
  });

  it("refreshes a cached result after its TTL", async () => {
    let now = 0;
    const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ elements: [] }), { status: 200 }));
    const service = createNearbyPlacesService({ fetcher, now: () => now });
    const input = { coordinates: origin, categories: ["food" as const] };
    await service.search(input);
    now = 10 * 60 * 1000 + 1;
    await service.search(input);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("combines same-key OSM filters when searching all categories", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ elements: [] }), { status: 200 }));
    const service = createNearbyPlacesService({ fetcher });
    await service.search({ coordinates: origin, categories: ["food", "accommodation", "campsite", "attraction", "service"] });
    const query = new URLSearchParams(fetcher.mock.calls[0][1].body).get("data")!;
    expect(query.match(/nwr\[/g)).toHaveLength(5);
    expect(query).toContain('"amenity"~"^(restaurant|cafe|fast_food|food_court|fuel)$"');
    expect(query).toContain('"tourism"~"^(hotel|guest_house|motel|hostel|chalet|resort|attraction|viewpoint|museum|picnic_site|camp_site|caravan_site)$"');
  });

  it("reuses an area/category response for different result limits", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ elements: [elements[0], { type: "node", id: 8, lat: 16.882, lon: 99.14, tags: { name: "Cafe B", amenity: "cafe" } }] }), { status: 200 }));
    const service = createNearbyPlacesService({ fetcher });
    const small = await service.search({ coordinates: origin, categories: ["food"], radiusMeters: 1000, limit: 1 });
    const larger = await service.search({ coordinates: origin, categories: ["food"], radiusMeters: 1000, limit: 2 });
    expect(small.places).toHaveLength(1);
    expect(larger.places).toHaveLength(2);
    expect(larger.meta).toMatchObject({ limit: 2, cached: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reports timeout and rate limiting without caching failures", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new DOMException("aborted", "AbortError"))
      .mockResolvedValueOnce(new Response("busy", { status: 406 }));
    const service = createNearbyPlacesService({ fetcher, now: () => 1000, endpoints: ["https://overpass-api.de/api/interpreter"] });
    const input = { coordinates: origin, categories: ["food" as const], radiusMeters: 1000, limit: 5 };
    expect((await service.search(input)).status).toBe("UPSTREAM_TIMEOUT");
    expect((await service.search(input)).status).toBe("UPSTREAM_RATE_LIMITED");
    expect((await service.search(input)).status).toBe("UPSTREAM_RATE_LIMITED");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("fails over once for upstream timeout, without caching a failed response", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("gateway timeout", { status: 504 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ elements: [elements[0]] }), { status: 200 }));
    const service = createNearbyPlacesService({ fetcher, endpoints: ["https://primary.example/api", "https://fallback.example/api"] });
    const found = await service.search({ coordinates: origin, categories: ["food"], radiusMeters: 1000, limit: 5 });
    expect(found.status).toBe("OK");
    expect(found.places[0].id).toBe("osm:node:2");
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(["https://primary.example/api", "https://fallback.example/api"]);
    expect((await service.search({ coordinates: origin, categories: ["food"], radiusMeters: 1000, limit: 5 })).meta.cached).toBe(true);
  });

  it("does not convert an Overpass timeout remark to EMPTY", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ elements: [], remark: "runtime error: Query timed out" }), { status: 200 }));
    const service = createNearbyPlacesService({ fetcher, endpoints: ["https://primary.example/api"] });
    const result = await service.search({ coordinates: origin, categories: ["food"] });
    expect(result.status).toBe("UPSTREAM_TIMEOUT");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("stops on rate limit without calling the fallback", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("slow down", { status: 429 }));
    const service = createNearbyPlacesService({ fetcher, endpoints: ["https://primary.example/api", "https://fallback.example/api"] });
    const input = { coordinates: origin, categories: ["food" as const] };
    expect((await service.search(input)).status).toBe("UPSTREAM_RATE_LIMITED");
    expect((await service.search(input)).status).toBe("UPSTREAM_RATE_LIMITED");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("serializes different searches to avoid parallel public provider calls", async () => {
    let active = 0;
    let maximumActive = 0;
    const fetcher = vi.fn().mockImplementation(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return new Response(JSON.stringify({ elements: [] }), { status: 200 });
    });
    const service = createNearbyPlacesService({ fetcher, endpoints: ["https://primary.example/api"] });
    await Promise.all([
      service.search({ coordinates: origin, categories: ["food"] }),
      service.search({ coordinates: origin, categories: ["service"] }),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(maximumActive).toBe(1);
  });

  it("keeps timeout status when the fallback is unavailable", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response("timeout", { status: 504 }))
      .mockResolvedValueOnce(new Response("error", { status: 500 }));
    const service = createNearbyPlacesService({ fetcher, endpoints: ["https://primary.example/api", "https://fallback.example/api"] });
    expect((await service.search({ coordinates: origin, categories: ["food"] })).status).toBe("UPSTREAM_TIMEOUT");
  });

  it("blocks the four unresolved park coordinates before Overpass and rejects unknown parks", async () => {
    const search = vi.fn();
    const readPark = vi.fn();
    for (const slug of ["namtok-pha-charoen", "nanthaburi", "ramkhamhaeng", "si-satchanalai"]) {
      readPark.mockResolvedValueOnce({ id: "db-1", slug, nameTh: slug, latitude: 19, longitude: 100 });
      expect((await searchNearbyPlacesForPark(slug, { categories: ["food"] }, { readPark, search })).status).toBe("COORDINATE_REVIEW_REQUIRED");
    }
    expect(search).not.toHaveBeenCalled();
    readPark.mockRejectedValueOnce(new (await import("@/lib/services/park-service")).NotFoundError("Park not found"));
    expect((await searchNearbyPlacesForPark("missing", { categories: ["food"] }, { readPark, search })).status).toBe("PARK_NOT_FOUND");
    readPark.mockResolvedValueOnce({ id: "db-2", slug: "lan-sang", nameTh: "ลานสาง", latitude: null, longitude: 99 });
    expect((await searchNearbyPlacesForPark("lan-sang", { categories: ["food"] }, { readPark, search })).status).toBe("INVALID_COORDINATES");
    expect(search).not.toHaveBeenCalled();
  });

  it("adds optional routing to real nearby places while preserving the park and straight-line result", async () => {
    const place = normalizeOverpassPlaces([elements[0]], origin, ["food"], 1000, 10)[0];
    const readPark = vi.fn().mockResolvedValue({ id: "db-park", slug: "lan-sang", nameTh: "Lan Sang", latitude: origin.lat, longitude: origin.lng });
    const search = vi.fn().mockResolvedValue({ status: "OK", places: [place], meta: { cached: false } });
    const enrichRoutes = vi.fn().mockResolvedValue([{ ...place, roadDistanceMeters: 800, estimatedDrivingMinutes: 3, routeStatus: "OK" }]);
    const result = await searchNearbyPlacesForPark("lan-sang", { categories: ["food"] }, { readPark, search, enrichRoutes });
    expect(enrichRoutes).toHaveBeenCalledWith(origin, [place], undefined);
    expect(result).toMatchObject({ status: "OK", park: { id: "db-park", slug: "lan-sang" }, places: [{
      id: place.id, straightLineDistanceMeters: place.straightLineDistanceMeters,
      roadDistanceMeters: 800, estimatedDrivingMinutes: 3, routeStatus: "OK",
    }] });
  });

  it("keeps Overpass OK when OSRM enrichment fails", async () => {
    const place = normalizeOverpassPlaces([elements[0]], origin, ["food"], 1000, 10)[0];
    const readPark = vi.fn().mockResolvedValue({ id: "db-park", slug: "lan-sang", nameTh: "Lan Sang", latitude: origin.lat, longitude: origin.lng });
    const search = vi.fn().mockResolvedValue({ status: "OK", places: [place] });
    const enrichRoutes = vi.fn().mockRejectedValue(new Error("OSRM failed"));
    const result = await searchNearbyPlacesForPark("lan-sang", { categories: ["food"] }, { readPark, search, enrichRoutes });
    expect(result).toMatchObject({ status: "OK", places: [{ id: place.id, routeStatus: "UNAVAILABLE" }] });
    expect(result).not.toMatchObject({ status: "UPSTREAM_UNAVAILABLE" });
    expect(result).not.toMatchObject({ places: [{ estimatedDrivingMinutes: expect.any(Number) }] });
  });
});
