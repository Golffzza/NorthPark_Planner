// ./lib/chat/orchestration/conversation-state.ts

import type {
  AssistantContext,
  ChatMessage,
} from "@/lib/chat/shared/contracts";

const DEFAULT_MAX_HISTORY_MESSAGES = 16;
const DEFAULT_CONVERSATION_TTL_MS = 30 * 60 * 1000;

export type ConversationRecord = {
  id: string;
  ownerId: string;
  messages: ChatMessage[];
  context: AssistantContext;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

export interface ConversationStore {
  createOrResolve(conversationId: string | undefined, ownerId: string): string;
  getMessages(conversationId: string, ownerId: string): ChatMessage[];
  getContext(conversationId: string, ownerId: string): AssistantContext;
  setContext(
    conversationId: string,
    ownerId: string,
    context: AssistantContext,
  ): void;
  appendTurn(
    conversationId: string,
    ownerId: string,
    userMessage: string,
    assistantMessage: string,
  ): void;
  cleanupExpired(): number;
}

type ConversationStateStoreOptions = {
  maxHistoryMessages?: number;
  ttlMs?: number;
  now?: () => number;
};

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export class ConversationExpiredError extends Error {
  constructor() {
    super("Conversation expired or is unavailable");
    this.name = "ConversationExpiredError";
  }
}

export class ConversationStateStore implements ConversationStore {
  private readonly conversations = new Map<string, ConversationRecord>();
  private readonly maxHistoryMessages: number;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(options: ConversationStateStoreOptions = {}) {
    this.maxHistoryMessages =
      options.maxHistoryMessages ??
      positiveInteger(
        process.env.CHATBOT_MAX_HISTORY_MESSAGES,
        DEFAULT_MAX_HISTORY_MESSAGES,
      );
    this.ttlMs =
      options.ttlMs ??
      positiveInteger(
        process.env.CHATBOT_CONVERSATION_TTL_MS,
        DEFAULT_CONVERSATION_TTL_MS,
      );
    this.now = options.now ?? Date.now;
  }

  createOrResolve(conversationId: string | undefined, ownerId: string): string {
    this.cleanupExpired();

    if (conversationId) {
      const conversation = this.getOwnedConversation(conversationId, ownerId);
      this.touch(conversation);
      return conversationId;
    }

    const id = crypto.randomUUID();
    const now = this.now();

    this.conversations.set(id, {
      id,
      ownerId,
      messages: [],
      context: {},
      createdAt: now,
      updatedAt: now,
      expiresAt: now + this.ttlMs,
    });

    return id;
  }

  getMessages(conversationId: string, ownerId: string): ChatMessage[] {
    this.cleanupExpired();
    const conversation = this.getOwnedConversation(conversationId, ownerId);
    this.touch(conversation);

    return [...conversation.messages];
  }

  getContext(conversationId: string, ownerId: string): AssistantContext {
    this.cleanupExpired();
    const conversation = this.getOwnedConversation(conversationId, ownerId);
    this.touch(conversation);
    return structuredClone(conversation.context);
  }

  setContext(
    conversationId: string,
    ownerId: string,
    context: AssistantContext,
  ): void {
    this.cleanupExpired();
    const conversation = this.getOwnedConversation(conversationId, ownerId);
    conversation.context = structuredClone(context);
    this.touch(conversation);
  }

  appendTurn(
    conversationId: string,
    ownerId: string,
    userMessage: string,
    assistantMessage: string,
  ): void {
    this.cleanupExpired();
    const conversation = this.getOwnedConversation(conversationId, ownerId);

    conversation.messages.push(
      { role: "user", content: userMessage },
      { role: "assistant", content: assistantMessage },
    );

    if (conversation.messages.length > this.maxHistoryMessages) {
      conversation.messages = conversation.messages.slice(
        -this.maxHistoryMessages,
      );
    }

    this.touch(conversation);
  }

  cleanupExpired(): number {
    const now = this.now();
    let removed = 0;

    for (const [id, conversation] of this.conversations) {
      if (conversation.expiresAt <= now) {
        this.conversations.delete(id);
        removed += 1;
      }
    }

    return removed;
  }

  private getOwnedConversation(
    conversationId: string,
    ownerId: string,
  ): ConversationRecord {
    const conversation = this.conversations.get(conversationId);

    if (!conversation || conversation.ownerId !== ownerId) {
      throw new ConversationExpiredError();
    }

    return conversation;
  }

  private touch(conversation: ConversationRecord): void {
    const now = this.now();
    conversation.updatedAt = now;
    conversation.expiresAt = now + this.ttlMs;
  }
}

const globalConversationState = globalThis as typeof globalThis & {
  northParkConversationStateStore?: ConversationStore;
};

export const conversationStateStore: ConversationStore =
  globalConversationState.northParkConversationStateStore ??
  new ConversationStateStore();

globalConversationState.northParkConversationStateStore =
  conversationStateStore;
