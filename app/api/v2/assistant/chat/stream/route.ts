import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AuthenticationError,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { chatV2Application } from "@/lib/chat-v2/application/chat-v2-application";
import { AssistantV2ConversationExpiredError } from "@/lib/chat-v2/state/conversation-state";
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

    return result.toTextStreamResponse({
      headers: {
        "X-Conversation-Id": conversationId,
        "Cache-Control": "no-cache",
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