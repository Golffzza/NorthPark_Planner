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

function request(message = "แนะนำอุทยานหน่อย") {
  return new Request("http://localhost/api/v2/assistant/chat/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

function mockResult(parts: Array<Record<string, unknown>>, text: string, toolResults: Array<{ toolName: string; output: unknown }> = []) {
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
      steps: Promise.resolve([{ toolResults }]),
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

  it("buffers a rejected Weather answer and asks for the park name", async () => {
    mockResult([
      { type: "tool-result", toolName: "getParkWeather", output: { status: "AMBIGUOUS_PARK" } },
      { type: "text-delta", text: "ดอยหลวงอากาศ 20 องศา" },
      { type: "finish", finishReason: "stop" },
    ], "ดอยหลวงอากาศ 20 องศา", [{ toolName: "getParkWeather", output: { status: "AMBIGUOUS_PARK" } }]);
    const response = await POST(request("อากาศที่นั่นเป็นไงบ้าง"));
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "done", text: expect.stringContaining("บอกชื่ออุทยาน") });
    expect(events[0].text).not.toContain("20");
  });

  it("includes Geoapify source only after a real nearby tool result", async () => {
    mockResult([{ type: "finish", finishReason: "stop" }], "พบร้านอาหาร", [{
      toolName: "findNearbyPlaces",
      output: { status: "OK", places: [{ name: "Cafe" }], meta: { source: "GEOAPIFY_PLACES" } },
    }]);
    const response = await POST(request());
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events.at(-1)).toEqual({ type: "done", text: "พบร้านอาหาร", nearbySource: "GEOAPIFY_PLACES" });
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

  it("does not show a rejected Nearby answer even briefly in streaming output", async () => {
    mockResult([
      { type: "text-delta", text: "ร้านแรกขับรถ 510 เมตร" },
      { type: "finish", finishReason: "stop" },
    ], "ร้านแรกขับรถ 510 เมตร", [{
      toolName: "findNearbyPlaces", output: { status: "PLACE_REFERENCE_REQUIRED", places: [] },
    }]);
    const response = await POST(request("ร้านแรกอยู่ไกลแค่ไหน"));
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("done");
    expect(events[0].text).toContain("ขอชื่อ");
    expect(events[0].text).not.toContain("510");
  });

  it("buffers an empty nearby discovery and sends the scoped answer without a driving claim", async () => {
    const empty = { status: "EMPTY", places: [], searchedPark: { name: "อุทยานแห่งชาติขุนขาน" },
      meta: { source: "GEOAPIFY_PLACES", categories: ["accommodation"], radiusMeters: 3000 } };
    mockResult([
      { type: "text-delta", text: "ที่พักขับรถไป 510 เมตร" },
      { type: "tool-result", toolName: "findNearbyPlaces", output: empty },
      { type: "finish", finishReason: "stop" },
    ], "ที่พักขับรถไป 510 เมตร", [{ toolName: "findNearbyPlaces", output: empty }]);
    const response = await POST(request("ไปอันที่สามอะ มีที่พักใกล้ๆไหม"));
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "done" });
    expect(events[0]).not.toHaveProperty("nearbySource");
    expect(events[0].text).toContain("ขุนขาน");
    expect(events[0].text).toContain("ที่พัก");
    expect(events[0].text).not.toContain("ขับรถ");
    expect(events[0].text).not.toContain("510");
  });

  it("buffers a named-place distance answer after the Nearby provider fails", async () => {
    mockResult([
      { type: "tool-result", toolName: "findNearbyPlaces", output: { status: "UPSTREAM_TIMEOUT" } },
      { type: "text-delta", text: "Nobel House ขับรถ 510 เมตร" },
      { type: "finish", finishReason: "stop" },
    ], "Nobel House ขับรถ 510 เมตร", [{
      toolName: "findNearbyPlaces", output: { status: "UPSTREAM_TIMEOUT", places: [] },
    }]);
    const response = await POST(request("Nobel House ขับรถไปไกลไหม"));
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events).toHaveLength(1);
    expect(events[0].text).toContain("ยังตรวจ");
    expect(events[0].text).not.toContain("510");
  });

  it("does not expose an unsupported named-place distance before the tool failure arrives", async () => {
    mockResult([
      { type: "text-delta", text: "Nobel House ขับรถ 510 เมตร" },
      { type: "tool-result", toolName: "findNearbyPlaces", output: { status: "UPSTREAM_TIMEOUT" } },
      { type: "finish", finishReason: "stop" },
    ], "Nobel House ขับรถ 510 เมตร", [{
      toolName: "findNearbyPlaces", output: { status: "UPSTREAM_TIMEOUT", places: [] },
    }]);
    const response = await POST(request("Nobel House ขับรถไปไกลไหม"));
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("done");
    expect(events[0].text).toContain("ยังตรวจ");
    expect(events[0].text).not.toContain("510");
  });
});
