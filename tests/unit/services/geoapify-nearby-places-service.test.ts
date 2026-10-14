import { describe, expect, it, vi } from "vitest";

import {
  createConfiguredNearbyPlacesService,
  createGeoapifyNearbyPlacesService,
  createNearbyPlacesService,
  getGeoapifyCategories,
  getNearbyPlacesProvider,
  normalizeGeoapifyPlaces,
  searchNearbyPlacesForPark,
} from "@/lib/services/nearby-places-service";

const center = { lat: 18.8047, lng: 98.9218 };
const feature = (osmId: number, name: string | undefined, categories: string[], lat = 18.8033254, lng = 98.9196507) => ({
  type: "Feature",
  properties: {
    ...(name ? { name } : {}), categories, lat, lon: lng,
    datasource: { sourcename: "openstreetmap", raw: { osm_id: osmId, osm_type: "n" } },
  },
  geometry: { type: "Point", coordinates: [lng, lat] },
});
const response = (features: unknown[], status = 200) =>
  new Response(JSON.stringify({ type: "FeatureCollection", features }), { status });

describe("Geoapify Nearby Places", () => {
  it("maps the five Nearby categories to documented Geoapify Places categories", () => {
    const categories = getGeoapifyCategories(["food", "accommodation", "campsite", "attraction", "service"]);
    expect(categories).toContain("catering.restaurant");
    expect(categories).toContain("accommodation.hotel");
    expect(categories).toContain("camping.camp_site");
    expect(categories).toContain("tourism.attraction");
    expect(categories).toContain("commercial.convenience");
    expect(categories).toContain("service.vehicle.fuel");
    expect(getGeoapifyCategories(["food", "food"])).toHaveLength(4);
  });

  it("normalizes only named, valid, OSM-backed Geoapify results without inventing references", () => {
    const way = feature(20, "Guest House", ["accommodation.guest_house"]);
    way.properties.datasource.raw.osm_type = "w";
    way.properties.lat = 18.804;
    const relation = feature(30, "Camp", ["camping.camp_site"]);
    relation.properties.datasource.raw.osm_type = "r";
    relation.properties.lat = 18.805;
    const unsafe = feature(40, "Cafe", ["catering.cafe.coffee_shop"]);
    const places = normalizeGeoapifyPlaces([
      feature(10, undefined, ["catering.restaurant"]),
      feature(11, "Too far", ["catering.restaurant"], 17, 99),
      feature(12, "Wrong category", ["service.vehicle.fuel"]),
      { ...feature(13, "No OSM ID", ["catering.restaurant"]), properties: { name: "No OSM ID", categories: ["catering.restaurant"], lat: center.lat, lon: center.lng } },
      way, relation, unsafe, unsafe,
    ], center, ["food", "accommodation", "campsite"], 3000, 10);
    expect(places.map((place) => place.id)).toEqual(["osm:relation:30", "osm:way:20", "osm:node:40"]);
    expect(places[1]).toMatchObject({ category: "accommodation", source: "OPENSTREETMAP", osmUrl: "https://www.openstreetmap.org/way/20" });
    expect(places[0].straightLineDistanceMeters).toBeGreaterThan(0);
    expect(places.every((place) => place.roadDistanceMeters === undefined)).toBe(true);
  });

  it("uses verified geometry when property coordinates are absent and rejects unsafe websites", () => {
    const place = feature(41, "Fuel", ["service.vehicle.fuel"]);
    const properties = place.properties as Record<string, unknown>;
    delete properties.lat;
    delete properties.lon;
    properties.website = "javascript:alert(1)";
    const found = normalizeGeoapifyPlaces([place], center, ["service"], 3000, 10);
    expect(found).toMatchObject([{ lat: 18.8033254, lng: 98.9196507, category: "service" }]);
    expect(found[0]).not.toHaveProperty("website");
  });

  it("sends one bounded server-side POST and reuses successful results across limits", async () => {
    const fetcher = vi.fn().mockResolvedValue(response([
      feature(1, "Cafe A", ["catering.cafe"]),
      feature(2, "Cafe B", ["catering.cafe"], 18.804, 98.921),
    ]));
    const service = createGeoapifyNearbyPlacesService({ fetcher, apiKey: "test-key" });
    const first = await service.search({ coordinates: center, categories: ["food"], radiusMeters: 3000, limit: 1 });
    const second = await service.search({ coordinates: center, categories: ["food"], radiusMeters: 3000, limit: 2 });
    expect(first).toMatchObject({ status: "OK", meta: { source: "GEOAPIFY_PLACES", cached: false }, places: [{ source: "OPENSTREETMAP" }] });
    expect(first.places).toHaveLength(1);
    expect(second).toMatchObject({ status: "OK", meta: { cached: true, limit: 2 } });
    expect(second.places).toHaveLength(2);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.geoapify.com/v2/places");
    expect(init.headers["x-api-key"]).toBe("test-key");
    expect(String(url)).not.toContain("test-key");
    expect(init.redirect).toBe("error");
    expect(JSON.parse(init.body)).toMatchObject({
      categories: ["catering.restaurant", "catering.cafe", "catering.fast_food", "catering.food_court"],
      filter: { type: "circle", lon: center.lng, lat: center.lat, radius: 3000 },
      bias: { type: "proximity", lon: center.lng, lat: center.lat }, limit: 40,
    });
  });

  it("distinguishes empty, invalid coordinates, and missing API key", async () => {
    const fetcher = vi.fn().mockResolvedValue(response([]));
    const service = createGeoapifyNearbyPlacesService({ fetcher, apiKey: "test-key" });
    expect((await service.search({ coordinates: center, categories: ["food"] })).status).toBe("EMPTY");
    await expect(service.search({ coordinates: { lat: 100, lng: 99 }, categories: ["food"] })).rejects.toThrow("INVALID_COORDINATES");
    const missing = createGeoapifyNearbyPlacesService({ fetcher, apiKey: "" });
    expect((await missing.search({ coordinates: center, categories: ["food"] })).status).toBe("UPSTREAM_UNAVAILABLE");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("distinguishes timeouts, 429 cooldown, 5xx, and malformed provider data", async () => {
    const input = { coordinates: center, categories: ["food" as const] };
    const timeout = createGeoapifyNearbyPlacesService({ apiKey: "key", fetcher: vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")) });
    expect((await timeout.search(input)).status).toBe("UPSTREAM_TIMEOUT");
    const gateway = createGeoapifyNearbyPlacesService({ apiKey: "key", fetcher: vi.fn().mockResolvedValue(new Response("timeout", { status: 504 })) });
    expect((await gateway.search(input)).status).toBe("UPSTREAM_TIMEOUT");
    const unavailable = createGeoapifyNearbyPlacesService({ apiKey: "key", fetcher: vi.fn().mockResolvedValue(new Response("error", { status: 500 })) });
    expect((await unavailable.search(input)).status).toBe("UPSTREAM_UNAVAILABLE");
    const malformed = createGeoapifyNearbyPlacesService({ apiKey: "key", fetcher: vi.fn().mockResolvedValue(new Response("not json", { status: 200 })) });
    expect((await malformed.search(input)).status).toBe("UPSTREAM_UNAVAILABLE");
    const fetcher = vi.fn().mockResolvedValue(new Response("limited", { status: 429 }));
    const limited = createGeoapifyNearbyPlacesService({ apiKey: "key", fetcher, now: () => 1000 });
    expect((await limited.search(input)).status).toBe("UPSTREAM_RATE_LIMITED");
    expect((await limited.search(input)).status).toBe("UPSTREAM_RATE_LIMITED");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("switches providers explicitly without fallback and preserves OSRM enrichment", async () => {
    expect(getNearbyPlacesProvider({})).toBe("geoapify");
    expect(getNearbyPlacesProvider({ NEARBY_PLACES_PROVIDER: "overpass" })).toBe("overpass");
    expect(() => getNearbyPlacesProvider({ NEARBY_PLACES_PROVIDER: "other" })).toThrow();
    const geoFetcher = vi.fn().mockResolvedValue(response([feature(1, "Cafe", ["catering.cafe"])]));
    const overpassFetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ elements: [] }), { status: 200 }));
    const geoapify = createGeoapifyNearbyPlacesService({ apiKey: "key", fetcher: geoFetcher });
    const overpass = createNearbyPlacesService({ fetcher: overpassFetcher });
    const selected = createConfiguredNearbyPlacesService({ NEARBY_PLACES_PROVIDER: "geoapify" }, { geoapify, overpass });
    const readPark = vi.fn().mockResolvedValue({ id: "park-1", slug: "doi-suthep-pui", nameTh: "Doi Suthep-Pui", latitude: center.lat, longitude: center.lng });
    const enrichRoutes = vi.fn().mockImplementation(async (_center, places) => places.map((place: Record<string, unknown>) => ({ ...place, roadDistanceMeters: 800, estimatedDrivingMinutes: 3, routeStatus: "OK" })));
    const found = await searchNearbyPlacesForPark("doi-suthep-pui", { categories: ["food"] }, { readPark, search: selected.search, enrichRoutes });
    expect(found).toMatchObject({ status: "OK", meta: { source: "GEOAPIFY_PLACES" }, places: [{ id: "osm:node:1", roadDistanceMeters: 800, estimatedDrivingMinutes: 3, routeStatus: "OK" }] });
    expect(overpassFetcher).not.toHaveBeenCalled();
    const failingGeoapify = createGeoapifyNearbyPlacesService({ apiKey: "key", fetcher: vi.fn().mockResolvedValue(new Response("error", { status: 500 })) });
    const noFallback = createConfiguredNearbyPlacesService({ NEARBY_PLACES_PROVIDER: "geoapify" }, { geoapify: failingGeoapify, overpass });
    expect((await noFallback.search({ coordinates: center, categories: ["food"] })).status).toBe("UPSTREAM_UNAVAILABLE");
    expect(overpassFetcher).not.toHaveBeenCalled();
    const old = createConfiguredNearbyPlacesService({ NEARBY_PLACES_PROVIDER: "overpass" }, { geoapify, overpass });
    expect((await old.search({ coordinates: center, categories: ["food"] })).meta.source).toBe("OPENSTREETMAP_OVERPASS");
    expect(overpassFetcher).toHaveBeenCalledTimes(1);
  });
});
