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

  it("serializes simultaneous turns for one conversation without losing updates", async () => {
    const store = new InMemoryAssistantV2ConversationStore();
    const id = await store.runTurn(undefined, "owner", async (state) => state.id);
    let beginFirst!: () => void;
    const firstStarted = new Promise<void>((resolve) => { beginFirst = resolve; });
    let finishFirst!: () => void;
    const firstMayFinish = new Promise<void>((resolve) => { finishFirst = resolve; });
    const first = store.runTurn(id, "owner", async (state) => {
      beginFirst();
      await firstMayFinish;
      store.appendRecentTurn(state, "one", "first answer");
    });
    await firstStarted;
    let secondStarted = false;
    const second = store.runTurn(id, "owner", async (state) => {
      secondStarted = true;
      expect(state.recentMessages.map((item) => item.content)).toEqual(["one", "first answer"]);
      store.appendRecentTurn(state, "two", "second answer");
    });
    expect(secondStarted).toBe(false);
    finishFirst();
    await Promise.all([first, second]);
    const result = await store.runTurn(id, "owner", async (state) =>
      state.recentMessages.map((item) => item.content));
    expect(result).toEqual(["one", "first answer", "two", "second answer"]);
  });

  it("does not persist a failed turn before a queued request", async () => {
    const store = new InMemoryAssistantV2ConversationStore();
    const id = await store.runTurn(undefined, "owner", async (state) => state.id);
    let started!: () => void;
    const ready = new Promise<void>((resolve) => { started = resolve; });
    let rejectFirst!: (error: Error) => void;
    const failed = new Promise<void>((_, reject) => { rejectFirst = reject; });
    const first = store.runTurn(id, "owner", async (state) => {
      state.recommendedPark = { id: "temp", slug: "temporary", name: "Temporary" };
      started();
      await failed;
    });
    await ready;
    const second = store.runTurn(id, "owner", async (state) => {
      expect(state.recommendedPark).toBeUndefined();
      store.appendRecentTurn(state, "retry", "success");
    });
    rejectFirst(new Error("provider timeout"));
    await expect(first).rejects.toThrow("provider timeout");
    await second;
    const messages = await store.runTurn(id, "owner", async (state) => state.recentMessages);
    expect(messages.map((item) => item.content)).toEqual(["retry", "success"]);
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
