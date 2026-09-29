import { describe, expect, it } from "vitest";

import {
  getAssistantV2BaseUrl,
  getAssistantV2ModelId,
} from "@/lib/chat-v2/ai/model";

describe("Assistant V2 model configuration", () => {
  it("keeps the manually verified qwen model", () => {
    expect(getAssistantV2ModelId({})).toBe("northpark-qwen");
    expect(getAssistantV2ModelId({ OLLAMA_MODEL: "qwen3:4b-instruct" }))
      .toBe("qwen3:4b-instruct");
  });

  it("uses the Ollama OpenAI-compatible endpoint", () => {
    expect(getAssistantV2BaseUrl({})).toBe("http://localhost:11434/v1");
    expect(getAssistantV2BaseUrl({ OLLAMA_BASE_URL: "http://ollama:11434" }))
      .toBe("http://ollama:11434/v1");
    expect(getAssistantV2BaseUrl({ OLLAMA_BASE_URL: "http://ollama:11434/v1/" }))
      .toBe("http://ollama:11434/v1");
  });
});
