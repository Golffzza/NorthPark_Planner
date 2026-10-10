// ./lib/chat-v2/application/chat-v2-application.ts

import { generateText, stepCountIs, streamText } from "ai";

import {
  ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS,
  ASSISTANT_V2_INSTRUCTIONS,
} from "@/lib/chat-v2/ai/instructions";
import { assistantV2Model } from "@/lib/chat-v2/ai/model";
import type {
  AssistantV2Request,
  AssistantV2Response,
  AssistantV2ToolCallDiagnostic,
} from "@/lib/chat-v2/shared/contracts";
import {
  assistantV2ConversationStore,
  type AssistantV2ConversationState,
} from "@/lib/chat-v2/state/conversation-state";
import { createAssistantV2Tools } from "@/lib/chat-v2/tools";
import { createAssistantV2TurnContext } from "@/lib/chat-v2/tools/turn-context";
import { getChatMessageMaxLength } from "@/lib/chat/shared/limits";

const MAX_MESSAGE_LENGTH = getChatMessageMaxLength();
export const ASSISTANT_V2_TEMPERATURE = 0;

export function prepareAssistantV2Step({ stepNumber }: { stepNumber: number }) {
  if (stepNumber === 0) return undefined;

  return {
    activeTools: [] as [],
    instructions: ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS,
  };
}

const UNRELATED_SCRIPT_PATTERN =
  /[\p{Script=Arabic}\p{Script=Cyrillic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu;

export function sanitizeAssistantV2Text(text: string): string {
  return text
    .replace(UNRELATED_SCRIPT_PATTERN, "")
    .replaceAll("อุทยิาน", "อุทยาน")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/ +([,.;:!?])/g, "$1")
    .trim();
}

function formatList(values: string[] | undefined): string {
  return values?.length ? values.join(", ") : "NONE";
}

export function buildAssistantV2StateSummary(
  state: AssistantV2ConversationState,
): string {
  const constraints = state.userConstraints;
  const visibleResults = state.currentResults.slice(0, 3);
  const results = visibleResults.length
    ? visibleResults
        .map((park, index) => `${index + 1}. ${park.name} (${park.slug})`)
        .join("\n")
    : "NONE";
  const hiddenResultCount = state.currentResults.length - visibleResults.length;
  const recentUserMessages = state.recentMessages.filter(
    (message) => message.role === "user",
  );
  const recentHistory = recentUserMessages.length
    ? recentUserMessages
        .map((message) => `${message.role}: ${message.content}`)
        .join("\n")
    : "NONE";

  return [
    "Structured conversation state (authoritative):",
    "Current preferences:",
    `province: ${constraints.province ?? "NONE"}`,
    `activities: ${formatList(constraints.activities)}`,
    `excluded activities: ${formatList(constraints.excludedActivities)}`,
    `fatigue: ${constraints.fatigue ?? "NONE"}`,
    `companions: ${formatList(constraints.companions)}`,
    `duration days: ${constraints.durationDays ?? "NONE"}`,
    "Current results (authoritative order):",
    results,
    ...(hiddenResultCount > 0
      ? [
          `... ${hiddenResultCount} additional results are stored but omitted here`,
        ]
      : []),
    `Selected park: ${
      state.selectedPark
        ? `${state.selectedPark.name} (${state.selectedPark.slug})`
        : "NONE"
    }`,
    `Last compared parks: ${
      state.lastComparedParks.length
        ? state.lastComparedParks.map((park) => park.name).join(" | ")
        : "NONE"
    }`,
    "Small recent user-message history (not authoritative for facts):",
    recentHistory,
  ].join("\n");
}

export class ChatV2Application {
  async send(
    input: AssistantV2Request,
    ownerId: string,
    signal?: AbortSignal,
  ): Promise<AssistantV2Response>;

  async send(
    input: AssistantV2Request,
    signal?: AbortSignal,
  ): Promise<AssistantV2Response>;

  async send(
    input: AssistantV2Request,
    ownerIdOrSignal?: string | AbortSignal,
    requestSignal?: AbortSignal,
  ): Promise<AssistantV2Response> {
    const message = input.message?.trim();

    if (!message) {
      throw new Error("MESSAGE_REQUIRED");
    }

    if (input.message.length > MAX_MESSAGE_LENGTH) {
      throw new Error("MESSAGE_TOO_LONG");
    }

    const ownerId =
      typeof ownerIdOrSignal === "string"
        ? ownerIdOrSignal
        : "assistant-v2-direct";

    const signal =
      typeof ownerIdOrSignal === "string" ? requestSignal : ownerIdOrSignal;

    return assistantV2ConversationStore.runTurn(
      input.conversationId,
      ownerId,
      async (state) => {
        const startedAt = performance.now();

        const turnContext = createAssistantV2TurnContext(
          state,
          message,
          signal,
        );

        const prompt = [
          buildAssistantV2StateSummary(state),
          "Current user message:",
          message,
        ].join("\n\n");

        const result = await generateText({
          model: assistantV2Model,
          system: ASSISTANT_V2_INSTRUCTIONS,
          prompt,
          tools: createAssistantV2Tools(turnContext),
          temperature: ASSISTANT_V2_TEMPERATURE,
          stopWhen: stepCountIs(4),
          prepareStep: prepareAssistantV2Step,
          abortSignal: signal,
        });

        const finalMessage = sanitizeAssistantV2Text(result.text);

        if (!finalMessage) {
          throw new Error("EMPTY_ASSISTANT_RESPONSE");
        }

        const toolResults = new Map(
          result.steps
            .flatMap((step) => step.toolResults)
            .map((toolResult) => [toolResult.toolCallId, toolResult.output]),
        );

        const toolCalls: AssistantV2ToolCallDiagnostic[] = result.steps
          .flatMap((step) => step.toolCalls)
          .map((toolCall) => ({
            toolName: toolCall.toolName,
            input: toolCall.input,

            ...(toolResults.has(toolCall.toolCallId)
              ? {
                  output: toolResults.get(toolCall.toolCallId),
                }
              : {}),
          }));

        const toolsUsed = [
          ...new Set(toolCalls.map((toolCall) => toolCall.toolName)),
        ];

        assistantV2ConversationStore.appendRecentTurn(
          state,
          message,
          finalMessage,
        );

        return {
          conversationId: state.id,
          message: finalMessage,

          diagnostics: {
            elapsedMs: Math.round(performance.now() - startedAt),
            toolsUsed,
            toolCalls,
            stepCount: result.steps.length,
          },
        };
      },
    );
  }

  async stream(
    input: AssistantV2Request,
    ownerId: string,
    signal?: AbortSignal,
  ) {
    const message = input.message?.trim();

    if (!message) {
      throw new Error("MESSAGE_REQUIRED");
    }

    if (input.message.length > MAX_MESSAGE_LENGTH) {
      throw new Error("MESSAGE_TOO_LONG");
    }

    const turn = await assistantV2ConversationStore.beginTurn(
      input.conversationId,
      ownerId,
    );

    const state = turn.state;

    const startedAt = performance.now();

    let released = false;

    const release = () => {
      if (released) {
        return;
      }

      released = true;

      turn.release();
    };

    try {
      const turnContext = createAssistantV2TurnContext(state, message, signal);

      const prompt = [
        buildAssistantV2StateSummary(state),
        "Current user message:",
        message,
      ].join("\n\n");

      const result = streamText({
        model: assistantV2Model,
        system: ASSISTANT_V2_INSTRUCTIONS,
        prompt,
        tools: createAssistantV2Tools(turnContext),
        temperature: ASSISTANT_V2_TEMPERATURE,
        stopWhen: stepCountIs(4),
        prepareStep: prepareAssistantV2Step,
        abortSignal: signal,

        onFinish({ text, steps }) {
          try {
            const finalMessage = sanitizeAssistantV2Text(text);

            if (!finalMessage) {
              console.error("[assistant-v2/stream] Empty assistant response", {
                conversationId: state.id,
              });

              return;
            }

            assistantV2ConversationStore.appendRecentTurn(
              state,
              message,
              finalMessage,
            );

            turn.commit();

            console.info("[assistant-v2/stream]", {
              conversationId: state.id,

              elapsedMs: Math.round(performance.now() - startedAt),

              stepCount: steps.length,
            });
          } finally {
            release();
          }
        },

        onAbort() {
          release();
        },

        onError({ error }) {
          console.error("[assistant-v2/stream]", error);

          release();
        },
      });

      return {
        conversationId: state.id,
        result,
      };
    } catch (error) {
      release();

      throw error;
    }
  }
}

export const chatV2Application = new ChatV2Application();