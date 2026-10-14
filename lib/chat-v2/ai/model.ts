// ./lib/chat-v2/ai/model.ts

import { google } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

type AssistantV2Environment = Readonly<
  Record<string, string | undefined>
>;

export type AssistantV2Provider = "ollama" | "gemini";

export function getAssistantV2Provider(
  environment: AssistantV2Environment = process.env,
): AssistantV2Provider {
  return environment.ASSISTANT_V2_PROVIDER?.trim().toLowerCase() === "gemini"
    ? "gemini"
    : "ollama";
}

export function getAssistantV2BaseUrl(
  environment: AssistantV2Environment = process.env,
): string {
  const configured = environment.OLLAMA_BASE_URL?.trim();

  if (!configured) {
    return "http://localhost:11434/v1";
  }

  const url = configured.replace(/\/+$/, "");

  return url.endsWith("/v1") ? url : `${url}/v1`;
}

export function getAssistantV2ModelId(
  environment: AssistantV2Environment = process.env,
): string {
  if (getAssistantV2Provider(environment) === "gemini") {
    return environment.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  }

  return environment.OLLAMA_MODEL?.trim() || "northpark-qwen";
}

export const ASSISTANT_V2_PROVIDER = getAssistantV2Provider();
export const ASSISTANT_V2_MODEL_ID = getAssistantV2ModelId();

const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: getAssistantV2BaseUrl(),
  apiKey: "ollama",
});

if (
  ASSISTANT_V2_PROVIDER === "gemini" &&
  !process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
) {
  throw new Error(
    "GOOGLE_GENERATIVE_AI_API_KEY is required when ASSISTANT_V2_PROVIDER=gemini",
  );
}

export const assistantV2Model =
  ASSISTANT_V2_PROVIDER === "gemini"
    ? google(ASSISTANT_V2_MODEL_ID)
    : ollama.chatModel(ASSISTANT_V2_MODEL_ID);
