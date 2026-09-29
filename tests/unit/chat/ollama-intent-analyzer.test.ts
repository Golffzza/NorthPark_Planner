import { describe, expect, it, vi } from "vitest";

import { OllamaAssistantIntentAnalyzer } from "@/lib/chat/core/ollama-intent-analyzer";
import type { LlmProvider } from "@/lib/chat/shared/contracts";

describe("OllamaAssistantIntentAnalyzer", () => {
  it("accepts only a valid structured intent", async () => {
    const llm: LlmProvider = {
      chat: vi.fn().mockResolvedValue('{"intent":"COMPARE","confidence":0.8}'),
    };
    await expect(new OllamaAssistantIntentAnalyzer(llm).analyze(
      "ช่วยเทียบให้ที",
      undefined,
      { hasParkContext: true },
    )).resolves.toEqual({
      intent: "COMPARE",
      confidence: 0.8,
      source: "LLM",
    });
    expect(llm.chat).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({
      format: "json",
      temperature: 0,
      numPredict: 48,
      timeoutMs: 2500,
    }));
    const messages = vi.mocked(llm.chat).mock.calls[0][0];
    expect(messages[1].content).toContain('"hasParkContext":true');
  });

  it("reports whether the shared Ollama model is ready for a low-latency fallback", () => {
    const llm: LlmProvider = {
      chat: vi.fn(),
      isPrepared: () => false,
    };

    expect(new OllamaAssistantIntentAnalyzer(llm).isReady()).toBe(false);
  });

  it.each(["not json", '{"intent":"WEATHER","confidence":1}', '{"intent":"GENERAL"}'])(
    "rejects malformed output: %s",
    async (output) => {
      const llm: LlmProvider = { chat: vi.fn().mockResolvedValue(output) };
      await expect(
        new OllamaAssistantIntentAnalyzer(llm).analyze("ข้อความกำกวม"),
      ).rejects.toThrow();
    },
  );
});
