import { describe, expect, it, vi } from "vitest";

import {
  detectAssistantIntent,
  resolveAssistantIntent,
} from "@/lib/chat/core/assistant-intent";

describe("assistant intent routing", () => {
  it.each([
    ["ในระบบมีอุทยานกี่แห่ง", "SYSTEM_FACT"],
    ["แนะนำอุทยานที่เชียงใหม่หน่อย", "RECOMMEND"],
    ["เปรียบเทียบดอยอินทนนท์กับดอยสุเทพ", "COMPARE"],
    ["ดอยอินทนนท์มีอะไรบ้าง", "PARK_INFO"],
    ["หาอุทยานเชียงใหม่", "PARK_SEARCH"],
    ["ดอยอินทนนท์กับดอยสุเทพ อันไหนเหมาะกับผู้สูงอายุ", "COMPARE"],
    ["ดอยอินทนนท์กับดอยสุเทพ เลือกที่ไหนดี", "COMPARE"],
    ["หาอุทยานที่มีถ้ำ", "PARK_SEARCH"],
    ["แนะนำที่ล่องแก่งหน่อย", "RECOMMEND"],
  ] as const)("classifies %s", (message, intent) => {
    expect(detectAssistantIntent(message)?.intent).toBe(intent);
  });

  it("does not spend an LLM call on messages covered by deterministic rules", async () => {
    const analyze = vi.fn().mockResolvedValue({
      intent: "GENERAL",
      confidence: 0.7,
      source: "LLM",
    });

    const obvious = await resolveAssistantIntent("มีอุทยานกี่แห่ง", { analyze });
    expect(obvious.source).toBe("RULE");
    expect(analyze).not.toHaveBeenCalled();

    const general = await resolveAssistantIntent("ช่วยคิดหน่อย", { analyze });
    expect(general).toEqual({
      intent: "GENERAL",
      confidence: 0.95,
      source: "RULE",
    });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("uses the warm LLM analyzer only when deterministic rules cannot classify the message", async () => {
    const analyze = vi.fn().mockResolvedValue({
      intent: "PARK_INFO",
      confidence: 0.82,
      source: "LLM",
    });
    const analyzer = { analyze, isReady: () => true };

    const result = await resolveAssistantIntent(
      "เจาะประเด็นนี้ต่อได้ไหม",
      analyzer,
      undefined,
      true,
    );

    expect(result).toEqual({ intent: "PARK_INFO", confidence: 0.82, source: "LLM" });
    expect(analyze).toHaveBeenCalledWith(
      "เจาะประเด็นนี้ต่อได้ไหม",
      expect.any(AbortSignal),
      { hasParkContext: true },
    );
  });

  it("enforces the hybrid fallback deadline even when an analyzer does not settle", async () => {
    vi.useFakeTimers();
    try {
      const pending = resolveAssistantIntent("ข้อความที่ไม่คุ้นเคย", {
        isReady: () => true,
        analyze: vi.fn(() => new Promise<never>(() => undefined)),
      });

      await vi.advanceTimersByTimeAsync(2_500);

      await expect(pending).resolves.toEqual({
        intent: "GENERAL",
        confidence: 0,
        source: "FALLBACK",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not wait for the LLM analyzer while its model is still warming", async () => {
    const analyze = vi.fn();
    const result = await resolveAssistantIntent(
      "เจาะประเด็นนี้ต่อได้ไหม",
      { analyze, isReady: () => false },
      undefined,
      true,
    );

    expect(result).toEqual({ intent: "GENERAL", confidence: 0, source: "FALLBACK" });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("rejects a low-confidence LLM classification", async () => {
    const result = await resolveAssistantIntent("ข้อความที่ไม่คุ้นเคย", {
      isReady: () => true,
      analyze: vi.fn().mockResolvedValue({
        intent: "RECOMMEND",
        confidence: 0.4,
        source: "LLM",
      }),
    });

    expect(result).toEqual({ intent: "GENERAL", confidence: 0, source: "FALLBACK" });
  });

  it("does not accept a context-dependent PARK_INFO classification without park context", async () => {
    const result = await resolveAssistantIntent("เจาะประเด็นนี้ต่อได้ไหม", {
      isReady: () => true,
      analyze: vi.fn().mockResolvedValue({
        intent: "PARK_INFO",
        confidence: 0.9,
        source: "LLM",
      }),
    });

    expect(result).toEqual({ intent: "GENERAL", confidence: 0, source: "FALLBACK" });
  });

  it("falls back safely when the LLM analyzer fails", async () => {
    const result = await resolveAssistantIntent("เล่าให้ฟังหน่อยว่ามันพิเศษยังไง", {
      isReady: () => true,
      analyze: vi.fn().mockRejectedValue(new Error("timeout")),
    });

    expect(result).toEqual({
      intent: "GENERAL",
      confidence: 0,
      source: "FALLBACK",
    });
  });
});
