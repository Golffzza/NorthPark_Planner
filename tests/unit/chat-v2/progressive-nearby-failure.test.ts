import { describe, expect, it, vi } from "vitest";
import { searchNearbyPlacesProgressivelyForPark } from "@/lib/services/progressive-nearby-search";
import type { NearbyPlace } from "@/lib/services/nearby-places-service";

describe("progressive nearby upstream recovery", () => {
  it("does not misreport an upstream failure as zero nearby places", async () => {
    const search = vi.fn().mockResolvedValue({
      status: "UPSTREAM_UNAVAILABLE", places: [],
    });
    const result = await searchNearbyPlacesProgressivelyForPark(
      "mae-moei", { categories: ["restaurant"], radiusMeters: 3000, limit: 10 },
      undefined, search,
    );
    expect(result.status).toBe("UPSTREAM_UNAVAILABLE");
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("preserves verified results when a later radius fails", async () => {
    const place = {
      osmType: "node", osmId: 123, name: "Verified restaurant", category: "restaurant",
      straightLineDistanceMeters: 2400,
    } as NearbyPlace;
    const search = vi.fn()
      .mockResolvedValueOnce({
        status: "OK", places: [place],
        meta: { radiusMeters: 3000, coverageNote: "Verified nearby results" },
      })
      .mockResolvedValueOnce({
        status: "UPSTREAM_TIMEOUT", places: [],
      });
    const result = await searchNearbyPlacesProgressivelyForPark(
      "mae-moei", { categories: ["restaurant"], radiusMeters: 3000, limit: 10 },
      undefined, search,
    );
    expect(result.status).toBe("OK");
    expect(result.places).toHaveLength(1);
    expect(result.meta).toMatchObject({
      searchedRadiiMeters: [3000],
      expansionInterruptedBy: "UPSTREAM_TIMEOUT",
    });
    expect(search).toHaveBeenCalledTimes(2);
  });
});
