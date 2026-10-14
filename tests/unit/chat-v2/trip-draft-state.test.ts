import { describe, expect, it } from "vitest";

import { InMemoryAssistantV2ConversationStore, setSelectedPark } from "@/lib/chat-v2/state/conversation-state";

const first = { id: "park-a", slug: "park-a", name: "Park A" };
const second = { id: "park-b", slug: "park-b", name: "Park B" };

describe("AI draft state across chat modes", () => {
  it("keeps a draft across ordinary runTurn and beginTurn commits", async () => {
    const store = new InMemoryAssistantV2ConversationStore();
    const id = await store.runTurn(undefined, "owner-1", async (state) => {
      state.draftTrip = { draftId: "draft-1", revision: 1, park: first, durationDays: 1, companions: [], activities: [], days: [{ day: 1, title: "Day 1", items: [] }] };
      return state.id;
    });

    const streamTurn = await store.beginTurn(id, "owner-1");
    try {
      setSelectedPark(streamTurn.state, second);
      streamTurn.commit();
    } finally { streamTurn.release(); }

    const result = await store.runTurn(id, "owner-1", async (state) => ({ selected: state.selectedPark?.slug, draft: state.draftTrip?.park.slug }));
    expect(result).toEqual({ selected: "park-b", draft: "park-a" });
  });

  it("does not allow another owner to access the draft", async () => {
    const store = new InMemoryAssistantV2ConversationStore();
    const id = await store.runTurn(undefined, "owner-1", async (state) => state.id);
    await expect(store.runTurn(id, "owner-2", async (state) => state.draftTrip)).rejects.toThrow();
  });
});
