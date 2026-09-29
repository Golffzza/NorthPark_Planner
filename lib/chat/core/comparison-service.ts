// ./lib/chat/core/comparison-service.ts

import type { AssistantComparison } from "@/lib/chat/shared/contracts";
import type { ParkCatalogEntry } from "./park-catalog";
import type { RetrievedKnowledgeChunk } from "@/lib/chat/rag/knowledge-retriever";
import { extractContextPatch } from "./assistant-context";
import {
  evidenceField,
  parseActivityEvidence,
  sortActivityEvidence,
} from "./activity-evidence";

export function selectComparisonEvidence(
  parks: ParkCatalogEntry[],
  evidence: RetrievedKnowledgeChunk[],
  question = "",
  limitPerPark = 4,
): RetrievedKnowledgeChunk[] {
  const constraints = extractContextPatch(question);
  const requested = constraints.activities ?? [];
  const excluded = new Set(constraints.excludedActivities ?? []);
  return parks.flatMap((park) => {
    const activities = evidence
      .filter((chunk) => chunk.slug === park.slug)
      .map(parseActivityEvidence)
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => !excluded.has(item.type))
      .filter((item) => requested.length === 0 || requested.includes(item.type));
    const ranked = sortActivityEvidence(activities, constraints.fatigue);
    const requiredMatches = requested
      .map((type) => ranked.find((item) => item.type === type))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    const requiredIds = new Set(requiredMatches.map((item) => item.chunk.id));
    return [
      ...requiredMatches,
      ...ranked.filter((item) => !requiredIds.has(item.chunk.id)),
    ].slice(0, limitPerPark).map((item) => item.chunk);
  });
}

export function compareParks(
  parks: ParkCatalogEntry[],
  evidence: RetrievedKnowledgeChunk[] = [],
  question = "",
): AssistantComparison {
  const selected = parks.slice(0, 3);
  const selectedEvidence = selectComparisonEvidence(selected, evidence, question);
  return {
    parks: selected.map((park) => {
      const attractionEvidence = selectedEvidence.filter((chunk) => chunk.slug === park.slug);
      const highlights = attractionEvidence.slice(0, 4).map((chunk) => {
        const name = chunk.content.match(/^สถานที่:\s*(.+)$/m)?.[1]?.trim() ?? chunk.title;
        const details = [
          evidenceField(chunk.content, "walking") && `เดิน ${evidenceField(chunk.content, "walking")}`,
          evidenceField(chunk.content, "difficulty") && `ความยาก ${evidenceField(chunk.content, "difficulty")}`,
          evidenceField(chunk.content, "risks") && `ระวัง ${evidenceField(chunk.content, "risks")}`,
        ].filter(Boolean).join("; ");
        return `${name}${details ? ` — ${details}` : ""}`;
      });
      return {
        park,
        provinces: [...park.provinces],
        highlights: highlights.length ? highlights : park.tags.slice(0, 5),
      };
    }),
    summary: selectedEvidence.length
      ? "ข้อมูลการเดินและความยากเป็นรายจุดท่องเที่ยว จึงควรเลือกจุดที่จะไปก่อนสรุปว่าอุทยานใดเดินน้อยกว่าครับ"
      : selected.map((park) => `${park.name} มีจุดเด่น ${park.tags.slice(0, 3).join(", ")}`).join("\n"),
  };
}
