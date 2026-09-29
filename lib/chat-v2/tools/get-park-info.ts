import { tool } from "ai";
import { z } from "zod";

import { parseActivityEvidence } from "@/lib/chat/core/activity-evidence";
import { findMentionedParks } from "@/lib/chat/core/park-catalog";
import {
  knowledgeRetriever,
  type RetrievedKnowledgeChunk,
} from "@/lib/chat/rag/knowledge-retriever";
import type { ActivityEvidenceView } from "@/lib/chat-v2/shared/contracts";
import {
  resolveSinglePark,
  toParkSummary,
  type ParkResolver,
} from "@/lib/chat-v2/tools/park-resolution";

export const getParkInfoInputSchema = z.object({
  parkName: z.string().trim().min(1),
  topic: z.enum(["province", "activities", "camping", "basic"]),
});

export type GetParkInfoInput = z.infer<typeof getParkInfoInputSchema>;

type GetParkInfoDependencies = {
  findMentionedParks?: ParkResolver;
  findByParkSlugs?: (slugs: string[]) => Promise<RetrievedKnowledgeChunk[]>;
};

function toActivityView(chunk: RetrievedKnowledgeChunk): ActivityEvidenceView | undefined {
  const activity = parseActivityEvidence(chunk);
  if (!activity) return undefined;

  return {
    type: activity.type,
    name: activity.name,
    ...(activity.summary ? { summary: activity.summary } : {}),
    ...(activity.difficulty ? { difficulty: activity.difficulty } : {}),
    ...(activity.walking ? { walking: activity.walking } : {}),
    ...(activity.risks ? { risks: activity.risks } : {}),
    chunkId: chunk.id,
    section: chunk.section,
  };
}

function uniqueActivities(chunks: RetrievedKnowledgeChunk[]): ActivityEvidenceView[] {
  const activities = chunks
    .map(toActivityView)
    .filter((activity): activity is ActivityEvidenceView => Boolean(activity));

  return [...new Map(
    activities.map((activity) => [`${activity.type}:${activity.name}`, activity]),
  ).values()];
}

export async function executeGetParkInfo(
  input: GetParkInfoInput,
  dependencies: GetParkInfoDependencies = {},
) {
  const resolved = resolveSinglePark(
    input.parkName,
    dependencies.findMentionedParks ?? findMentionedParks,
  );
  if (!resolved.found) return resolved;

  const { park } = resolved;
  const parkSummary = toParkSummary(park);

  if (input.topic === "province") {
    return {
      found: true as const,
      park: parkSummary,
      topic: input.topic,
      provinces: [...park.provinces],
    };
  }

  if (input.topic === "basic") {
    return {
      found: true as const,
      park: parkSummary,
      topic: input.topic,
      basic: {
        id: park.id,
        slug: park.slug,
        name: park.name,
        nameEn: park.nameEn,
        provinces: [...park.provinces],
        legalStatus: park.legalStatus,
        tags: [...park.tags],
        attractionCount: park.attractionCount,
        verifiedAt: park.verifiedAt,
      },
    };
  }

  const chunks = await (
    dependencies.findByParkSlugs ?? knowledgeRetriever.findByParkSlugs.bind(knowledgeRetriever)
  )([park.slug]);
  const activities = uniqueActivities(chunks);

  if (input.topic === "activities") {
    return {
      found: true as const,
      park: parkSummary,
      topic: input.topic,
      activities,
    };
  }

  const campsites = activities.filter((activity) => activity.type === "CAMPSITE");
  return {
    found: true as const,
    park: parkSummary,
    topic: input.topic,
    status: campsites.length ? "EVIDENCE_FOUND" as const : "UNKNOWN" as const,
    campsites,
    note: campsites.length
      ? "พบหลักฐานกิจกรรมประเภท CAMPSITE ในฐานความรู้ แต่ไม่ใช่การยืนยันสถานะเปิดให้บริการปัจจุบัน"
      : "ไม่พบหลักฐาน CAMPSITE เพียงพอ จึงสรุปไม่ได้ว่าอนุญาตหรือห้ามกางเต็นท์",
  };
}

export function createGetParkInfoTool() {
  return tool({
    description:
      "ต้องใช้ก่อนตอบข้อเท็จจริงแบบมีโครงสร้างของอุทยานหนึ่งแห่ง: จังหวัด ข้อมูลพื้นฐาน กิจกรรม หรือหลักฐานการกางเต็นท์ ห้ามตอบจากความจำ",
    inputSchema: getParkInfoInputSchema,
    execute: async (input) => executeGetParkInfo(input),
  });
}
