import type { AssistantComparison, AssistantConstraints, AssistantRecommendation } from "@/lib/chat/shared/contracts";

export type ParkSummary = {
  id: string;
  slug: string;
  name: string;
  provinces: string[];
};

export type ParkResolutionFailure = {
  found: false;
  ambiguous: boolean;
  parkName: string;
  candidates: ParkSummary[];
};

export type ActivityEvidenceView = {
  type: string;
  name: string;
  summary?: string;
  difficulty?: string;
  walking?: string;
  risks?: string;
  chunkId: string;
  section: string;
};

export type SearchParksResult = {
  scope: "ALL" | "PROVINCE";
  coverage: "NORTHPARK_CATALOG";
  coverageNote: string;
  province?: string;
  count: number;
  parks: ParkSummary[];
};

export type RecommendParksResult = {
  constraints: AssistantConstraints;
  candidateCount: number;
  count: number;
  recommendations: AssistantRecommendation[];
  limitations: {
    durationDaysAffectsRanking: false;
  };
};

export type CompareParksResult =
  | {
      status: "OK";
      comparison: AssistantComparison;
    }
  | {
      status: "UNRESOLVED";
      unresolved: Array<{
        parkName: string;
        reason: "NOT_FOUND" | "AMBIGUOUS";
        candidates: ParkSummary[];
      }>;
    };

export type ParkKnowledgeChunk = {
  chunkId: string;
  slug: string;
  parkTitle: string;
  title: string;
  section: string;
  content: string;
};

export type AssistantV2ToolCallDiagnostic = {
  toolName: string;
  input: unknown;
  output?: unknown;
};

export type AssistantV2Diagnostics = {
  elapsedMs: number;
  toolsUsed: string[];
  toolCalls: AssistantV2ToolCallDiagnostic[];
  stepCount: number;
};

export type AssistantV2Response = {
  conversationId: string;
  message: string;
  diagnostics: AssistantV2Diagnostics;
};

export type AssistantV2Request = {
  message: string;
  conversationId?: string;
};
