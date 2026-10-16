import { describe, expect, it } from "vitest";
import { InMemoryAssistantV2ConversationStore } from "@/lib/chat-v2/state/conversation-state";

describe("assistant V2 turn recovery", () => {
  it("rolls back a failed non-streaming turn and accepts the next message", async () => {
    const store = new InMemoryAssistantV2ConversationStore();
    const first = await store.runTurn(undefined, "owner", async (state) => {
      state.userConstraints = { ...state.userConstraints };
      return state.id;
    });
    await expect(store.runTurn(first, "owner", async (state) => {
      state.recommendedPark = { id: "old", slug: "old-park", name: "Old Park" };
      store.appendRecentTurn(state, "request", "incomplete answer");
      throw new Error("ASSISTANT_INCOMPLETE_RESPONSE");
    })).rejects.toThrow("ASSISTANT_INCOMPLETE_RESPONSE");

    const after = await store.runTurn(first, "owner", async (state) => ({
      recommendation: state.recommendedPark,
      messages: state.recentMessages.length,
    }));
    expect(after).toEqual({ recommendation: undefined, messages: 0 });
  });

  it("rolls back an aborted streaming lease without blocking later messages", async () => {
    const store = new InMemoryAssistantV2ConversationStore();
    const id = await store.runTurn(undefined, "owner", async (state) => state.id);
    const aborted = await store.beginTurn(id, "owner");
    aborted.state.recommendedPark = { id: "old", slug: "old-park", name: "Old Park" };
    aborted.release();

    const next = await store.beginTurn(id, "owner");
    expect(next.state.recommendedPark).toBeUndefined();
    next.release();
  });
});
