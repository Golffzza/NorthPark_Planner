import { describe, expect, it, vi } from "vitest";
import { searchNearbyPlacesProgressivelyForPark } from "@/lib/services/progressive-nearby-search";
import type { NearbyCategory, NearbyPlace, NearbySearchResult } from "@/lib/services/nearby-places-service";
import type { searchNearbyPlacesForPark } from "@/lib/services/nearby-places-service";

function place(id: number, category: NearbyCategory, meters: number): NearbyPlace {
  return { id: String(id), osmType: "node", osmId: id, osmUrl: `https://www.openstreetmap.org/node/${id}`,
    name: `Place ${id}`, category, lat: 18, lng: 100, straightLineDistanceMeters: meters, source: "OPENSTREETMAP" };
}
function result(radiusMeters: number, categories: NearbyCategory[], places: NearbyPlace[]): NearbySearchResult {
  return { status: places.length ? "OK" : "EMPTY", places, meta: {
    center: { lat: 18, lng: 100 }, radiusMeters, categories, limit: 20,
    searchScope: "AROUND_PARK_COORDINATE", distanceMethod: "STRAIGHT_LINE",
    source: "OPENSTREETMAP_OVERPASS", coverageNote: "OSM", cached: false,
  } };
}
type Search = typeof searchNearbyPlacesForPark;

describe("progressive nearby search", () => {
  it("stops at 3 km when each requested category has three distinct places", async () => {
    const search = vi.fn(async (_slug: string, opts: { categories: NearbyCategory[]; radiusMeters: number }) =>
      result(opts.radiusMeters, opts.categories, [place(1, "food", 400), place(2, "food", 600), place(3, "food", 900)]));
    const output = await searchNearbyPlacesProgressivelyForPark("park", { categories: ["food"], radiusMeters: 3000, limit: 10 }, undefined, search as Search);
    expect(output.status).toBe("OK");
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("expands only underfilled categories, deduplicates and sorts nearest first", async () => {
    const search = vi.fn(async (_slug: string, opts: { categories: NearbyCategory[]; radiusMeters: number }) => {
      if (opts.radiusMeters === 3000) return result(3000, opts.categories, [
        place(1, "food", 1000), place(2, "food", 2000), place(3, "food", 2400),
        place(4, "accommodation", 2700),
      ]);
      if (opts.radiusMeters === 5000) return result(5000, opts.categories, [place(4, "accommodation", 2700)]);
      return result(20000, opts.categories, [place(4, "accommodation", 2700), place(5, "accommodation", 12000), place(6, "accommodation", 18000)]);
    });
    const output = await searchNearbyPlacesProgressivelyForPark("park", { categories: ["food", "accommodation"], radiusMeters: 3000, limit: 10 }, undefined, search as Search);
    expect(search.mock.calls.map((call) => call[1].categories)).toEqual([
      ["food", "accommodation"], ["accommodation"], ["accommodation"],
    ]);
    expect(output.places).toHaveLength(6);
    expect(output.places.map((item) => item.osmId)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(output.meta?.radiusMeters).toBe(20000);
  });

  it("searches explicitly requested 20 km once", async () => {
    const search = vi.fn(async (_slug: string, opts: { categories: NearbyCategory[]; radiusMeters: number }) =>
      result(opts.radiusMeters, opts.categories, []));
    await searchNearbyPlacesProgressivelyForPark("park", { categories: ["food"], radiusMeters: 20000, limit: 10 }, undefined, search as Search);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0][1].radiusMeters).toBe(20000);
  });

  it("does not confuse provider errors with empty results", async () => {
    const search = vi.fn(async () => ({ status: "UPSTREAM_TIMEOUT" as const, places: [] }));
    const output = await searchNearbyPlacesProgressivelyForPark("park", { categories: ["food"], radiusMeters: 3000, limit: 10 }, undefined, search as Search);
    expect(output.status).toBe("UPSTREAM_TIMEOUT");
    expect(search).toHaveBeenCalledTimes(1);
  });
});
