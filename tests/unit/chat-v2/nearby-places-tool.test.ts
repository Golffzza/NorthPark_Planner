import { beforeEach, describe, expect, it, vi } from "vitest";

import { getParkCatalog } from "@/lib/chat/core/park-catalog";
import { reconcileDisplayedParkResults } from "@/lib/chat-v2/application/displayed-park-results";
import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";
import { createAssistantV2Tools } from "@/lib/chat-v2/tools";
import { createAssistantV2TurnContext } from "@/lib/chat-v2/tools/turn-context";
import type { NearbyPlace } from "@/lib/services/nearby-places-service";

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
    expect(search).toHaveBeenCalledWith("lan-sang", { categories: ["food"], radiusMeters: 3000, limit: 20 }, {}, undefined);
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

  it("selects the verified third displayed park and searches accommodation in either tool order", async () => {
    const parks = ["doi-pha-hom-pok", "doi-suthep-pui", "khun-khan"].map((slug) =>
      getParkCatalog().find((entry) => entry.slug === slug)!);
    for (const selectionFirst of [true, false]) {
      const current = state();
      current.currentResults = parks;
      current.currentResultsOrderVerified = true;
      const beforeDraft = structuredClone(current.draftTrip);
      const tools = createAssistantV2Tools(createAssistantV2TurnContext(current, "ไปอันที่สามอะ มีที่พักใกล้ๆไหม"));
      const select = () => tools.selectPark.execute!({ position: 3 }, options);
      const nearby = () => tools.findNearbyPlaces.execute!({ categories: ["food"], radiusMeters: 3000, limit: 10 }, options);
      const result = selectionFirst ? (await select(), await nearby()) : await nearby();
      if (!selectionFirst) {
        expect(current.selectedPark?.slug).toBe("khun-khan");
        await select();
      }
      expect(result).toMatchObject({ status: "EMPTY" });
      expect(search).toHaveBeenLastCalledWith("khun-khan", {
        categories: ["accommodation"], radiusMeters: 3000, limit: 20,
      }, {}, undefined);
      expect(current.selectedPark?.slug).toBe("khun-khan");
      expect(current.draftTrip).toEqual(beforeDraft);
    }
  });

  it("uses the displayed order rather than the recommendation ranking", async () => {
    const current = state();
    current.currentResults = ["khun-khan", "doi-pha-hom-pok", "doi-suthep-pui"].map((slug) =>
      getParkCatalog().find((entry) => entry.slug === slug)!);
    reconcileDisplayedParkResults(current,
      `1. ${current.currentResults[1].name}\n2. ${current.currentResults[2].name}\n3. ${current.currentResults[0].name}`,
      ["recommendParks"]);
    expect(current.currentResults.map((park) => park.slug)).toEqual(["doi-pha-hom-pok", "doi-suthep-pui", "khun-khan"]);
    const result = await createAssistantV2Tools(createAssistantV2TurnContext(current, "ไปอันที่สามอะ มีที่พักใกล้ๆไหม"))
      .findNearbyPlaces.execute!({ categories: ["accommodation"], radiusMeters: 3000, limit: 10 }, options);
    expect(result).toMatchObject({ status: "EMPTY", searchedPark: { slug: "khun-khan" } });
    expect(current.selectedPark?.slug).toBe("khun-khan");
  });

  it("can search a numbered park without treating the question as a selection", async () => {
    const current = state();
    current.currentResults = ["doi-pha-hom-pok", "doi-suthep-pui", "khun-khan"].map((slug) =>
      getParkCatalog().find((entry) => entry.slug === slug)!);
    current.currentResultsOrderVerified = true;
    const selectedBefore = current.selectedPark;
    const result = await createAssistantV2Tools(createAssistantV2TurnContext(current, "ที่สามมีที่พักใกล้ไหม"))
      .findNearbyPlaces.execute!({ categories: ["accommodation"], radiusMeters: 3000, limit: 10 }, options);
    expect(result).toMatchObject({ status: "EMPTY", searchedPark: { slug: "khun-khan" } });
    expect(current.selectedPark).toEqual(selectedBefore);
  });

  it("does not guess an unverified displayed ordinal or change the selection", async () => {
    const current = state();
    current.currentResults = ["doi-pha-hom-pok", "doi-suthep-pui", "khun-khan"].map((slug) =>
      getParkCatalog().find((entry) => entry.slug === slug)!);
    current.currentResultsOrderVerified = false;
    const before = structuredClone(current);
    const tools = createAssistantV2Tools(createAssistantV2TurnContext(current, "ไปอันที่สามอะ มีที่พักใกล้ๆไหม"));
    expect(await tools.findNearbyPlaces.execute!({ categories: ["accommodation"], radiusMeters: 3000, limit: 10 }, options))
      .toMatchObject({ status: "REFERENCE_ERROR", reason: "AMBIGUOUS_REFERENCE" });
    expect(await tools.selectPark.execute!({ position: 3 }, options))
      .toMatchObject({ selected: false, reason: "AMBIGUOUS" });
    expect(search).not.toHaveBeenCalled();
    expect(current).toEqual(before);
  });

  it("rejects two possible park positions in one nearby request", async () => {
    const current = state();
    current.currentResults = ["doi-pha-hom-pok", "doi-suthep-pui", "khun-khan"].map((slug) =>
      getParkCatalog().find((entry) => entry.slug === slug)!);
    current.currentResultsOrderVerified = true;
    const before = structuredClone(current);
    const result = await createAssistantV2Tools(createAssistantV2TurnContext(current, "ไปอันที่สองหรืออันที่สาม มีที่พักใกล้ไหม"))
      .findNearbyPlaces.execute!({ categories: ["accommodation"], radiusMeters: 3000, limit: 10 }, options);
    expect(result).toMatchObject({ status: "REFERENCE_ERROR", reason: "AMBIGUOUS_REFERENCE" });
    expect(search).not.toHaveBeenCalled();
    expect(current).toEqual(before);
  });

  it("uses food for a coffee discovery but does not select a park without a choice", async () => {
    const current = state();
    const before = structuredClone(current);
    await createAssistantV2Tools(createAssistantV2TurnContext(current, "แนะนำร้านกาแฟแถวนี้"))
      .findNearbyPlaces.execute!({ categories: ["accommodation"], radiusMeters: 3000, limit: 10 }, options);
    expect(search).toHaveBeenCalledWith("lan-sang", expect.objectContaining({ categories: ["food"] }), {}, undefined);
    expect(current).toEqual(before);
  });

  it("uses the last discussed park for nearby questions without changing selection or draft", async () => {
    const current = state();
    const discussed = getParkCatalog().find((entry) => entry.slug === "doi-inthanon")!;
    current.informationParks = [discussed];
    const beforeDraft = structuredClone(current.draftTrip);
    search.mockResolvedValue({ status: "OK", places: [] });
    const result = await createAssistantV2Tools(createAssistantV2TurnContext(current, "แถวนั้นมีร้านอาหารไหม"))
      .findNearbyPlaces.execute!({ categories: ["food"], radiusMeters: 3000, limit: 10 }, options);
    expect(result).toMatchObject({ status: "OK", searchedPark: { slug: "doi-inthanon" } });
    expect(search).toHaveBeenCalledWith("doi-inthanon", expect.anything(), {}, undefined);
    expect(current.selectedPark?.slug).toBe("lan-sang");
    expect(current.draftTrip).toEqual(beforeDraft);
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
    expect(current.selectedPark).toEqual(before.selectedPark);
    expect(current.draftTrip).toEqual(before.draftTrip);
    expect(current.informationParks?.[0].slug).toBe("lan-sang");
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

  it("resolves the first displayed restaurant without repeating a provider search", async () => {
    const current = state();
    const first: NearbyPlace = {
      id: "osm:node:42", osmType: "node", osmId: 42,
      osmUrl: "https://www.openstreetmap.org/node/42", name: "Sansuk cafe",
      category: "food", lat: 18.8, lng: 98.9,
      straightLineDistanceMeters: 273, roadDistanceMeters: 510,
      estimatedDrivingMinutes: 2, routeStatus: "OK", source: "OPENSTREETMAP",
    };
    current.nearbyResults = {
      park: current.selectedPark!, providerSource: "GEOAPIFY_PLACES", places: [first],
    };
    const before = structuredClone(current.draftTrip);
    const answer = await createAssistantV2Tools(createAssistantV2TurnContext(current, "ร้านแรกอยู่ไกลแค่ไหน"))
      .findNearbyPlaces.execute!({ categories: ["food"], placeName: "Sansuk cafe", radiusMeters: 3000, limit: 10 }, options);
    expect(answer).toMatchObject({ status: "OK", referenceResolution: "DISPLAYED_RESULT", places: [first] });
    expect(search).not.toHaveBeenCalled();
    expect(current.draftTrip).toEqual(before);
    expect(current.selectedPark?.slug).toBe("lan-sang");
  });

  it("resolves a named or numbered Nearby place without Selected Park or park-result ordinals", async () => {
    const current = state();
    const park = current.selectedPark!;
    const first: NearbyPlace = {
      id: "osm:node:50", osmType: "node", osmId: 50,
      osmUrl: "https://www.openstreetmap.org/node/50", name: "Cafe A",
      category: "food", lat: 18.8, lng: 98.9, straightLineDistanceMeters: 100,
      routeStatus: "NO_ROUTE", source: "OPENSTREETMAP",
    };
    const second = { ...first, id: "osm:node:51", osmId: 51, name: "Cafe B" };
    current.nearbyResults = { park, providerSource: "GEOAPIFY_PLACES", places: [first, second] };
    current.selectedPark = undefined;
    current.currentResults = getParkCatalog().filter((entry) => entry.slug !== park.slug).slice(0, 2);
    current.currentResultsOrderVerified = true;
    const numbered = await createAssistantV2Tools(createAssistantV2TurnContext(current, "ร้านที่สองอยู่ไกลไหม"))
      .findNearbyPlaces.execute!({ categories: ["food"], radiusMeters: 3000, limit: 10 }, options);
    expect(numbered).toMatchObject({ status: "OK", places: [{ id: second.id }] });
    const bareNumbered = await createAssistantV2Tools(createAssistantV2TurnContext(current, "อันที่สองห่างจากอุทยานเท่าไร"))
      .findNearbyPlaces.execute!({ categories: ["food"], radiusMeters: 3000, limit: 10 }, options);
    expect(bareNumbered).toMatchObject({ status: "OK", referenceResolution: "DISPLAYED_RESULT", places: [{ id: second.id }] });
    const named = await createAssistantV2Tools(createAssistantV2TurnContext(current, "Cafe A ใช้เวลากี่นาที"))
      .findNearbyPlaces.execute!({ categories: ["food"], radiusMeters: 3000, limit: 10 }, options);
    expect(named).toMatchObject({ status: "OK", places: [{ id: first.id }] });
    expect(search).not.toHaveBeenCalled();
    expect(current.selectedPark).toBeUndefined();
  });

  it("does not reuse the old Nearby list after the selected park changes", async () => {
    const current = state();
    const oldPark = current.selectedPark!;
    current.nearbyResults = {
      park: oldPark, providerSource: "GEOAPIFY_PLACES", places: [{
        id: "osm:node:60", osmType: "node", osmId: 60,
        osmUrl: "https://www.openstreetmap.org/node/60", name: "Cafe A",
        category: "food", lat: 18.8, lng: 98.9,
        straightLineDistanceMeters: 100, routeStatus: "NO_ROUTE", source: "OPENSTREETMAP",
      }],
    };
    current.selectedPark = getParkCatalog().find((entry) => entry.slug === "doi-inthanon")!;
    const answer = await createAssistantV2Tools(createAssistantV2TurnContext(current, "ร้านแรกอยู่ไกลไหม"))
      .findNearbyPlaces.execute!({ categories: ["food"], radiusMeters: 3000, limit: 10 }, options);
    expect(answer).toMatchObject({ status: "PLACE_REFERENCE_REQUIRED" });
    const explicitlyNamed = await createAssistantV2Tools(createAssistantV2TurnContext(current, "Cafe A อยู่ไกลไหม"))
      .findNearbyPlaces.execute!({ categories: ["food"], radiusMeters: 3000, limit: 10 }, options);
    expect(explicitlyNamed).toMatchObject({ status: "OK", places: [{ name: "Cafe A" }] });
    expect(search).not.toHaveBeenCalled();
  });

  it("does not use a previous park's displayed restaurant after only the information topic changes", async () => {
    const current = state();
    const oldPark = current.selectedPark!;
    current.nearbyResults = {
      park: oldPark, providerSource: "GEOAPIFY_PLACES", places: [{
        id: "osm:node:70", osmType: "node", osmId: 70,
        osmUrl: "https://www.openstreetmap.org/node/70", name: "Old park cafe",
        category: "food", lat: 16.8, lng: 99.1,
        straightLineDistanceMeters: 170, roadDistanceMeters: 900,
        estimatedDrivingMinutes: 3, routeStatus: "OK", source: "OPENSTREETMAP",
      }],
    };
    const beforeDraft = structuredClone(current.draftTrip);
    expect(await createAssistantV2Tools(createAssistantV2TurnContext(current, "ดอยอินทนนท์อยู่จังหวัดอะไร"))
      .getParkInfo.execute!({ topic: "province" }, options))
      .toMatchObject({ found: true, park: { slug: "doi-inthanon" } });
    const followup = await createAssistantV2Tools(createAssistantV2TurnContext(current, "ร้านแรกอยู่ไกลแค่ไหน"))
      .findNearbyPlaces.execute!({ categories: ["food"], radiusMeters: 3000, limit: 10 }, options);
    expect(followup).toMatchObject({ status: "PLACE_REFERENCE_REQUIRED", places: [] });
    expect(search).not.toHaveBeenCalled();
    expect(current.selectedPark?.slug).toBe(oldPark.slug);
    expect(current.draftTrip).toEqual(beforeDraft);
  });
});
