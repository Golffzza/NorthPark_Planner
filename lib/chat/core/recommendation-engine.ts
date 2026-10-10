// ./lib/chat/core/recommendation-engine.ts

import type { AssistantConstraints, AssistantRecommendation } from "@/lib/chat/shared/contracts";
import type { RetrievedKnowledgeChunk } from "@/lib/chat/rag/knowledge-retriever";
import type { ParkCatalogEntry } from "./park-catalog";
import {
  activityPreferenceScore,
  isCompatibleEffort,
  parseActivityEvidence,
  sortActivityEvidence,
  type ActivityEvidence,
} from "./activity-evidence";

function reportsIndefiniteClosure(chunk: RetrievedKnowledgeChunk): boolean {
  if (chunk.section !== "dynamic" && chunk.section !== "overview") return false;
  return /CLOSED\s+INDEFINITELY|ปิด(?:การท่องเที่ยว)?(?:แบบ)?ไม่มีกำหนด|ปิดไม่มีกำหนด/i
    .test(chunk.content);
}

export function recommendParks(
  parks: ParkCatalogEntry[],
  constraints: AssistantConstraints,
  limit = 3,
  evidence: RetrievedKnowledgeChunk[] = [],
): AssistantRecommendation[] {
  const byPark = new Map<string, ActivityEvidence[]>();
  const closedParks = new Set(
    evidence.filter(reportsIndefiniteClosure).map((chunk) => chunk.slug),
  );
  for (const chunk of evidence) {
    const activity = parseActivityEvidence(chunk);
    if (!activity) continue;
    byPark.set(chunk.slug, [...(byPark.get(chunk.slug) ?? []), activity]);
  }
  const requested = constraints.activities ?? [];
  const excluded = new Set(constraints.excludedActivities ?? []);

  return parks
    .filter((park) => !constraints.province || park.provinces.includes(constraints.province))
    .filter((park) => park.legalStatus !== "PREPARATORY")
    .filter((park) => !park.tags.includes("closed-last-known") && !closedParks.has(park.slug))
    .map((park) => {
      const allActivities = (byPark.get(park.slug) ?? []).filter((item) => !excluded.has(item.type));
      if (allActivities.length === 0) return undefined;
      if (requested.some((type) => !allActivities.some((item) => item.type === type))) return undefined;
      const relevant = allActivities.filter((item) =>
        (requested.length === 0 || requested.includes(item.type)) && isCompatibleEffort(item, constraints.fatigue),
      );
      if (relevant.length === 0) return undefined;
      const ranked = sortActivityEvidence(relevant, constraints.fatigue);
      const selectedActivities = requested.length
        ? requested.map((type) => ranked.find((item) => item.type === type))
          .filter((item): item is ActivityEvidence => Boolean(item))
        : ranked.slice(0, 1);
      if (selectedActivities.length !== Math.max(1, requested.length)) return undefined;

      const reasons = selectedActivities.flatMap((activity) => [
        `${activity.name}${activity.summary ? `: ${activity.summary}` : ""}`,
        [activity.walking && `ระยะเดิน ${activity.walking}`, activity.difficulty && `ความยาก ${activity.difficulty}`].filter(Boolean).join("; "),
        activity.risks && `ข้อควรระวัง: ${activity.risks}`,
      ]).filter((value): value is string => Boolean(value));
      if (constraints.companions?.includes("ELDERLY")) {
        reasons.push("ยังไม่ยืนยันว่าเหมาะกับผู้สูงอายุหรือรองรับการเข้าถึง ต้องประเมินสภาพทางและผู้ร่วมทริปก่อน");
      }
      const matchedConstraints = [
        ...(constraints.province ? ["province"] : []),
        ...requested.map((activity) => `activity:${activity}`),
        ...(constraints.fatigue ? [`fatigue:${constraints.fatigue}`] : []),
        ...(constraints.companions?.length ? ["companions"] : []),
      ];
      const score = selectedActivities.reduce(
        (total, activity) => total + activityPreferenceScore(activity, constraints.fatigue),
        0,
      );
      return { park, reasons, matchedConstraints, score };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.score - a.score || a.park.name.localeCompare(b.park.name, "th"))
    .slice(0, limit)
    .map((item) => ({
      park: item.park,
      reasons: item.reasons,
      matchedConstraints: item.matchedConstraints,
    }));
}