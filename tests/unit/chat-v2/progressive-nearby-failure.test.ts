import { describe, expect, it, vi } from "vitest";
import { searchNearbyPlacesProgressivelyForPark } from "@/lib/services/progressive-nearby-search";
import type { NearbyPlace } from "@/lib/services/nearby-places-service";

describe("progressive nearby upstream recovery", () => {
  it("does not misreport an upstream failure as zero nearby places", async () => {
    const search = vi.fn().mockResolvedValue({
      status: "UPSTREAM_UNAVAILABLE", places: [],
    });
    const result = await searchNearbyPlacesProgressivelyForPark(
      "mae-moei", { categories: ["food"], radiusMeters: 3000, limit: 10 },
      undefined, search,
    );
    expect(result.status).toBe("UPSTREAM_UNAVAILABLE");
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("preserves verified results when a later radius fails", async () => {
    const place = {
      id: "osm:node:123", osmType: "node", osmId: 123,
      osmUrl: "https://www.openstreetmap.org/node/123",
      name: "Verified restaurant", category: "food", lat: 18, lng: 98,
      source: "OPENSTREETMAP", straightLineDistanceMeters: 2400,
    } satisfies NearbyPlace;
    const search = vi.fn()
      .mockResolvedValueOnce({
        status: "OK", places: [place],
        meta: { center: { lat: 18, lng: 98 }, radiusMeters: 3000,
          categories: ["food"], limit: 20, searchScope: "AROUND_PARK_COORDINATE",
          distanceMethod: "STRAIGHT_LINE", source: "OPENSTREETMAP_OVERPASS",
          coverageNote: "Verified nearby results", cached: false },
      })
      .mockResolvedValueOnce({
        status: "UPSTREAM_TIMEOUT", places: [],
      });
    const result = await searchNearbyPlacesProgressivelyForPark(
      "mae-moei", { categories: ["food"], radiusMeters: 3000, limit: 10 },
      undefined, search,
    );
    expect(result.status).toBe("OK");
    if (!("places" in result) || !("meta" in result)) throw new Error("EXPECTED_NEARBY_RESULT");
    expect(result.places).toHaveLength(1);
    expect(result.meta).toMatchObject({
      searchedRadiiMeters: [3000],
      expansionInterruptedBy: "UPSTREAM_TIMEOUT",
    });
    expect(search).toHaveBeenCalledTimes(2);
  });
});
