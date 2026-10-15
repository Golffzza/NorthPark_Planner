// ./app/api/v2/assistant/chat/stream/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AuthenticationError,
  getCurrentUser,
} from "@/lib/auth/current-user";
import {
  chatV2Application,
  sanitizeAssistantV2Text,
} from "@/lib/chat-v2/application/chat-v2-application";
import { finalizeWeatherClarificationAnswer } from "@/lib/chat-v2/application/weather-answer-guard";
import { finalizeTripPlanAnswer } from "@/lib/chat-v2/application/trip-plan-answer-guard";
import { finalizeParkSelectionAnswer } from "@/lib/chat-v2/application/park-selection-answer-guard";
import { AssistantV2ConversationExpiredError } from "@/lib/chat-v2/state/conversation-state";
import { nearbyAttributionSource } from "@/lib/chat-v2/application/nearby-attribution";
import {
  asksForDisplayedNearbyPlace,
  finalizeNearbyFollowupAnswer,
  isNearbyDiscoveryQuestion,
  isNearbyDistanceQuestion,
} from "@/lib/chat-v2/application/displayed-nearby-results";
import { getChatMessageMaxLength } from "@/lib/chat/shared/limits";

export const runtime = "nodejs";

const requestSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1)
      .max(getChatMessageMaxLength()),

    conversationId: z
      .string()
      .uuid()
      .optional(),
  })
  .strict();

function errorResponse(
  code: string,
  message: string,
  status: number,
  headers?: HeadersInit,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    {
      status,
      headers,
    },
  );
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "bad_request",
        "Malformed JSON request body",
        400,
      );
    }

    if (
      body === null ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return errorResponse(
        "bad_request",
        "Malformed JSON request body",
        400,
      );
    }

    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "validation_error",
        "ข้อมูลคำขอไม่ถูกต้อง",
        422,
      );
    }

    const {
      conversationId,
      result,
    } = await chatV2Application.stream(
      parsed.data,
      currentUser.id,
      request.signal,
    );

    const encoder = new TextEncoder();
    let bufferNearbyFollowup = asksForDisplayedNearbyPlace(parsed.data.message)
      || isNearbyDistanceQuestion(parsed.data.message)
      || isNearbyDiscoveryQuestion(parsed.data.message);
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: Record<string, string>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };
        let finished = false;
        try {
          for await (const part of result.fullStream) {
            if (part.type === "text-delta") {
              if (!bufferNearbyFollowup) send({ type: "text", text: part.text });
            } else if (part.type === "tool-result" && part.toolName === "findNearbyPlaces") {
              const output = part.output as { status?: string; referenceResolution?: string } | undefined;
              if (output?.status === "PLACE_REFERENCE_REQUIRED" || output?.status === "EMPTY"
                || output?.status?.startsWith("UPSTREAM_")
                || output?.referenceResolution) bufferNearbyFollowup = true;
            } else if (part.type === "tool-result" && part.toolName === "getParkWeather") {
              const output = part.output as { status?: string } | undefined;
              if (output?.status === "AMBIGUOUS_PARK" || output?.status === "PARK_REQUIRED") {
                bufferNearbyFollowup = true;
              }
            } else if (part.type === "error" || part.type === "abort") {
              send({ type: "error", message: "คำตอบขาดตอน กรุณาลองอีกครั้ง" });
              return;
            } else if (part.type === "finish") {
              finished = !["error", "length", "content-filter"].includes(part.finishReason);
            }
          }
          const steps = finished ? await result.steps : [];
          const stepToolResults = steps.flatMap((step) => step.toolResults.map((toolResult) => ({
            toolName: toolResult.toolName, output: toolResult.output,
          })));
          const finalText = finished
            ? sanitizeAssistantV2Text(finalizeParkSelectionAnswer(finalizeTripPlanAnswer(finalizeWeatherClarificationAnswer(finalizeNearbyFollowupAnswer(
                await result.text,
                stepToolResults,
                parsed.data.message,
              ), stepToolResults), stepToolResults))
            : "";
          if (finalText) {
            const nearbySource = nearbyAttributionSource(stepToolResults);
            send({ type: "done", text: finalText, ...(nearbySource ? { nearbySource } : {}) });
          } else {
            send({ type: "error", message: "คำตอบขาดตอน กรุณาลองอีกครั้ง" });
          }
        } catch {
          send({ type: "error", message: "คำตอบขาดตอน กรุณาลองอีกครั้ง" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "X-Conversation-Id": conversationId,
        "Cache-Control": "no-cache",
        "Content-Type": "application/x-ndjson; charset=utf-8",
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(
        "unauthorized",
        error.message,
        401,
      );
    }

    if (
      error instanceof Error &&
      (
        error.message === "MESSAGE_REQUIRED" ||
        error.message === "MESSAGE_TOO_LONG"
      )
    ) {
      return errorResponse(
        "validation_error",
        "ข้อมูลคำขอไม่ถูกต้อง",
        422,
      );
    }

    if (
      error instanceof
      AssistantV2ConversationExpiredError
    ) {
      return errorResponse(
        "conversation_expired",
        "บทสนทนานี้หมดอายุหรือไม่สามารถใช้งานได้ กรุณาเริ่มบทสนทนาใหม่",
        409,
      );
    }

    console.error(
      "[assistant-v2/chat/stream]",
      error,
    );

    return errorResponse(
      "assistant_unavailable",
      "ตอนนี้ผู้ช่วย AI ไม่สามารถตอบได้ กรุณาลองใหม่อีกครั้ง",
      503,
      {
        "Retry-After": "5",
      },
    );
  }
}
