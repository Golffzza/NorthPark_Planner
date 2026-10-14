import { describe, expect, it } from "vitest";

import {
  getAssistantV2BaseUrl,
  getAssistantV2ModelId,
  getAssistantV2Provider,
} from "@/lib/chat-v2/ai/model";

describe("Assistant V2 model configuration", () => {
  it("uses Gemini for answer generation when explicitly configured", () => {
    const environment = {
      ASSISTANT_V2_PROVIDER: "gemini",
      GEMINI_MODEL: "gemini-3.5-flash-lite",
      OLLAMA_MODEL: "northpark-qwen",
    };
    expect(getAssistantV2Provider(environment)).toBe("gemini");
    expect(getAssistantV2ModelId(environment)).toBe("gemini-3.5-flash-lite");
  });
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
