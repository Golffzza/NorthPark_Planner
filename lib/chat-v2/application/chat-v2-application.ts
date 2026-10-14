// ./lib/chat-v2/application/chat-v2-application.ts

import { generateText, stepCountIs, streamText } from "ai";

import {
  ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS,
  ASSISTANT_V2_INSTRUCTIONS,
} from "@/lib/chat-v2/ai/instructions";

import {
  ASSISTANT_V2_PROVIDER,
  assistantV2Model,
} from "@/lib/chat-v2/ai/model";

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
import { reconcileDisplayedParkResults } from "@/lib/chat-v2/application/displayed-park-results";
import { getChatMessageMaxLength } from "@/lib/chat/shared/limits";
import { findMentionedParks } from "@/lib/chat/core/park-catalog";

const MAX_MESSAGE_LENGTH = getChatMessageMaxLength();

export const ASSISTANT_V2_TEMPERATURE = 0;

function requestsParkRecommendations(message: string): boolean {
  const normalized = message.trim().toLocaleLowerCase("th-TH");
  if (/เปรียบเทียบ/.test(normalized) || findMentionedParks(message).length > 0) {
    return false;
  }

  return /แนะนำ\s*(?:อุทยาน|ที่เที่ยว|สถานที่)|(?:อุทยาน|ที่เที่ยว).{0,30}(?:น่าเที่ยว|ไหนดี|แนะนำ)|ไปไหนดี|ที่ไหนน่าเที่ยว|recommend.{0,30}parks?/i.test(normalized);
}

export function prepareAssistantV2Step({
  stepNumber,
}: {
  stepNumber: number;
}, message = "") {
  if (stepNumber === 0 && requestsParkRecommendations(message)) {
    return {
      toolChoice: { type: "tool" as const, toolName: "recommendParks" as const },
    };
  }

  if (stepNumber < 2) return undefined;

  return {
    activeTools: [] as [],
    toolChoice: "none" as const,
    instructions: `${ASSISTANT_V2_INSTRUCTIONS}\n\n${ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS}`,
  };
}

// ป้องกันอักษรภาษาที่ไม่เกี่ยวข้องหลุดเข้าคำตอบ
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

// วันที่ปัจจุบันตามประเทศไทย
function getCurrentTravelContext(): string {
  const now = new Date();

  const today = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);

  const month = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    month: "long",
  }).format(now);

  return [
    "Current travel context:",
    `Today's date in Thailand: ${today}`,
    `Current month: ${month}`,
    "Timezone: Asia/Bangkok",
    "",
    "Interpret relative time expressions such as วันนี้, ช่วงนี้, เดือนนี้, and ตอนนี้ using this date.",
    "For travel recommendations, consider the current month when relevant.",
    "Do not claim that a destination is suitable for the current season unless supported by retrieved evidence.",
    "Do not assume live weather, current road conditions, or park opening status.",
    "If the user asks for travel recommendations without specifying a province, recommendations may cover all supported northern provinces.",
  ].join("\n");
}

function formatList(values: string[] | undefined): string {
  return values?.length ? values.join(", ") : "NONE";
}

function formatDraftTrip(
  state: AssistantV2ConversationState,
): string {
  const draft = state.draftTrip;

  if (!draft) {
    return "NONE";
  }

  return [
    `park: ${draft.park.name} (${draft.park.slug})`,
    `status: ${draft.savedTripId ? "SAVED" : "UNSAVED"}`,
    `duration days: ${draft.durationDays}`,
    "days:",
    ...draft.days.map(
      (day) =>
        `Day ${day.day}: ${day.title} -> ${
          day.items.join(" | ") || "NONE"
        }`,
    ),
  ].join("\n");
}

export function buildAssistantV2StateSummary(
  state: AssistantV2ConversationState,
): string {
  const constraints = state.userConstraints;

  const visibleResults = state.currentResults.slice(0, 3);

  const results = visibleResults.length
    ? visibleResults
        .map(
          (park, index) =>
            state.currentResultsOrderVerified === false
              ? `${park.name} (${park.slug})`
              : `${index + 1}. ${park.name} (${park.slug})`,
        )
        .join("\n")
    : "NONE";

  const hiddenResultCount =
    state.currentResults.length - visibleResults.length;

  const recentHistory = state.recentMessages.length
    ? state.recentMessages
        .map(
          (message) =>
            `${message.role}: ${message.content}`,
        )
        .join("\n")
    : "NONE";

  return [
    "Structured conversation state (authoritative):",

    "Current preferences:",
    `province: ${constraints.province ?? "NONE"}`,
    `activities: ${formatList(constraints.activities)}`,
    `excluded activities: ${formatList(
      constraints.excludedActivities,
    )}`,
    `fatigue: ${constraints.fatigue ?? "NONE"}`,
    `companions: ${formatList(constraints.companions)}`,
    `duration days: ${constraints.durationDays ?? "NONE"}`,

    state.currentResultsOrderVerified === false
      ? "Current result candidates (display order unverified; ask for a park name if the user refers to a position):"
      : "Current results (authoritative order):",
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
        ? state.lastComparedParks
            .map((park) => park.name)
            .join(" | ")
        : "NONE"
    }`,

    "Current draft trip (authoritative):",
    formatDraftTrip(state),

    "Small recent conversation history (not authoritative for facts):",
    recentHistory,
  ].join("\n");
}

// ใช้สร้าง Prompt ร่วมกันทั้ง send และ stream
function buildAssistantV2Prompt(
  state: AssistantV2ConversationState,
  message: string,
): string {
  return [
    getCurrentTravelContext(),
    buildAssistantV2StateSummary(state),
    "Current user message:",
    message,
  ].join("\n\n");
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
      typeof ownerIdOrSignal === "string"
        ? requestSignal
        : ownerIdOrSignal;

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

        const prompt = buildAssistantV2Prompt(
          state,
          message,
        );

        const result = await generateText({
          model: assistantV2Model,
          system: ASSISTANT_V2_INSTRUCTIONS,
          prompt,
          tools: createAssistantV2Tools(turnContext),

          temperature:
            ASSISTANT_V2_PROVIDER === "gemini"
              ? undefined
              : ASSISTANT_V2_TEMPERATURE,

          stopWhen: stepCountIs(6),
          prepareStep: (step) => prepareAssistantV2Step(step, message),
          abortSignal: signal,
        });

        const finalMessage = sanitizeAssistantV2Text(
          result.text,
        );

        if (!finalMessage) {
          throw new Error("EMPTY_ASSISTANT_RESPONSE");
        }

        const toolResults = new Map(
          result.steps
            .flatMap((step) => step.toolResults)
            .map((toolResult) => [
              toolResult.toolCallId,
              toolResult.output,
            ]),
        );

        const toolCalls: AssistantV2ToolCallDiagnostic[] =
          result.steps
            .flatMap((step) => step.toolCalls)
            .map((toolCall) => ({
              toolName: toolCall.toolName,
              input: toolCall.input,

              ...(toolResults.has(toolCall.toolCallId)
                ? {
                    output: toolResults.get(
                      toolCall.toolCallId,
                    ),
                  }
                : {}),
            }));

        const toolsUsed = [
          ...new Set(
            toolCalls.map((toolCall) => toolCall.toolName),
          ),
        ];

        reconcileDisplayedParkResults(state, finalMessage, toolsUsed);

        assistantV2ConversationStore.appendRecentTurn(
          state,
          message,
          finalMessage,
        );

        return {
          conversationId: state.id,
          message: finalMessage,

          diagnostics: {
            elapsedMs: Math.round(
              performance.now() - startedAt,
            ),
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
      const turnContext = createAssistantV2TurnContext(
        state,
        message,
        signal,
      );

      const prompt = buildAssistantV2Prompt(
        state,
        message,
      );

      const result = streamText({
        model: assistantV2Model,
        system: ASSISTANT_V2_INSTRUCTIONS,
        prompt,
        tools: createAssistantV2Tools(turnContext),

        temperature:
          ASSISTANT_V2_PROVIDER === "gemini"
            ? undefined
            : ASSISTANT_V2_TEMPERATURE,

        stopWhen: stepCountIs(6),
        prepareStep: (step) => prepareAssistantV2Step(step, message),
        abortSignal: signal,

        onFinish({ text, steps, finishReason }) {
          try {
            if (["error", "length", "content-filter"].includes(finishReason)) {
              return;
            }
            const finalMessage = sanitizeAssistantV2Text(
              text,
            );

            if (!finalMessage) {
              console.error(
                "[assistant-v2/stream] Empty assistant response",
                {
                  conversationId: state.id,
                },
              );

              return;
            }

            reconcileDisplayedParkResults(
              state,
              finalMessage,
              steps.flatMap((step) => step.toolCalls.map((call) => call.toolName)),
            );

            assistantV2ConversationStore.appendRecentTurn(
              state,
              message,
              finalMessage,
            );

            turn.commit();

            console.info("[assistant-v2/stream]", {
              conversationId: state.id,
              elapsedMs: Math.round(
                performance.now() - startedAt,
              ),
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
          console.error(
            "[assistant-v2/stream]",
            error,
          );

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
