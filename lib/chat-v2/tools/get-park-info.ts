import { tool } from "ai";
import { z } from "zod";

import { parseActivityEvidence } from "@/lib/chat/core/activity-evidence";
import { findMentionedParks } from "@/lib/chat/core/park-catalog";
import { parkFeeDictionary } from "@/lib/data/park-fees";
import { parkContactDictionary } from "@/lib/data/park-addresses";
import { getParkDetail, NotFoundError } from "@/lib/services/park-service";
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
  topic: z.enum(["province", "activities", "camping", "basic", "hours", "fees", "contact"]),
});

export type GetParkInfoInput = z.infer<typeof getParkInfoInputSchema>;

type GetParkInfoDependencies = {
  findMentionedParks?: ParkResolver;
  findByParkSlugs?: (slugs: string[]) => Promise<RetrievedKnowledgeChunk[]>;
  getParkDetail?: typeof getParkDetail;
};

const HOURS_FRESHNESS_NOTE =
  "เวลานี้เป็นข้อมูลที่บันทึกไว้ในฐานข้อมูล ไม่ได้ยืนยันว่าเปิดวันนี้หรือเปิดทุกวัน โปรดตรวจประกาศล่าสุดของอุทยาน";

async function readRecordedHours(
  slug: string,
  readDetail: typeof getParkDetail,
) {
  try {
    const detail = await readDetail(slug);
    return detail.openTime && detail.closeTime
      ? { openTime: detail.openTime, closeTime: detail.closeTime }
      : undefined;
  } catch (error) {
    if (error instanceof NotFoundError) return undefined;
    throw error;
  }
}

function getCampingContext(chunks: RetrievedKnowledgeChunk[]): string | undefined {
  for (const chunk of chunks) {
    if (chunk.section !== "facilities") continue;
    const line = chunk.content.split(/\r?\n/).find((value) =>
      value.includes("camping_facilities:")
    );
    const context = line?.replace(/^.*camping_facilities:\*{0,2}\s*/, "").trim();
    if (context && !/^UNKNOWN\b/i.test(context)) return context;
  }
  return undefined;
}

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

  if (input.topic === "fees") {
    const feeInfo = parkFeeDictionary[park.slug];
    return feeInfo
      ? {
          found: true as const,
          park: parkSummary,
          topic: input.topic,
          status: "RECORDED" as const,
          fees: {
            ...feeInfo,
            vehicles: { ...feeInfo.vehicles },
            freeExemptions: [...feeInfo.freeExemptions],
          },
          source: "PARK_FEE_DICTIONARY" as const,
          currentStatusVerified: false,
          freshnessNote: `${feeInfo.notes ?? "อัตราที่บันทึกไว้ในระบบ"}; ไม่ได้ยืนยันอัตราปัจจุบัน โปรดตรวจประกาศล่าสุดของอุทยาน`,
        }
      : {
          found: true as const,
          park: parkSummary,
          topic: input.topic,
          status: "UNKNOWN" as const,
          currentStatusVerified: false,
        };
  }

  if (input.topic === "contact") {
    const contact = parkContactDictionary[park.slug];
    return contact
      ? {
          found: true as const,
          park: parkSummary,
          topic: input.topic,
          status: "RECORDED" as const,
          contact: { ...contact },
          source: "PARK_CONTACT_DICTIONARY" as const,
          currentStatusVerified: false,
          freshnessNote: "ที่อยู่และช่องทางติดต่อเป็นข้อมูลที่บันทึกไว้ ยังไม่ยืนยันว่าข้อมูลติดต่อปัจจุบันไม่เปลี่ยนแปลง",
        }
      : {
          found: true as const,
          park: parkSummary,
          topic: input.topic,
          status: "UNKNOWN" as const,
          currentStatusVerified: false,
        };
  }

  if (input.topic === "hours") {
    const openingHours = await readRecordedHours(
      park.slug,
      dependencies.getParkDetail ?? getParkDetail,
    );
    return {
      found: true as const,
      park: parkSummary,
      topic: input.topic,
      status: openingHours ? "RECORDED" as const : "UNKNOWN" as const,
      ...(openingHours ? { openingHours } : {}),
      source: "PARK_DATABASE" as const,
      currentStatusVerified: false,
      freshnessNote: HOURS_FRESHNESS_NOTE,
    };
  }

  if (input.topic === "basic") {
    const openingHours = await readRecordedHours(
      park.slug,
      dependencies.getParkDetail ?? getParkDetail,
    );
    const contact = parkContactDictionary[park.slug];
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
        ...(openingHours ? { openingHours: {
          ...openingHours,
          currentStatusVerified: false,
          freshnessNote: HOURS_FRESHNESS_NOTE,
        } } : {}),
        ...(contact ? { recordedContact: {
          ...contact,
          currentStatusVerified: false,
        } } : {}),
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
  const campingContext = getCampingContext(chunks);
  return {
    found: true as const,
    park: parkSummary,
    topic: input.topic,
    status: campsites.length || campingContext ? "EVIDENCE_FOUND" as const : "UNKNOWN" as const,
    campsites,
    ...(campingContext ? { campingContext } : {}),
    note: campsites.length || campingContext
      ? "พบข้อมูลพื้นที่กางเต็นท์ในฐานความรู้ แต่ไม่ใช่การยืนยันการเปิดให้บริการหรือที่ว่างปัจจุบัน"
      : "ไม่พบหลักฐาน CAMPSITE เพียงพอ จึงสรุปไม่ได้ว่าอนุญาตหรือห้ามกางเต็นท์",
  };
}

export function createGetParkInfoTool() {
  return tool({
    description:
      "ข้อมูลอุทยานที่ระบุชื่อ: จังหวัด ข้อมูลพื้นฐาน เวลาเปิดปิดที่บันทึกไว้ (hours) ค่าเข้าที่บันทึกไว้ (fees) ที่อยู่และช่องทางติดต่อที่บันทึกไว้ (contact) กิจกรรม และหลักฐานการกางเต็นท์ ข้อมูลเหล่านี้ไม่ยืนยันสถานะปัจจุบัน",
    inputSchema: getParkInfoInputSchema,
    execute: async (input) => executeGetParkInfo(input),
  });
}
