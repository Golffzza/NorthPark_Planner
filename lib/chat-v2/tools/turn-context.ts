// ./lib/chat-v2/tools/turn-context.ts

import type {
  AssistantV2ConversationState,
} from "@/lib/chat-v2/state/conversation-state";

export type AssistantV2TurnContext = {
  state: AssistantV2ConversationState;
  currentMessage: string;
  signal?: AbortSignal;

  runExclusive<T>(
    operation: (state: AssistantV2ConversationState) => Promise<T>,
  ): Promise<T>;
};

export function createAssistantV2TurnContext(
  state: AssistantV2ConversationState,
  currentMessage: string,
  signal?: AbortSignal,
): AssistantV2TurnContext {
  let pending = Promise.resolve();

  return {
    state,
    currentMessage,
    signal,

    async runExclusive(operation) {
      const previous = pending;

      let release: () => void = () => {};

      pending = new Promise<void>((resolve) => {
        release = resolve;
      });

      await previous;

      try {
        return await operation(state);
      } finally {
        release();
      }
    },
  };
}