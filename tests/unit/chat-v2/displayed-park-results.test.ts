// ./displayed-park-results.test.ts

import { describe, expect, it } from "vitest";

import { getParkCatalog } from "@/lib/chat/core/park-catalog";
import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";
import { reconcileDisplayedParkResults } from "@/lib/chat-v2/application/displayed-park-results";
import { createConversationAwareAssistantV2Tools } from "@/lib/chat-v2/tools/conversation-tools";
import { createAssistantV2TurnContext } from "@/lib/chat-v2/tools/turn-context";

const parks = ["khun-khan", "doi-pha-hom-pok", "doi-suthep-pui"].map((slug) => {
  const park = getParkCatalog().find((entry) => entry.slug === slug);
  if (!park) throw new Error(`Missing fixture park: ${slug}`);
  return { id: park.id, slug: park.slug, name: park.name };
});

function makeState(): AssistantV2ConversationState {
  return {
    id: "conversation-1",
    ownerId: "user-1",
    userConstraints: { province: "เชียงใหม่" },
    currentResults: parks.map((park) => ({ ...park })),
    currentResultsOrderVerified: true,
    selectedPark: parks[0],
    lastComparedParks: [],
    draftTrip: {
      park: parks[0],
      durationDays: 1,
      companions: [],
      activities: [],
      days: [],
    },
    recentMessages: [],
    createdAt: 0,
    updatedAt: 0,
    expiresAt: 1000,
  };
}

const options = { toolCallId: "test-call", messages: [], context: {} };

describe("displayed park order", () => {
  it("retains all displayed parks as ambiguous information subjects, not only the first two", () => {
    const state = makeState();
    reconcileDisplayedParkResults(state,
      parks.map((park, index) => `${index + 1}. ${park.name}`).join("\n"),
      ["recommendParks"]);
    expect(state.informationParks?.map((park) => park.slug)).toEqual(parks.map((park) => park.slug));
    expect(state.activePark).toBeUndefined();
    expect(state.selectedPark?.slug).toBe(parks[0].slug);
  });

  it("keeps the verified displayed order after a count-only search", () => {
    const state = makeState();
    const before = state.currentResults.map((park) => park.slug);
    reconcileDisplayedParkResults(state, "ในเชียงใหม่มี 3 แห่งครับ", ["searchParks"], [{ operation: "COUNT" }]);
    expect(state.currentResults.map((park) => park.slug)).toEqual(before);
    expect(state.currentResultsOrderVerified).toBe(true);
  });
  it("uses a single actually displayed park as the next information subject", async () => {
    const state = makeState();
    reconcileDisplayedParkResults(state, `1. ${parks[2].name}`, ["recommendParks"]);
    expect(state.informationParks?.map((park) => park.slug)).toEqual(["doi-suthep-pui"]);
    const result = await createConversationAwareAssistantV2Tools(
      createAssistantV2TurnContext(state, "ที่นั่นอยู่จังหวัดอะไร"),
    ).getParkInfo.execute!({ topic: "province" }, options);
    expect(result).toMatchObject({ found: true, park: { slug: "doi-suthep-pui" } });
    expect(state.selectedPark?.slug).toBe("khun-khan");
  });
  it("selects the second park the user saw when Gemini omits the first recommendation", async () => {
    const state = makeState();
    reconcileDisplayedParkResults(
      state,
      `1. **${parks[1].name}**\n2. **${parks[2].name}**`,
      ["recommendParks"],
    );

    expect(state.currentResults.map((park) => park.slug)).toEqual([
      "doi-pha-hom-pok", "doi-suthep-pui",
    ]);
    const result = await createConversationAwareAssistantV2Tools(
      createAssistantV2TurnContext(state, "เลือกที่สอง"),
    ).selectPark.execute!({ position: 2, parkName: parks[1].name }, options);
    expect(result).toMatchObject({ selected: true, park: { slug: "doi-suthep-pui" } });
    expect(state.selectedPark?.slug).toBe("doi-suthep-pui");
  });

  it("selects the last displayed park when user says ไปอันสุดท้าย, without changing the draft", async () => {
    const state = makeState();
    reconcileDisplayedParkResults(
      state,
      `1. ${parks[1].name}\n2. ${parks[0].name}\n3. ${parks[2].name}`,
      ["recommendParks"],
    );
    const result = await createConversationAwareAssistantV2Tools(
      createAssistantV2TurnContext(state, "ไปอันสุดท้ายเลย แล้วมีที่พักใกล้ ๆ ไหม"),
    ).selectPark.execute!({ position: 3 }, options);
    expect(result).toMatchObject({ selected: true, park: { slug: "doi-suthep-pui" } });
    expect(state.activePark?.slug).toBe("doi-suthep-pui");
    expect(state.draftTrip?.park.slug).toBe("khun-khan");
  });

  it("rejects last-place selection when displayed order is unverified", async () => {
    const state = makeState();
    state.currentResultsOrderVerified = false;
    const result = await createConversationAwareAssistantV2Tools(
      createAssistantV2TurnContext(state, "ไปอันสุดท้าย"),
    ).selectPark.execute!({ position: 3 }, options);
    expect(result).toMatchObject({ selected: false, reason: "AMBIGUOUS" });
  });

  it("uses displayed order when Gemini reorders results", () => {
    const state = makeState();
    reconcileDisplayedParkResults(
      state,
      `1. ${parks[2].name}\n2. ${parks[0].name}\n3. ${parks[1].name}`,
      ["recommendParks"],
    );
    expect(state.currentResults.map((park) => park.slug)).toEqual([
      "doi-suthep-pui", "khun-khan", "doi-pha-hom-pok",
    ]);
  });

  it("ignores explanatory bullet points under a numbered park list", () => {
    const state = makeState();
    reconcileDisplayedParkResults(
      state,
      `1. **${parks[2].name}**\n- มีจุดชมวิว\n2. **${parks[1].name}**\n- มีเส้นทางเดิน`,
      ["recommendParks"],
    );
    expect(state.currentResultsOrderVerified).toBe(true);
    expect(state.currentResults.map((park) => park.slug)).toEqual([
      "doi-suthep-pui", "doi-pha-hom-pok",
    ]);
  });

  it("invalidates an earlier display mapping when a new list cannot be verified", async () => {
    const state = makeState();
    reconcileDisplayedParkResults(state, "มีหลายแห่งที่น่าสนใจครับ", ["searchParks"]);
    expect(state.currentResultsOrderVerified).toBe(false);
    expect(state.currentResults).toHaveLength(3);
    const result = await createConversationAwareAssistantV2Tools(
      createAssistantV2TurnContext(state, "เลือกที่สอง"),
    ).selectPark.execute!({ position: 2 }, options);
    expect(result).toMatchObject({ selected: false, reason: "AMBIGUOUS" });
    expect(state.selectedPark?.slug).toBe("khun-khan");
    expect(state.draftTrip?.park.slug).toBe("khun-khan");
    expect(state.userConstraints.province).toBe("เชียงใหม่");
  });

  it("replaces the old visible order with a later search result", () => {
    const state = makeState();
    reconcileDisplayedParkResults(
      state,
      `1. ${parks[2].name}\n2. ${parks[1].name}`,
      ["recommendParks"],
    );
    state.currentResults = [parks[0], parks[1]];
    reconcileDisplayedParkResults(
      state,
      `1. ${parks[1].name}\n2. ${parks[0].name}`,
      ["searchParks"],
    );
    expect(state.currentResultsOrderVerified).toBe(true);
    expect(state.currentResults.map((park) => park.slug)).toEqual([
      "doi-pha-hom-pok", "khun-khan",
    ]);
  });

  it("uses the displayed comparison list for a later ordinal", () => {
    const state = makeState();
    state.lastComparedParks = [parks[0], parks[2]];
    reconcileDisplayedParkResults(
      state,
      `1. ${parks[2].name}\n2. ${parks[0].name}`,
      ["compareParks"],
    );
    expect(state.currentResults.map((park) => park.slug)).toEqual([
      "doi-suthep-pui", "khun-khan",
    ]);
  });

  it("rejects a numbered list with a gap or unknown park", () => {
    const state = makeState();
    reconcileDisplayedParkResults(
      state,
      `1. ${parks[1].name}\n3. ${parks[2].name}`,
      ["recommendParks"],
    );
    expect(state.currentResultsOrderVerified).toBe(false);
    reconcileDisplayedParkResults(
      state,
      `1. ${parks[1].name}\n2. อุทยานแห่งชาติที่ไม่มีในผลค้นหา`,
      ["recommendParks"],
    );
    expect(state.currentResultsOrderVerified).toBe(false);
  });

  it("preserves displayed mapping on a follow-up with no new list", () => {
    const state = makeState();
    reconcileDisplayedParkResults(state, "ได้เลยครับ", ["getParkInfo"]);
    expect(state.currentResultsOrderVerified).toBe(true);
    expect(state.currentResults.map((park) => park.slug)).toEqual(parks.map((park) => park.slug));
  });

  it("allows an explicitly named choice while order is unverified", async () => {
    const state = makeState();
    reconcileDisplayedParkResults(state, "มีหลายแห่งที่น่าสนใจครับ", ["recommendParks"]);
    const result = await createConversationAwareAssistantV2Tools(
      createAssistantV2TurnContext(state, `เลือก${parks[2].name}`),
    ).selectPark.execute!({ parkName: parks[2].name }, options);
    expect(result).toMatchObject({ selected: true, park: { slug: "doi-suthep-pui" } });
  });

  it("does not resolve park facts or comparisons from an unverified position", async () => {
    const state = makeState();
    reconcileDisplayedParkResults(state, "มีหลายแห่งที่น่าสนใจครับ", ["recommendParks"]);
    const tools = createConversationAwareAssistantV2Tools(
      createAssistantV2TurnContext(state, "ที่สองอยู่จังหวัดอะไร"),
    );
    const info = await tools.getParkInfo.execute!({ position: 2, topic: "province" }, options);
    expect(info).toMatchObject({ status: "REFERENCE_ERROR", reason: "AMBIGUOUS_REFERENCE" });

    const comparison = await createConversationAwareAssistantV2Tools(
      createAssistantV2TurnContext(state, "เปรียบเทียบสองแห่งแรก"),
    ).compareParks.execute!({ reference: "FIRST_TWO_RESULTS" }, options);
    expect(comparison).toMatchObject({ status: "REFERENCE_ERROR", reason: "AMBIGUOUS_REFERENCE" });
    expect(state.selectedPark?.slug).toBe("khun-khan");
    expect(state.draftTrip?.park.slug).toBe("khun-khan");
  });
});
