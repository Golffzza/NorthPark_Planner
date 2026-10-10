// ./lib/chat-v2/tools/recommend-parks.ts

import { tool } from "ai";
import { z } from "zod";

import { parseActivityEvidence } from "@/lib/chat/core/activity-evidence";
import { getParkCatalog } from "@/lib/chat/core/park-catalog";
import { recommendParks } from "@/lib/chat/core/recommendation-engine";
import { ACTIVITY_WORDS } from "@/lib/chat/core/query-signals";
import {
  knowledgeRetriever,
  type RetrievedKnowledgeChunk,
} from "@/lib/chat/rag/knowledge-retriever";
import type {
  AssistantConstraints,
  AssistantRecommendation,
  ParkReference,
} from "@/lib/chat/shared/contracts";
import type { RecommendParksResult } from "@/lib/chat-v2/shared/contracts";

const activityTypes = Object.keys(ACTIVITY_WORDS) as [string, ...string[]];

export const recommendationActivityTypes = [...activityTypes];

export const recommendParksInputSchema = z.object({
  province: z.string().trim().min(1).optional()
    .describe("ใส่เฉพาะจังหวัดที่ผู้ใช้ระบุชัดเจน"),
  activities: z.array(z.enum(activityTypes)).optional()
    .describe("ใส่เฉพาะประเภทกิจกรรมที่ผู้ใช้ขอชัดเจน ห้ามอนุมานจากระดับการเดิน"),
  excludedActivities: z.array(z.enum(activityTypes)).optional()
    .describe("ใส่เฉพาะกิจกรรมที่ผู้ใช้ปฏิเสธชัดเจน"),
  fatigue: z.enum(["LOW", "MEDIUM", "HIGH"]).optional()
    .describe("LOW เมื่อผู้ใช้ขอเดินน้อย MEDIUM เมื่อขอปานกลาง HIGH เมื่อขอท้าทาย"),
  companions: z.array(z.enum(["FAMILY", "ELDERLY"])).optional()
    .describe("พ่อแม่ใช้ FAMILY และ ELDERLY; ห้ามสร้างค่าอื่น"),
  durationDays: z.preprocess((val) => {
    if (typeof val === "number") {
      return val > 0 ? Math.max(1, Math.round(val)) : undefined;
    }
    return val;
  }, z.number().int().positive().optional())
    .describe("จำนวนวันเที่ยวเต็มวัน (1, 2, 3...) หากผู้ใช้ระบุครึ่งวันหรือวันเดย์ทริป ให้ใส่ 1 หรือเว้นว่างไว้"),
});

export type RecommendParksInput = z.infer<typeof recommendParksInputSchema>;

type RecommendParksDependencies = {
  getParkCatalog?: typeof getParkCatalog;
  findByParkSlugs?: (slugs: string[]) => Promise<RetrievedKnowledgeChunk[]>;
  recommendParks?: (
    parks: ReturnType<typeof getParkCatalog>,
    constraints: AssistantConstraints,
    limit: number,
    evidence: RetrievedKnowledgeChunk[],
  ) => AssistantRecommendation[];
};

export function filterExcludedActivityEvidence(
  evidence: RetrievedKnowledgeChunk[],
  excludedActivities: readonly string[] = [],
): RetrievedKnowledgeChunk[] {
  if (!excludedActivities.length) return evidence;

  const excludedTypes = new Set(excludedActivities);
  return evidence.filter((chunk) => {
    const activity = parseActivityEvidence(chunk);
    return !activity || !excludedTypes.has(activity.type);
  });
}

function toRecommendationParkReference(
  park: ParkReference,
): ParkReference {
  return {
    id: park.id,
    slug: park.slug,
    name: park.name,
  };
}

function serializeRecommendations(
  recommendations: AssistantRecommendation[],
): AssistantRecommendation[] {
  return recommendations.map((recommendation) => ({
    park: toRecommendationParkReference(recommendation.park),
    reasons: [...recommendation.reasons],
    matchedConstraints: [...recommendation.matchedConstraints],
  }));
}

export function normalizeProvinceInput(province?: string): string | undefined {
  if (!province) return undefined;
  const trimmed = province.trim();
  if (/^(ภาค)?เหนือ$|^(ภาค)?เหนือ(ตอนบน|ตอนล่าง)$|^ทั่ว(ประเทศ|ภาคเหนือ)?$|^ทั้ง(หมด|ประเทศ)$|^ไทย$/i.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export async function executeRecommendParks(
  input: RecommendParksInput,
  dependencies: RecommendParksDependencies = {},
): Promise<RecommendParksResult> {
  const catalog = (dependencies.getParkCatalog ?? getParkCatalog)();
  const effectiveProvince = normalizeProvinceInput(input.province);
  const candidates = effectiveProvince
    ? catalog.filter((park) => park.provinces.includes(effectiveProvince))
    : catalog;
  const findByParkSlugs = dependencies.findByParkSlugs
    ?? knowledgeRetriever.findByParkSlugs.bind(knowledgeRetriever);
  const evidence = candidates.length
    ? await findByParkSlugs(candidates.map((park) => park.slug))
    : [];
  const eligibleEvidence = filterExcludedActivityEvidence(
    evidence,
    input.excludedActivities,
  );
  const constraints: AssistantConstraints = {
    ...input,
    ...(effectiveProvince ? { province: effectiveProvince } : { province: undefined }),
  };
  const recommendations = serializeRecommendations(
    (dependencies.recommendParks ?? recommendParks)(
      candidates,
      constraints,
      3,
      eligibleEvidence,
    ),
  );

  return {
    constraints,
    candidateCount: candidates.length,
    count: recommendations.length,
    recommendations,
    limitations: {
      durationDaysAffectsRanking: false,
    },
  };
}

export function createRecommendParksTool() {
  return tool({
    description:
      "ใช้เมื่อผู้ใช้ขอคำแนะนำอุทยาน ใส่เฉพาะเงื่อนไขที่ผู้ใช้พูดจริง ห้ามเดากิจกรรม ระยะเวลา หรือระดับความเหนื่อยที่ไม่ได้ระบุ",
    inputSchema: recommendParksInputSchema,
    execute: async (input) => executeRecommendParks(input),
  });
}