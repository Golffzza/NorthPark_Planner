// ./lib/chat-v2/state/conversation-state.ts

import type {
  AssistantConstraints,
  ParkReference,
} from "@/lib/chat/shared/contracts";

const DEFAULT_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_RECENT_MESSAGES = 6;
const DEFAULT_MAX_RECENT_MESSAGE_LENGTH = 240;

export type AssistantV2RecentMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantV2ConversationState = {
  id: string;
  ownerId: string;
  userConstraints: AssistantConstraints;
  currentResults: ParkReference[];
  selectedPark?: ParkReference;
  lastComparedParks: ParkReference[];
  recentMessages: AssistantV2RecentMessage[];
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

export class AssistantV2ConversationExpiredError extends Error {
  constructor() {
    super("Conversation expired or is unavailable");
    this.name = "AssistantV2ConversationExpiredError";
  }
}

type ConversationStateStoreOptions = {
  ttlMs?: number;
  maxRecentMessages?: number;
  maxRecentMessageLength?: number;
  now?: () => number;
};

export interface AssistantV2ConversationStore {
  runTurn<T>(
    conversationId: string | undefined,
    ownerId: string,
    operation: (state: AssistantV2ConversationState) => Promise<T>,
  ): Promise<T>;

  beginTurn(
    conversationId: string | undefined,
    ownerId: string,
  ): Promise<AssistantV2ConversationTurnLease>;

  appendRecentTurn(
    state: AssistantV2ConversationState,
    userMessage: string,
    assistantMessage: string,
  ): void;

  cleanupExpired(): number;
}

export type AssistantV2ConversationTurnLease = {
  state: AssistantV2ConversationState;
  commit(): void;
  release(): void;
};

function cloneParkReference(park: ParkReference): ParkReference {
  return { id: park.id, slug: park.slug, name: park.name };
}

function cloneState(
  state: AssistantV2ConversationState,
): AssistantV2ConversationState {
  return {
    ...state,
    userConstraints: structuredClone(state.userConstraints),
    currentResults: state.currentResults.map(cloneParkReference),
    ...(state.selectedPark
      ? { selectedPark: cloneParkReference(state.selectedPark) }
      : {}),
    lastComparedParks: state.lastComparedParks.map(cloneParkReference),
    recentMessages: state.recentMessages.map((message) => ({ ...message })),
  };
}

function trimRecentContent(content: string, maxLength: number): string {
  const value = content.trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export class InMemoryAssistantV2ConversationStore implements AssistantV2ConversationStore {
  private readonly conversations = new Map<
    string,
    AssistantV2ConversationState
  >();
  private readonly turnLocks = new Map<string, Promise<void>>();
  private readonly ttlMs: number;
  private readonly maxRecentMessages: number;
  private readonly maxRecentMessageLength: number;
  private readonly now: () => number;

  constructor(options: ConversationStateStoreOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxRecentMessages =
      options.maxRecentMessages ?? DEFAULT_MAX_RECENT_MESSAGES;
    this.maxRecentMessageLength =
      options.maxRecentMessageLength ?? DEFAULT_MAX_RECENT_MESSAGE_LENGTH;
    this.now = options.now ?? Date.now;
  }

  async runTurn<T>(
    conversationId: string | undefined,
    ownerId: string,
    operation: (state: AssistantV2ConversationState) => Promise<T>,
  ): Promise<T> {
    this.cleanupExpired();
    const id = conversationId ?? this.create(ownerId).id;
    const previousTurn = this.turnLocks.get(id) ?? Promise.resolve();
    let releaseTurn: () => void = () => {};
    const currentTurn = new Promise<void>((resolve) => {
      releaseTurn = resolve;
    });
    const lockTail = previousTurn.then(() => currentTurn);
    this.turnLocks.set(id, lockTail);

    await previousTurn;

    try {
      this.cleanupExpired();
      const stored = this.getOwned(id, ownerId);
      const workingState = cloneState(stored);
      const result = await operation(workingState);
      this.persist(workingState, ownerId);
      return result;
    } finally {
      releaseTurn();
      if (this.turnLocks.get(id) === lockTail) {
        this.turnLocks.delete(id);
      }
    }
  }

  async beginTurn(
    conversationId: string | undefined,
    ownerId: string,
  ): Promise<AssistantV2ConversationTurnLease> {
    this.cleanupExpired();

    const id = conversationId ?? this.create(ownerId).id;

    const previousTurn = this.turnLocks.get(id) ?? Promise.resolve();

    let releaseTurn: () => void = () => {};

    const currentTurn = new Promise<void>((resolve) => {
      releaseTurn = resolve;
    });

    const lockTail = previousTurn.then(() => currentTurn);

    this.turnLocks.set(id, lockTail);

    await previousTurn;

    try {
      this.cleanupExpired();

      const stored = this.getOwned(id, ownerId);
      const workingState = cloneState(stored);

      let finished = false;

      const release = () => {
        if (finished) return;

        finished = true;
        releaseTurn();

        if (this.turnLocks.get(id) === lockTail) {
          this.turnLocks.delete(id);
        }
      };

      return {
        state: workingState,

        commit: () => {
          if (finished) return;
          this.persist(workingState, ownerId);
        },

        release,
      };
    } catch (error) {
      releaseTurn();

      if (this.turnLocks.get(id) === lockTail) {
        this.turnLocks.delete(id);
      }

      throw error;
    }
  }

  appendRecentTurn(
    state: AssistantV2ConversationState,
    userMessage: string,
    assistantMessage: string,
  ): void {
    state.recentMessages.push(
      {
        role: "user",
        content: trimRecentContent(userMessage, this.maxRecentMessageLength),
      },
      {
        role: "assistant",
        content: trimRecentContent(
          assistantMessage,
          this.maxRecentMessageLength,
        ),
      },
    );
    state.recentMessages = state.recentMessages.slice(-this.maxRecentMessages);
  }

  cleanupExpired(): number {
    const now = this.now();
    let removed = 0;

    for (const [id, conversation] of this.conversations) {
      if (conversation.expiresAt <= now && !this.turnLocks.has(id)) {
        this.conversations.delete(id);
        removed += 1;
      }
    }

    return removed;
  }

  private create(ownerId: string): AssistantV2ConversationState {
    const now = this.now();
    const state: AssistantV2ConversationState = {
      id: crypto.randomUUID(),
      ownerId,
      userConstraints: {},
      currentResults: [],
      lastComparedParks: [],
      recentMessages: [],
      createdAt: now,
      updatedAt: now,
      expiresAt: now + this.ttlMs,
    };
    this.conversations.set(state.id, state);
    return state;
  }

  private getOwned(
    conversationId: string,
    ownerId: string,
  ): AssistantV2ConversationState {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || conversation.ownerId !== ownerId) {
      throw new AssistantV2ConversationExpiredError();
    }
    return conversation;
  }

  private persist(state: AssistantV2ConversationState, ownerId: string): void {
    const stored = this.getOwned(state.id, ownerId);
    const now = this.now();
    const next = cloneState(state);
    next.ownerId = stored.ownerId;
    next.createdAt = stored.createdAt;
    next.updatedAt = now;
    next.expiresAt = now + this.ttlMs;
    this.conversations.set(next.id, next);
  }
}

const globalAssistantV2State = globalThis as typeof globalThis & {
  northParkAssistantV2ConversationStore?: AssistantV2ConversationStore;
};

export const assistantV2ConversationStore: AssistantV2ConversationStore =
  globalAssistantV2State.northParkAssistantV2ConversationStore ??
  new InMemoryAssistantV2ConversationStore();

globalAssistantV2State.northParkAssistantV2ConversationStore =
  assistantV2ConversationStore;
