import { describe, expect, it, vi } from "vitest";

import type { NearbyPlace } from "@/lib/services/nearby-places-service";
import { createNearbyPlacesRoutingService } from "@/lib/services/nearby-places-routing-service";

const origin = { lat: 18.8047, lng: 98.9218 };
const cafe: NearbyPlace = {
  id: "osm:node:1", osmType: "node", osmId: 1, osmUrl: "https://www.openstreetmap.org/node/1",
  name: "Cafe fixture", category: "food", lat: 18.8033254, lng: 98.9196507,
  straightLineDistanceMeters: 273, source: "OPENSTREETMAP",
};
const hotel: NearbyPlace = {
  ...cafe, id: "osm:way:2", osmType: "way", osmId: 2,
  osmUrl: "https://www.openstreetmap.org/way/2", name: "Hotel fixture",
  category: "accommodation", lat: 18.81, lng: 98.93,
};

describe("nearby places routing enrichment", () => {
  it("batches destinations, preserves straight-line distance, and caches routes", async () => {
    const routeTable = vi.fn().mockResolvedValue([
      { status: "OK", distanceMeters: 509.9, durationSeconds: 97.7 },
      { status: "NO_ROUTE" },
    ]);
    const service = createNearbyPlacesRoutingService({ routeTable });
    const first = await service.enrich(origin, [cafe, hotel]);
    expect(routeTable).toHaveBeenCalledWith(origin, [
      { lat: cafe.lat, lng: cafe.lng }, { lat: hotel.lat, lng: hotel.lng },
    ], undefined);
    expect(first[0]).toMatchObject({
      id: cafe.id, straightLineDistanceMeters: 273,
      roadDistanceMeters: 510, estimatedDrivingMinutes: 2, routeStatus: "OK",
    });
    expect(first[1]).toMatchObject({ id: hotel.id, routeStatus: "NO_ROUTE" });
    expect(first[1]).not.toHaveProperty("roadDistanceMeters");
    expect(first[1]).not.toHaveProperty("estimatedDrivingMinutes");
    expect(await service.enrich(origin, [cafe, hotel])).toEqual(first);
    expect(routeTable).toHaveBeenCalledTimes(1);
    expect(cafe).not.toHaveProperty("roadDistanceMeters");
  });

  it("keeps places without fake times on upstream failure and retries after short failure cache", async () => {
    let now = 0;
    const routeTable = vi.fn().mockRejectedValueOnce(new Error("OSRM unavailable"))
      .mockResolvedValueOnce([{ status: "OK", distanceMeters: 1000, durationSeconds: 120 }]);
    const service = createNearbyPlacesRoutingService({ routeTable, now: () => now });
    const unavailable = await service.enrich(origin, [cafe]);
    expect(unavailable).toEqual([{ ...cafe, routeStatus: "UNAVAILABLE" }]);
    expect(await service.enrich(origin, [cafe])).toEqual(unavailable);
    now = 30_001;
    expect((await service.enrich(origin, [cafe]))[0]).toMatchObject({ roadDistanceMeters: 1000, estimatedDrivingMinutes: 2 });
    expect(routeTable).toHaveBeenCalledTimes(2);
  });

  it("removes stale driving values when a later route is unavailable", async () => {
    const routeTable = vi.fn().mockResolvedValue([{ status: "UNAVAILABLE" }]);
    const service = createNearbyPlacesRoutingService({ routeTable });
    const stale = { ...cafe, roadDistanceMeters: 900, estimatedDrivingMinutes: 4, routeStatus: "OK" as const };
    expect(await service.enrich(origin, [stale])).toEqual([{ ...cafe, routeStatus: "UNAVAILABLE" }]);
  });

  it("does not route invalid coordinates or duplicate identical destinations", async () => {
    const routeTable = vi.fn().mockResolvedValue([{ status: "OK", distanceMeters: 500, durationSeconds: 90 }]);
    const service = createNearbyPlacesRoutingService({ routeTable });
    const duplicate = { ...cafe, id: "osm:node:3", osmId: 3 };
    const invalid = { ...hotel, lat: Number.NaN };
    const places = await service.enrich(origin, [cafe, duplicate, invalid]);
    expect(routeTable).toHaveBeenCalledWith(origin, [{ lat: cafe.lat, lng: cafe.lng }], undefined);
    expect(places.map((place) => place.routeStatus)).toEqual(["OK", "OK", "UNAVAILABLE"]);
    expect(places[2]).not.toHaveProperty("estimatedDrivingMinutes");
  });

  it("serializes routing batches from concurrent searches", async () => {
    let active = 0;
    let maximumActive = 0;
    const routeTable = vi.fn().mockImplementation(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return [{ status: "OK", distanceMeters: 500, durationSeconds: 90 }];
    });
    const service = createNearbyPlacesRoutingService({ routeTable });
    await Promise.all([service.enrich(origin, [cafe]), service.enrich(origin, [hotel])]);
    expect(routeTable).toHaveBeenCalledTimes(2);
    expect(maximumActive).toBe(1);
  });
});
