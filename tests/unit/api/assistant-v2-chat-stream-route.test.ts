import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v2/assistant/chat/stream/route";

const applicationMock = vi.hoisted(() => ({ stream: vi.fn() }));
const currentUserMock = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));

vi.mock("@/lib/chat-v2/application/chat-v2-application", () => ({
  chatV2Application: applicationMock,
  sanitizeAssistantV2Text: (value: string) => value.trim(),
}));
vi.mock("@/lib/auth/current-user", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/current-user")>(
    "@/lib/auth/current-user",
  );
  return { ...actual, ...currentUserMock };
});

function request() {
  return new Request("http://localhost/api/v2/assistant/chat/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "แนะนำอุทยานหน่อย" }),
  });
}

function mockResult(parts: Array<Record<string, unknown>>, text: string) {
  applicationMock.stream.mockResolvedValue({
    conversationId: "5c3cabbd-61e8-4ec9-bce6-18a72bf06895",
    result: {
      fullStream: new ReadableStream({
        start(controller) {
          for (const part of parts) controller.enqueue(part);
          controller.close();
        },
      }),
      text: Promise.resolve(text),
      toTextStreamResponse: () => new Response("partial text"),
    },
  });
}

describe("POST /api/v2/assistant/chat/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserMock.getCurrentUser.mockResolvedValue({ id: "user-1" });
  });

  it("sends an explicit completion and the canonical answer", async () => {
    mockResult([
      { type: "text-delta", text: "**ขุนแจ**" },
      { type: "finish", finishReason: "stop" },
    ], "**ขุนแจ**");

    const response = await POST(request());
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events).toEqual([
      { type: "text", text: "**ขุนแจ**" },
      { type: "done", text: "**ขุนแจ**" },
    ]);
    expect(response.headers.get("X-Conversation-Id")).toBe(
      "5c3cabbd-61e8-4ec9-bce6-18a72bf06895",
    );
  });

  it("reports a provider error after partial output without marking it complete", async () => {
    mockResult([
      { type: "text-delta", text: "คำตอบบางส่วน" },
      { type: "error", error: new Error("private provider detail") },
    ], "คำตอบบางส่วน");

    const response = await POST(request());
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events).toEqual([
      { type: "text", text: "คำตอบบางส่วน" },
      { type: "error", message: "คำตอบขาดตอน กรุณาลองอีกครั้ง" },
    ]);
  });

  it("rejects a stream that closes without a finish event", async () => {
    mockResult([{ type: "text-delta", text: "คำตอบบางส่วน" }], "คำตอบบางส่วน");

    const response = await POST(request());
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events.at(-1)).toEqual({
      type: "error",
      message: "คำตอบขาดตอน กรุณาลองอีกครั้ง",
    });
    expect(events.some((event) => event.type === "done")).toBe(false);
  });
});
