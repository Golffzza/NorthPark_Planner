// ./app/api/v1/assistant/chat/route.ts

import { NextResponse } from "next/server";

import { AuthenticationError, getCurrentUser } from "@/lib/auth/current-user";
import { chatApplication } from "@/lib/chat/application/chat-application";
import { ConversationExpiredError } from "@/lib/chat/orchestration/conversation-state";
import type { ChatRequest } from "@/lib/chat/shared/contracts";
import { getChatMessageMaxLength } from "@/lib/chat/shared/limits";

export const runtime = "nodejs";

const CONVERSATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = getChatMessageMaxLength();

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
    { status, headers },
  );
}

async function parseChatRequest(request: Request): Promise<ChatRequest | undefined> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return undefined;
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return undefined;
  }

  return body as ChatRequest;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await parseChatRequest(request);

    if (!body) {
      return errorResponse("bad_request", "Malformed JSON request body", 400);
    }

    if (typeof body.message !== "string") {
      return errorResponse(
        "validation_error",
        "กรุณาระบุข้อความ",
        422,
      );
    }

    if (!body.message.trim()) {
      return errorResponse(
        "validation_error",
        "กรุณาพิมพ์ข้อความก่อนส่ง",
        422,
      );
    }

    if (body.message.length > MAX_MESSAGE_LENGTH) {
      return errorResponse("validation_error", "ข้อความยาวเกินไป", 422);
    }

    if (
      body.conversationId !== undefined &&
      (typeof body.conversationId !== "string" ||
        !CONVERSATION_ID_PATTERN.test(body.conversationId))
    ) {
      return errorResponse(
        "validation_error",
        "conversationId ไม่ถูกต้อง",
        422,
      );
    }

    const result = await chatApplication.send(body, user.id, request.signal);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse("unauthorized", error.message, 401);
    }

    if (error instanceof ConversationExpiredError) {
      return errorResponse(
        "conversation_expired",
        "บทสนทนานี้หมดอายุแล้ว กรุณาเริ่มบทสนทนาใหม่",
        409,
      );
    }

    if (error instanceof Error && error.message === "MESSAGE_REQUIRED") {
      return errorResponse(
        "validation_error",
        "กรุณาพิมพ์ข้อความก่อนส่ง",
        422,
      );
    }

    if (error instanceof Error && error.message === "MESSAGE_TOO_LONG") {
      return errorResponse("validation_error", "ข้อความยาวเกินไป", 422);
    }

    console.error("[assistant/chat]", error);

    return errorResponse(
      "assistant_unavailable",
      "ตอนนี้ผู้ช่วย AI ไม่สามารถตอบได้ กรุณาลองใหม่อีกครั้ง",
      503,
      { "Retry-After": "5" },
    );
  }
}
