// ./lib/chat/shared/contracts.ts

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatRequest = {
  message: string;
  conversationId?: string;
};

export type AssistantIntent =
  | "SYSTEM_FACT"
  | "PARK_INFO"
  | "PARK_SEARCH"
  | "RECOMMEND"
  | "COMPARE"
  | "GENERAL";

export type IntentResult = {
  intent: AssistantIntent;
  confidence: number;
  source: "RULE" | "LLM" | "FALLBACK";
};

export type ParkReference = {
  id: string;
  slug: string;
  name: string;
};

export type AssistantConstraints = {
  province?: string;
  activities?: string[];
  fatigue?: "LOW" | "MEDIUM" | "HIGH";
  companions?: string[];
  durationDays?: number;
  excludedActivities?: string[];
};

export type AssistantContext = {
  lastIntent?: AssistantIntent;
  userConstraints?: AssistantConstraints;
  lastParkResults?: ParkReference[];
  lastRecommendedParks?: ParkReference[];
  lastComparedParks?: ParkReference[];
  selectedPark?: ParkReference;
};

export type AssistantSource = {
  id: string;
  title: string;
  url?: string;
  sourceType?: string;
};

export type AssistantRecommendation = {
  park: ParkReference;
  reasons: string[];
  matchedConstraints: string[];
};

export type AssistantComparisonItem = {
  park: ParkReference;
  provinces: string[];
  highlights: string[];
};

export type AssistantComparison = {
  parks: AssistantComparisonItem[];
  summary: string;
};

export type ChatResponse = {
  conversationId: string;
  message: string;
  contextSummary?: AssistantContext;
  recommendations?: AssistantRecommendation[];
  comparison?: AssistantComparison;
  sources?: AssistantSource[];
};

export interface LlmProvider {
  chat(messages: ChatMessage[], options?: LlmChatOptions): Promise<string>;
  /** Starts provider-specific preparation without blocking the user request. */
  prepare?(): Promise<void>;
  /** Lets latency-sensitive callers use a deterministic fallback until preparation finishes. */
  isPrepared?(): boolean;
}

export type LlmChatOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  numPredict?: number;
  temperature?: number;
  format?: "json";
};