import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/assistant/chat/route";
import { AuthenticationError } from "@/lib/auth/current-user";
import { ConversationExpiredError } from "@/lib/chat/orchestration/conversation-state";

const chatApplicationMock = vi.hoisted(() => ({
  send: vi.fn(),
}));

const currentUserMock = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/chat/application/chat-application", () => ({
  chatApplication: chatApplicationMock,
}));

vi.mock("@/lib/auth/current-user", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/current-user")>(
    "@/lib/auth/current-user",
  );

  return {
    ...actual,
    ...currentUserMock,
  };
});

function createRequest(body: string) {
  return new Request("http://localhost/api/v1/assistant/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body,
  });
}

describe("POST /api/v1/assistant/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserMock.getCurrentUser.mockResolvedValue({
      id: "user_1",
      displayName: "Traveler",
      email: null,
      role: "USER",
      lineUserId: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes the authenticated user to the chat application", async () => {
    chatApplicationMock.send.mockResolvedValue({
      conversationId: "8ba2e9a6-53d5-4fc1-bc20-b2448bb3fb47",
      message: "สวัสดีครับ",
    });

    const request = createRequest(JSON.stringify({ message: "สวัสดี" }));
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(chatApplicationMock.send).toHaveBeenCalledWith(
      { message: "สวัสดี" },
      "user_1",
      request.signal,
    );
    expect(body.message).toBe("สวัสดีครับ");
  });

  it("returns 401 when the user is not authenticated", async () => {
    currentUserMock.getCurrentUser.mockRejectedValue(
      new AuthenticationError("Unauthorized"),
    );

    const response = await POST(
      createRequest(JSON.stringify({ message: "สวัสดี" })),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(chatApplicationMock.send).not.toHaveBeenCalled();
  });

  it.each(["null", "[]", "42", '"text"'])(
    "returns 400 for a non-object body: %s",
    async (payload) => {
      const response = await POST(createRequest(payload));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("bad_request");
    },
  );

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(createRequest("{invalid"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("bad_request");
  });

  it("returns 422 when the message is missing", async () => {
    const response = await POST(createRequest("{}"));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
  });

  it("returns 422 when the message is blank", async () => {
    const response = await POST(
      createRequest(JSON.stringify({ message: "   " })),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(chatApplicationMock.send).not.toHaveBeenCalled();
  });

  it("returns 422 when the message is longer than 1000 characters", async () => {
    const response = await POST(
      createRequest(JSON.stringify({ message: "a".repeat(1001) })),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(chatApplicationMock.send).not.toHaveBeenCalled();
  });

  it("returns 422 for an invalid conversation id", async () => {
    const response = await POST(
      createRequest(
        JSON.stringify({ message: "สวัสดี", conversationId: "not-a-uuid" }),
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
  });

  it("returns a stable 503 error contract when the assistant fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    chatApplicationMock.send.mockRejectedValue(new Error("Ollama offline"));

    const response = await POST(
      createRequest(JSON.stringify({ message: "สวัสดี" })),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("5");
    expect(body.error).toEqual({
      code: "assistant_unavailable",
      message: "ตอนนี้ผู้ช่วย AI ไม่สามารถตอบได้ กรุณาลองใหม่อีกครั้ง",
    });
  });

  it("returns 409 when the conversation has expired", async () => {
    chatApplicationMock.send.mockRejectedValue(new ConversationExpiredError());

    const response = await POST(
      createRequest(
        JSON.stringify({
          message: "คุยต่อ",
          conversationId: "8ba2e9a6-53d5-4fc1-bc20-b2448bb3fb47",
        }),
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("conversation_expired");
  });
});
