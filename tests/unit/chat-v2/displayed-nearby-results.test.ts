import { describe, expect, it } from "vitest";

import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";
import type { NearbyPlace } from "@/lib/services/nearby-places-service";
import {
  asksForDisplayedNearbyPlace,
  finalizeNearbyFollowupAnswer,
  isNearbyDiscoveryQuestion,
  isNearbyDistanceQuestion,
  reconcileDisplayedNearbyResults,
  resolveDisplayedNearbyPlace,
} from "@/lib/chat-v2/application/displayed-nearby-results";

const park = { id: "park-1", slug: "doi-suthep-pui", name: "ดอยสุเทพ-ปุย" };
const place = (id: string, name: string, category: NearbyPlace["category"], routeStatus: NearbyPlace["routeStatus"] = "OK"): NearbyPlace => ({
  id, osmType: "node", osmId: Number(id.split(":").at(-1)),
  osmUrl: `https://www.openstreetmap.org/node/${id.split(":").at(-1)}`,
  name, category, lat: 18.8, lng: 98.9, straightLineDistanceMeters: 273,
  ...(routeStatus === "OK" ? { roadDistanceMeters: 510, estimatedDrivingMinutes: 2 } : {}),
  routeStatus, source: "OPENSTREETMAP",
});
const cafe = place("osm:node:1", "Sansuk cafe", "food");
const restaurant = place("osm:node:2", "ร้านดอย", "food", "NO_ROUTE");
const hidden = place("osm:node:3", "ร้านที่ไม่แสดง", "food");
const hotel = place("osm:node:4", "Nobel House", "accommodation");

function state(): AssistantV2ConversationState {
  return {
    id: "conversation-1", ownerId: "user-1", userConstraints: {},
    currentResults: [], selectedPark: park, lastComparedParks: [],
    draftTrip: { draftId: "draft-1", revision: 3, park, durationDays: 1, companions: [], activities: [], days: [] },
    recentMessages: [], createdAt: 0, updatedAt: 0, expiresAt: 1000,
  };
}

const result = (places: NearbyPlace[]) => [{
  toolName: "findNearbyPlaces",
  output: { status: "OK", places, searchedPark: park, meta: { source: "GEOAPIFY_PLACES" } },
}];

describe("displayed Nearby result context", () => {
  it("distinguishes nearby discovery from a displayed place distance follow-up", () => {
    for (const question of ["มีร้านอาหารใกล้ๆไหม", "มีที่พักใกล้อุทยานไหม", "แนะนำร้านกาแฟแถวนี้", "ไปอันที่สามอะ มีที่พักใกล้ๆไหม"]) {
      expect(isNearbyDiscoveryQuestion(question)).toBe(true);
      expect(isNearbyDistanceQuestion(question)).toBe(false);
      expect(asksForDisplayedNearbyPlace(question)).toBe(false);
    }
    for (const question of ["ร้านนั้นไกลไหม", "ที่พักแรกขับรถกี่นาที", "อันที่สองห่างจากอุทยานเท่าไร"]) {
      expect(isNearbyDiscoveryQuestion(question)).toBe(false);
      expect(isNearbyDistanceQuestion(question)).toBe(true);
      expect(asksForDisplayedNearbyPlace(question)).toBe(true);
    }
  });

  it("explains an empty accommodation search without inventing absence or driving distance", () => {
    const answer = finalizeNearbyFollowupAnswer("ขับรถไปไม่ได้ครับ", [{
      toolName: "findNearbyPlaces",
      output: { status: "EMPTY", places: [], park: { ...park, name: "อุทยานแห่งชาติขุนขาน", slug: "khun-khan" },
        meta: { radiusMeters: 3000, categories: ["accommodation"] } },
    }], "ไปอันที่สามอะ มีที่พักใกล้ๆไหม");
    expect(answer).toContain("ขุนขาน");
    expect(answer).toContain("ที่พัก");
    expect(answer).toContain("3,000");
    expect(answer).toContain("จุดอ้างอิง");
    expect(answer).not.toContain("ระยะทางขับรถ");
    expect(answer).not.toContain("ไม่มีที่พัก");
  });

  it("asks for the park name after an unverified ordinal instead of trusting the drafted answer", () => {
    const answer = finalizeNearbyFollowupAnswer("ขุนขานมีที่พักครับ", [{
      toolName: "findNearbyPlaces", output: { status: "REFERENCE_ERROR", reason: "AMBIGUOUS_REFERENCE" },
    }], "ไปอันที่สามอะ มีที่พักใกล้ๆไหม");
    expect(answer).toContain("ขอชื่ออุทยาน");
    expect(answer).not.toContain("ขุนขาน");
  });

  it("stores only the places and order actually shown in the final answer", () => {
    const current = state();
    const beforeDraft = structuredClone(current.draftTrip);
    reconcileDisplayedNearbyResults(current, "1. **ร้านดอย** ไม่มีเส้นทางรถยนต์\n2. **Sansuk cafe**", result([cafe, restaurant, hidden]));
    expect(current.nearbyResults?.places.map((item) => item.id)).toEqual([restaurant.id, cafe.id]);
    expect(current.nearbyResults?.park.slug).toBe(park.slug);
    expect(current.selectedPark).toEqual(park);
    expect(current.draftTrip).toEqual(beforeDraft);
    expect(resolveDisplayedNearbyPlace(current, "ร้านแรกอยู่ไกลแค่ไหน", park.slug)?.id).toBe(restaurant.id);
    expect(resolveDisplayedNearbyPlace(current, "ร้านที่สองอยู่ไกลแค่ไหน", park.slug)?.id).toBe(cafe.id);
    expect(resolveDisplayedNearbyPlace(current, "ร้านที่ไม่แสดงอยู่ไกลไหม", park.slug)).toBeUndefined();
    expect(resolveDisplayedNearbyPlace(current, "อันที่สองห่างจากอุทยานเท่าไร", park.slug)?.id).toBe(cafe.id);
  });

  it("clears the old list when a later search shows different places or no verifiable list", () => {
    const current = state();
    reconcileDisplayedNearbyResults(current, "1. Sansuk cafe\n2. ร้านดอย", result([cafe, restaurant]));
    reconcileDisplayedNearbyResults(current, "1. Nobel House", result([hotel]));
    expect(resolveDisplayedNearbyPlace(current, "ร้านแรกอยู่ไกลไหม", park.slug)).toBeUndefined();
    expect(resolveDisplayedNearbyPlace(current, "ที่พักนั้นอยู่ไกลไหม", park.slug)?.id).toBe(hotel.id);
    reconcileDisplayedNearbyResults(current, "มีที่พักใกล้ ๆ ครับ", result([hotel]));
    expect(current.nearbyResults).toBeUndefined();
  });

  it("keeps a uniquely named single place shown in prose for a singular follow-up", () => {
    const current = state();
    reconcileDisplayedNearbyResults(current, "พบที่พัก Nobel House ใกล้อุทยานครับ", result([hotel, hidden]));
    expect(current.nearbyResults?.places.map((item) => item.name)).toEqual(["Nobel House"]);
    expect(resolveDisplayedNearbyPlace(current, "ที่พักนั้นขับรถไปไกลไหม", park.slug)?.id).toBe(hotel.id);
  });

  it("resolves a singular category reference only within that category", () => {
    const current = state();
    reconcileDisplayedNearbyResults(current, "1. Sansuk cafe\n2. Nobel House", result([cafe, hotel]));
    expect(resolveDisplayedNearbyPlace(current, "ที่พักนั้นไปไกลไหม", park.slug)?.id).toBe(hotel.id);
    expect(resolveDisplayedNearbyPlace(current, "ร้านนั้นไปไกลไหม", park.slug)?.id).toBe(cafe.id);
    expect(resolveDisplayedNearbyPlace(current, "ที่นั่นไปไกลไหม", park.slug)).toBeUndefined();
  });

  it("rejects ambiguous pronouns, duplicate names, wrong park and failed provider results", () => {
    const current = state();
    reconcileDisplayedNearbyResults(current, "1. Sansuk cafe\n2. ร้านดอย", result([cafe, restaurant]));
    expect(resolveDisplayedNearbyPlace(current, "ร้านนั้นไกลไหม", park.slug)).toBeUndefined();
    expect(resolveDisplayedNearbyPlace(current, "ร้านแรกไกลไหม", "lan-sang")).toBeUndefined();
    reconcileDisplayedNearbyResults(current, "ขอชื่อร้านก่อนครับ", [{
      toolName: "findNearbyPlaces", output: { status: "PLACE_REFERENCE_REQUIRED", places: [] },
    }]);
    expect(resolveDisplayedNearbyPlace(current, "ร้านที่สองไกลไหม", park.slug)?.id).toBe(restaurant.id);
    reconcileDisplayedNearbyResults(current, "ไม่พบผลลัพธ์", [{ toolName: "findNearbyPlaces", output: { status: "EMPTY", places: [] } }]);
    expect(current.nearbyResults).toBeUndefined();
    reconcileDisplayedNearbyResults(current, "1. Sansuk cafe", result([
      cafe, { ...cafe, id: "osm:node:99", osmId: 99 },
    ]));
    expect(current.nearbyResults).toBeUndefined();
  });

  it("uses only confirmed OSRM fields and overrides a rejected tool answer", () => {
    expect(finalizeNearbyFollowupAnswer("ร้านแรกห่าง 510 เมตร", [{
      toolName: "findNearbyPlaces", output: { status: "PLACE_REFERENCE_REQUIRED", places: [] },
    }])).toContain("ขอชื่อ");
    expect(finalizeNearbyFollowupAnswer("ห่าง 510 เมตร", [{
      toolName: "findNearbyPlaces", output: { status: "OK", referenceResolution: "DISPLAYED_RESULT", places: [cafe] },
    }])).toContain("ระยะทางเส้นตรง 273 เมตร");
    expect(finalizeNearbyFollowupAnswer("ห่าง 510 เมตร", [{
      toolName: "findNearbyPlaces", output: { status: "OK", referenceResolution: "DISPLAYED_RESULT", places: [cafe] },
    }])).toContain("ระยะขับรถตาม OSRM 510 เมตร");
    const noRoute = finalizeNearbyFollowupAnswer("ขับรถ 510 เมตร", [{
      toolName: "findNearbyPlaces", output: { status: "OK", referenceResolution: "DISPLAYED_RESULT", places: [restaurant] },
    }], "อันที่สองห่างจากอุทยานเท่าไร");
    expect(noRoute).toContain("ยังไม่มีข้อมูลเส้นทางขับรถ");
    expect(noRoute).toContain("ระยะทางเส้นตรง 273 เมตร");
    expect(noRoute).not.toContain("510");
    const providerFailure = finalizeNearbyFollowupAnswer("ขับรถไป 510 เมตร", [{
      toolName: "findNearbyPlaces", output: { status: "UPSTREAM_TIMEOUT", places: [] },
    }], "ร้านนั้นขับรถไปไกลไหม");
    expect(providerFailure).toContain("ยังตรวจ");
    expect(providerFailure).not.toContain("510");
  });
});
