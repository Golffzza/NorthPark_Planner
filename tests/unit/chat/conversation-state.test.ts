import { describe, expect, it, vi } from "vitest";

import {
  type ConversationStore,
  ConversationExpiredError,
  ConversationStateStore,
} from "@/lib/chat/orchestration/conversation-state";

describe("ConversationStateStore", () => {
  it("keeps messages for the owning user", () => {
    const store = new ConversationStateStore();
    const conversationId = store.createOrResolve(undefined, "user_1");

    store.appendTurn(conversationId, "user_1", "ถาม", "ตอบ");

    expect(store.createOrResolve(conversationId, "user_1")).toBe(conversationId);
    expect(store.getMessages(conversationId, "user_1")).toEqual([
      { role: "user", content: "ถาม" },
      { role: "assistant", content: "ตอบ" },
    ]);
  });

  it("stores structured context separately and returns a defensive copy", () => {
    const store = new ConversationStateStore();
    const conversationId = store.createOrResolve(undefined, "context_user");
    store.setContext(conversationId, "context_user", {
      userConstraints: { province: "เชียงใหม่", fatigue: "LOW" },
    });

    const context = store.getContext(conversationId, "context_user");
    context.userConstraints!.province = "เชียงราย";

    expect(store.getContext(conversationId, "context_user")).toEqual({
      userConstraints: { province: "เชียงใหม่", fatigue: "LOW" },
    });
  });

  it("does not allow another user to reuse a conversation id", () => {
    const store = new ConversationStateStore();
    const conversationId = store.createOrResolve(undefined, "user_1");

    expect(() => store.createOrResolve(conversationId, "user_2")).toThrow(
      ConversationExpiredError,
    );
  });

  it("rejects an unknown conversation id instead of silently replacing it", () => {
    const store = new ConversationStateStore();

    expect(() =>
      store.createOrResolve(
        "8ba2e9a6-53d5-4fc1-bc20-b2448bb3fb47",
        "user_1",
      ),
    ).toThrow(ConversationExpiredError);
  });

  it("implements the replaceable conversation store contract", () => {
    const store: ConversationStore = new ConversationStateStore();

    expect(store).toBeInstanceOf(ConversationStateStore);
  });

  it("keeps only the latest 16 messages", () => {
    const store = new ConversationStateStore({ maxHistoryMessages: 16 });
    const conversationId = store.createOrResolve(undefined, "history_user");

    for (let turn = 1; turn <= 10; turn += 1) {
      store.appendTurn(
        conversationId,
        "history_user",
        `question-${turn}`,
        `answer-${turn}`,
      );
    }

    const messages = store.getMessages(conversationId, "history_user");

    expect(messages).toHaveLength(16);
    expect(messages[0]).toEqual({ role: "user", content: "question-3" });
    expect(messages.at(-1)).toEqual({
      role: "assistant",
      content: "answer-10",
    });
  });

  it("removes expired conversations through explicit cleanup", () => {
    let now = 1_000;
    const store = new ConversationStateStore({
      now: () => now,
      ttlMs: 30 * 60 * 1000,
    });
    const conversationId = store.createOrResolve(undefined, "expiry_user");

    now += 30 * 60 * 1000 + 1;

    expect(store.cleanupExpired()).toBe(1);
    expect(() => store.getMessages(conversationId, "expiry_user")).toThrow(
      ConversationExpiredError,
    );
  });

  it("keeps active conversations when the route module is reloaded", async () => {
    vi.resetModules();
    const firstModule = await import(
      "@/lib/chat/orchestration/conversation-state"
    );
    const conversationId = firstModule.conversationStateStore.createOrResolve(
      undefined,
      "reload_user",
    );
    firstModule.conversationStateStore.appendTurn(
      conversationId,
      "reload_user",
      "ถามก่อน reload",
      "ตอบก่อน reload",
    );

    vi.resetModules();
    const secondModule = await import(
      "@/lib/chat/orchestration/conversation-state"
    );

    expect(
      secondModule.conversationStateStore.getMessages(
        conversationId,
        "reload_user",
      ),
    ).toHaveLength(2);
  });
});
