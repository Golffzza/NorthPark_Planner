import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v2/assistant/chat/route";
import { AuthenticationError } from "@/lib/auth/current-user";

const applicationMock = vi.hoisted(() => ({ send: vi.fn() }));
const currentUserMock = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));

vi.mock("@/lib/chat-v2/application/chat-v2-application", () => ({
  chatV2Application: applicationMock,
}));

vi.mock("@/lib/auth/current-user", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/current-user")>(
    "@/lib/auth/current-user",
  );
  return { ...actual, ...currentUserMock };
});

function request(body: string) {
  return new Request("http://localhost/api/v2/assistant/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("POST /api/v2/assistant/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserMock.getCurrentUser.mockResolvedValue({ id: "user_1" });
    applicationMock.send.mockResolvedValue({
      message: "สวัสดีครับ",
      diagnostics: { elapsedMs: 10, toolsUsed: [], toolCalls: [], stepCount: 1 },
    });
  });

  it("returns the one-turn result and forwards request cancellation", async () => {
    const input = request(JSON.stringify({ message: "สวัสดี" }));
    const response = await POST(input);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        message: "สวัสดีครับ",
        diagnostics: { elapsedMs: 10, toolsUsed: [], toolCalls: [], stepCount: 1 },
      },
    });
    expect(applicationMock.send).toHaveBeenCalledWith(
      { message: "สวัสดี" },
      "user_1",
      input.signal,
    );
  });

  it("returns 401 when authentication fails", async () => {
    currentUserMock.getCurrentUser.mockRejectedValue(new AuthenticationError("Unauthorized"));

    const response = await POST(request(JSON.stringify({ message: "สวัสดี" })));

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("unauthorized");
    expect(applicationMock.send).not.toHaveBeenCalled();
  });

  it.each(["{bad", "null", "[]", "42"])("returns 400 for malformed body %s", async (body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("bad_request");
  });

  it.each([
    { body: {}, caseName: "missing message" },
    { body: { message: "" }, caseName: "empty message" },
    { body: { message: "   " }, caseName: "blank message" },
    { body: { message: "a".repeat(1001) }, caseName: "message too long" },
    {
      body: { message: "สวัสดี", conversationId: "not-supported" },
      caseName: "unsupported conversation state",
    },
  ])("returns 422 for $caseName", async ({ body }) => {
    const response = await POST(request(JSON.stringify(body)));

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("validation_error");
    expect(applicationMock.send).not.toHaveBeenCalled();
  });

  it("returns a stable 503 without exposing upstream details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    applicationMock.send.mockRejectedValue(new Error("private Ollama stack"));

    const response = await POST(request(JSON.stringify({ message: "สวัสดี" })));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("5");
    expect(body.error.code).toBe("assistant_unavailable");
    expect(JSON.stringify(body)).not.toContain("private Ollama stack");
  });
});
