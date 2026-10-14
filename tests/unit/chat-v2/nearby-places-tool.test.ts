import { beforeEach, describe, expect, it, vi } from "vitest";

import { getParkCatalog } from "@/lib/chat/core/park-catalog";
import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";
import { createAssistantV2Tools } from "@/lib/chat-v2/tools";
import { createAssistantV2TurnContext } from "@/lib/chat-v2/tools/turn-context";

const search = vi.hoisted(() => vi.fn());
vi.mock("@/lib/services/nearby-places-service", async () => ({
  ...(await vi.importActual<typeof import("@/lib/services/nearby-places-service")>("@/lib/services/nearby-places-service")),
  searchNearbyPlacesForPark: search,
}));

const options = { toolCallId: "nearby", messages: [], context: {} };
function state(): AssistantV2ConversationState {
  const park = getParkCatalog().find((entry) => entry.slug === "lan-sang")!;
  return {
    id: "c1", ownerId: "u1", userConstraints: { province: "ตาก" },
    currentResults: [park], selectedPark: park, lastComparedParks: [],
    draftTrip: { park, durationDays: 1, companions: [], activities: [], days: [] },
    recentMessages: [], createdAt: 0, updatedAt: 0, expiresAt: 1000,
  };
}

describe("AI V2 nearby places tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search.mockResolvedValue({ status: "EMPTY", places: [] });
  });

  it("registers alongside existing tools and uses Selected Park without mutating state", async () => {
    const current = state();
    const before = structuredClone(current);
    const tools = createAssistantV2Tools(createAssistantV2TurnContext(current, "แถวนั้นมีร้านอาหารไหม"));
    expect(Object.keys(tools)).toEqual(expect.arrayContaining([
      "searchParks", "getParkInfo", "recommendParks", "compareParks", "getParkKnowledge", "selectPark", "planTrip", "findNearbyParks", "findNearbyPlaces",
    ]));
    const result = await tools.findNearbyPlaces.execute!({ categories: ["food"], radiusMeters: 3000, limit: 10 }, options);
    expect(result).toMatchObject({
      status: "EMPTY",
      interpretation: expect.stringContaining("ไม่พบรายการจาก OpenStreetMap"),
    });
    expect(search).toHaveBeenCalledWith("lan-sang", { categories: ["food"], radiusMeters: 3000, limit: 10 }, {}, undefined);
    expect(current).toEqual(before);
  });

  it("resolves a newly named park and refuses ambiguous references", async () => {
    const current = state();
    await createAssistantV2Tools(createAssistantV2TurnContext(current, "ดอยอินทนนท์มีที่พักใกล้ไหม"))
      .findNearbyPlaces.execute!({ categories: ["accommodation"], radiusMeters: 3000, limit: 10 }, options);
    expect(search).toHaveBeenCalledWith("doi-inthanon", expect.anything(), {}, undefined);
    const ambiguous = await createAssistantV2Tools(createAssistantV2TurnContext(current, "ดอยอินทนนท์กับลานสาง มีร้านใกล้ไหม"))
      .findNearbyPlaces.execute!({ categories: ["food"], radiusMeters: 3000, limit: 10 }, options);
    expect(ambiguous).toMatchObject({ status: "REFERENCE_ERROR", reason: "AMBIGUOUS_REFERENCE" });
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("isolates Overpass failures from conversation state", async () => {
    const current = state();
    const before = structuredClone(current);
    search.mockResolvedValue({ status: "UPSTREAM_TIMEOUT", places: [] });
    const result = await createAssistantV2Tools(createAssistantV2TurnContext(current, "แถวนี้มีที่พักไหม"))
      .findNearbyPlaces.execute!({ categories: ["accommodation"], radiusMeters: 3000, limit: 10 }, options);
    expect(result).toMatchObject({
      status: "UPSTREAM_TIMEOUT",
      interpretation: expect.stringContaining("ยังตรวจรายชื่อสถานที่รอบอุทยานไม่ได้"),
    });
    expect(current).toEqual(before);
  });

  it("passes named service places through without changing the selected park or draft", async () => {
    const current = state();
    const before = structuredClone(current);
    const place = {
      id: "osm:node:42", osmType: "node", osmId: 42,
      osmUrl: "https://www.openstreetmap.org/node/42", name: "Cafe fixture",
      category: "food", lat: 16.881, lng: 99.14,
      straightLineDistanceMeters: 120, roadDistanceMeters: 500,
      estimatedDrivingMinutes: 2, routeStatus: "OK", source: "OPENSTREETMAP",
    };
    search.mockResolvedValue({ status: "OK", places: [place] });
    const result = await createAssistantV2Tools(createAssistantV2TurnContext(current, "ร้านอาหารแถวนี้"))
      .findNearbyPlaces.execute!({ categories: ["food"], radiusMeters: 2000, limit: 5 }, options);
    expect(result).toMatchObject({ status: "OK", places: [place] });
    expect(current).toEqual(before);
  });

  it("asks for a place name before routing an ambiguous follow-up without calling Overpass", async () => {
    const current = state();
    const before = structuredClone(current);
    for (const message of ["ร้านที่เจอขับรถไปไกลไหม ใช้เวลากี่นาที", "ร้านนั้นไปไกลไหม", "ใช้เวลากี่นาที"]) {
      const result = await createAssistantV2Tools(createAssistantV2TurnContext(current, message))
        .findNearbyPlaces.execute!({ categories: ["food"], radiusMeters: 3000, limit: 10 }, options);
      expect(result).toMatchObject({ status: "PLACE_REFERENCE_REQUIRED", places: [] });
    }
    const pronounAsName = await createAssistantV2Tools(createAssistantV2TurnContext(current, "ร้านนั้นไปไกลไหม"))
      .findNearbyPlaces.execute!({ categories: ["food"], placeName: "ร้านนั้น", radiusMeters: 3000, limit: 10 }, options);
    expect(pronounAsName).toMatchObject({ status: "PLACE_REFERENCE_REQUIRED", places: [] });
    expect(search).not.toHaveBeenCalled();
    expect(current).toEqual(before);
  });

  it("returns a route only for an exact OSM place name supplied by the user", async () => {
    const current = state();
    const named = {
      id: "osm:node:42", osmType: "node", osmId: 42,
      osmUrl: "https://www.openstreetmap.org/node/42", name: "Nobel House",
      category: "accommodation", lat: 16.881, lng: 99.14,
      straightLineDistanceMeters: 120, roadDistanceMeters: 500,
      estimatedDrivingMinutes: 2, routeStatus: "OK", source: "OPENSTREETMAP",
    };
    search.mockResolvedValue({ status: "OK", places: [named, { ...named, id: "osm:node:43", name: "Other House" }] });
    const result = await createAssistantV2Tools(createAssistantV2TurnContext(current, "Nobel House ขับรถไปใช้เวลากี่นาที"))
      .findNearbyPlaces.execute!({ categories: ["accommodation"], placeName: "Nobel House", radiusMeters: 3000, limit: 10 }, options);
    expect(result).toMatchObject({ status: "OK", places: [named] });

    const invented = await createAssistantV2Tools(createAssistantV2TurnContext(current, "ร้านนั้นไปไกลไหม"))
      .findNearbyPlaces.execute!({ categories: ["food"], placeName: "Nobel House", radiusMeters: 3000, limit: 10 }, options);
    expect(invented).toMatchObject({ status: "PLACE_REFERENCE_REQUIRED" });
    expect(search).toHaveBeenCalledTimes(1);
  });
});
