// ./lib/chat-v2/ai/model.ts

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

type AssistantV2Environment = Readonly<
  Record<string, string | undefined>
>;

export function getAssistantV2BaseUrl(
  environment: AssistantV2Environment = process.env,
): string {
  const configured =
    environment.OLLAMA_BASE_URL?.trim();

  if (!configured) {
    return "http://localhost:11434/v1";
  }

  const withoutTrailingSlash =
    configured.replace(/\/+$/, "");

  return withoutTrailingSlash.endsWith("/v1")
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/v1`;
}

export function getAssistantV2ModelId(
  environment: AssistantV2Environment = process.env,
): string {
  return (
    environment.OLLAMA_MODEL?.trim() ||
    "northpark-qwen"
  );
}

export const ASSISTANT_V2_MODEL_ID =
  getAssistantV2ModelId();

const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: getAssistantV2BaseUrl(),
  apiKey: "ollama",
});

export const assistantV2Model =
  ollama.chatModel(ASSISTANT_V2_MODEL_ID);