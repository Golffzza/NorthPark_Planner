// ./lib/chat/core/activity-evidence.ts

import type { RetrievedKnowledgeChunk } from "@/lib/chat/rag/knowledge-retriever";
import type { AssistantConstraints } from "@/lib/chat/shared/contracts";

export type ActivityEvidence = {
  chunk: RetrievedKnowledgeChunk;
  type: string;
  name: string;
  summary?: string;
  difficulty?: string;
  walking?: string;
  risks?: string;
};

export function evidenceField(content: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content.match(new RegExp(`^- \\*\\*${escaped}:\\*\\*\\s*(.+)$`, "im"))?.[1]
    ?.replaceAll("`", "").trim();
}

export function parseActivityEvidence(
  chunk: RetrievedKnowledgeChunk,
): ActivityEvidence | undefined {
  const type = chunk.section.match(/^attraction:([^:]+):/i)?.[1]?.toUpperCase();
  if (!type) return undefined;
  const contentName = chunk.content.match(/^สถานที่:\s*(.+)$/m)?.[1]?.trim();
  const titleName = chunk.title.split(":").slice(1).join(":").trim();
  return {
    chunk,
    type,
    name: contentName || titleName || chunk.title,
    summary: evidenceField(chunk.content, "summary"),
    difficulty: evidenceField(chunk.content, "difficulty"),
    walking: evidenceField(chunk.content, "walking"),
    risks: evidenceField(chunk.content, "risks"),
  };
}

export function difficultyLevel(value?: string): number | undefined {
  return ({
    LOW: 1,
    "LOW-MODERATE": 2,
    MODERATE: 3,
    "MODERATE-HIGH": 4,
    HIGH: 5,
    VERY_HIGH: 6,
  } as Record<string, number>)[value?.toUpperCase() ?? ""];
}

export function walkingDistanceMetres(value?: string): number | undefined {
  if (!value) return undefined;
  const numbers = [...value.replaceAll(",", "").matchAll(/\d+(?:\.\d+)?/g)]
    .map((match) => Number(match[0]))
    .filter(Number.isFinite);
  if (numbers.length === 0) return undefined;
  const conservativeDistance = Math.max(...numbers);
  if (/กม\.?|กิโลเมตร/i.test(value)) return conservativeDistance * 1_000;
  if (/เมตร|ม\./i.test(value)) return conservativeDistance;
  return undefined;
}

export function isCompatibleEffort(
  activity: ActivityEvidence,
  fatigue?: AssistantConstraints["fatigue"],
): boolean {
  if (!fatigue) return true;
  const level = difficultyLevel(activity.difficulty);
  if (level === undefined) return false;
  if (fatigue === "LOW") return level <= 2;
  if (fatigue === "MEDIUM") return level <= 4;
  return level >= 4;
}

export function activityPreferenceScore(
  activity: ActivityEvidence,
  fatigue?: AssistantConstraints["fatigue"],
): number {
  const evidenceScore = activity.chunk.rankScore + activity.chunk.similarity * 0.1;
  if (!fatigue) return evidenceScore;
  const level = difficultyLevel(activity.difficulty);
  if (level === undefined) return evidenceScore - 100;
  if (fatigue === "LOW") {
    const distance = walkingDistanceMetres(activity.walking);
    const walkingPenalty = distance === undefined ? 15 : Math.min(distance / 100, 40);
    return evidenceScore + (7 - level) * 20 - walkingPenalty;
  }
  if (fatigue === "MEDIUM") {
    return evidenceScore + (6 - Math.abs(level - 3) * 2) * 10;
  }
  return evidenceScore + level * 20;
}

export function sortActivityEvidence(
  activities: ActivityEvidence[],
  fatigue?: AssistantConstraints["fatigue"],
): ActivityEvidence[] {
  return [...activities].sort((a, b) => {
    const scoreDifference = activityPreferenceScore(b, fatigue)
      - activityPreferenceScore(a, fatigue);
    if (scoreDifference !== 0) return scoreDifference;
    const aDistance = walkingDistanceMetres(a.walking) ?? Number.POSITIVE_INFINITY;
    const bDistance = walkingDistanceMetres(b.walking) ?? Number.POSITIVE_INFINITY;
    return aDistance - bDistance || a.name.localeCompare(b.name, "th");
  });
}
