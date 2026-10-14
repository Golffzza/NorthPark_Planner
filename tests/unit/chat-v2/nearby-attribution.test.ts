import { describe, expect, it } from "vitest";
import { nearbyAttributionSource } from "@/lib/chat-v2/application/nearby-attribution";

describe("nearby attribution", () => {
  it("uses the actual provider of successful nearby results", () => {
    expect(nearbyAttributionSource([{
      toolName: "findNearbyPlaces",
      output: { status: "OK", places: [{ id: "osm:node:1" }], meta: { source: "GEOAPIFY_PLACES" } },
    }])).toBe("GEOAPIFY_PLACES");
    expect(nearbyAttributionSource([{
      toolName: "findNearbyPlaces",
      output: { status: "OK", places: [{ id: "osm:node:1" }], meta: { source: "OPENSTREETMAP_OVERPASS" } },
    }])).toBe("OPENSTREETMAP_OVERPASS");
  });

  it("does not claim attribution for empty, failed, or unrelated tool results", () => {
    expect(nearbyAttributionSource([{ toolName: "findNearbyPlaces", output: {
      status: "EMPTY", places: [], meta: { source: "GEOAPIFY_PLACES" },
    } }])).toBeUndefined();
    expect(nearbyAttributionSource([{ toolName: "getParkInfo", output: {
      status: "OK", places: [{}], meta: { source: "GEOAPIFY_PLACES" },
    } }])).toBeUndefined();
  });
});
