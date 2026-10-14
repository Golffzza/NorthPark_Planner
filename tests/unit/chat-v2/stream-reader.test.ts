import { describe, expect, it, vi } from "vitest";
import { readAssistantV2Stream } from "@/components/assistant/assistant-stream";

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe("Assistant V2 stream reader", () => {
  it("passes the real Nearby provider from the completion frame to the UI", async () => {
    const onSource = vi.fn();
    await readAssistantV2Stream(streamOf(
      '{"type":"done","text":"พบร้านอาหาร","nearbySource":"GEOAPIFY_PLACES"}\n',
    ), () => {}, onSource);
    expect(onSource).toHaveBeenCalledWith("GEOAPIFY_PLACES");
  });

  it("accepts split frames and returns the canonical completed answer", async () => {
    const onText = vi.fn();
    const answer = await readAssistantV2Stream(streamOf(
      '{"type":"text","text":"สวัส',
      'ดี"}\n{"type":"done","text":"สวัสดีครับ"}\n',
    ), onText);
    expect(onText).toHaveBeenLastCalledWith("สวัสดีครับ");
    expect(answer).toBe("สวัสดีครับ");
  });

  it("rejects a partial answer when the provider reports an error", async () => {
    await expect(readAssistantV2Stream(streamOf(
      '{"type":"text","text":"บางส่วน"}\n',
      '{"type":"error","message":"คำตอบขาดตอน กรุณาลองอีกครั้ง"}\n',
    ), () => {})).rejects.toThrow("คำตอบขาดตอน");
  });

  it("rejects a closed stream without a completion frame", async () => {
    await expect(readAssistantV2Stream(streamOf(
      '{"type":"text","text":"บางส่วน"}\n',
    ), () => {})).rejects.toThrow("คำตอบขาดตอน");
  });
});
