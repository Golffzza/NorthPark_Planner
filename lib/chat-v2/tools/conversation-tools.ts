// ./lib/chat-v2/tools/conversation-tools.ts

import { tool } from "ai";
import { z } from "zod";

import type { ParkReference } from "@/lib/chat/shared/contracts";
import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";
import { mergeRecommendationConstraints } from "@/lib/chat-v2/state/recommendation-constraints";
import { executeCompareParks } from "@/lib/chat-v2/tools/compare-parks";
import { executeGetParkInfo } from "@/lib/chat-v2/tools/get-park-info";
import { executeGetParkKnowledge } from "@/lib/chat-v2/tools/get-park-knowledge";
import {
  executeRecommendParks,
  recommendParksInputSchema,
} from "@/lib/chat-v2/tools/recommend-parks";
import { executeSearchParks } from "@/lib/chat-v2/tools/search-parks";
import { createSelectParkTool } from "@/lib/chat-v2/tools/select-park";
import type { AssistantV2TurnContext } from "@/lib/chat-v2/tools/turn-context";
import {
  ACTIVITY_WORDS,
  isNegated,
  normalizeQuery,
} from "@/lib/chat/core/query-signals";

const parkTopicSchema = z.enum(["province", "activities", "camping", "basic"]);

const statefulSearchParksInputSchema = z.object({
  province: z.string().trim().optional(),
  operation: z
    .enum(["COUNT", "LIST"])
    .optional()
    .describe("COUNT เมื่อถามจำนวน และ LIST เมื่อขอรายชื่อ"),
});

const statefulGetParkInfoInputSchema = z.object({
  parkName: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("เว้นว่างเพื่อใช้ Selected park"),
  position: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("ลำดับแบบเริ่มจาก 1 ใน Current results"),
  topic: parkTopicSchema,
});

const statefulRecommendParksInputSchema = recommendParksInputSchema.extend({
  reset: z
    .boolean()
    .optional()
    .describe("true เมื่อต้องล้างความชอบเดิมทั้งหมดก่อนใช้ค่ารอบนี้"),
});

function extractExplicitActivityPatch(message: string): {
  activities?: string[];
  excludedActivities?: string[];
} {
  const normalizedMessage = normalizeQuery(message);

  const activities: string[] = [];
  const excludedActivities: string[] = [];

  for (const [activityType, words] of Object.entries(ACTIVITY_WORDS)) {
    let latestPosition = -1;

    for (const word of words) {
      const normalizedWord = normalizeQuery(word);
      const position = normalizedMessage.lastIndexOf(normalizedWord);

      if (position > latestPosition) {
        latestPosition = position;
      }
    }

    if (latestPosition < 0) {
      continue;
    }

    if (isNegated(normalizedMessage, latestPosition)) {
      excludedActivities.push(activityType);
    } else {
      activities.push(activityType);
    }
  }

  return {
    ...(activities.length > 0 ? { activities } : {}),
    ...(excludedActivities.length > 0 ? { excludedActivities } : {}),
  };
}

const statefulCompareParksInputSchema = z.object({
  parkNames: z.array(z.string().trim().min(1)).min(2).max(3).optional(),
  positions: z
    .array(z.number().int().positive())
    .min(2)
    .max(3)
    .optional()
    .describe("ลำดับแบบเริ่มจาก 1 ใน Current results และต้องรักษาลำดับนี้"),
  reference: z.enum(["FIRST_TWO_RESULTS", "LAST_COMPARED"]).optional(),
  question: z.string().trim().optional(),
});

const statefulGetParkKnowledgeInputSchema = z.object({
  parkName: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("เว้นว่างเพื่อใช้ Selected park เมื่อเป็นคำถามต่อเนื่อง"),
  position: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("ลำดับแบบเริ่มจาก 1 ใน Current results"),
  question: z.string().trim().min(1),
});

type ParkReferenceFailure = {
  status: "REFERENCE_ERROR";
  reason: "NO_PARK_CONTEXT" | "AMBIGUOUS_REFERENCE" | "INVALID_POSITION";
  candidates: ParkReference[];
};

function toReference(park: {
  id: string;
  slug: string;
  name: string;
}): ParkReference {
  return { id: park.id, slug: park.slug, name: park.name };
}

function setCurrentResults(
  state: AssistantV2ConversationState,
  parks: Array<{ id: string; slug: string; name: string }>,
): void {
  state.currentResults = parks.map(toReference);
  if (
    state.selectedPark &&
    !state.currentResults.some((park) => park.id === state.selectedPark?.id)
  ) {
    state.selectedPark = undefined;
  }
}

function referenceFailure(
  state: AssistantV2ConversationState,
  reason: ParkReferenceFailure["reason"],
): ParkReferenceFailure {
  return {
    status: "REFERENCE_ERROR",
    reason,
    candidates: state.currentResults.map((park) => ({ ...park })),
  };
}

function resolveParkNameFromState(
  state: AssistantV2ConversationState,
  input: { parkName?: string; position?: number },
): { parkName: string } | ParkReferenceFailure {
  if (input.position !== undefined) {
    const park = state.currentResults[input.position - 1];
    return park
      ? { parkName: park.name }
      : referenceFailure(state, "INVALID_POSITION");
  }

  if (input.parkName) return { parkName: input.parkName };
  if (state.selectedPark) return { parkName: state.selectedPark.name };
  if (state.currentResults.length === 1) {
    return { parkName: state.currentResults[0].name };
  }
  return referenceFailure(
    state,
    state.currentResults.length > 1 ? "AMBIGUOUS_REFERENCE" : "NO_PARK_CONTEXT",
  );
}

function resolveComparisonNames(
  state: AssistantV2ConversationState,
  input: z.infer<typeof statefulCompareParksInputSchema>,
): { parkNames: string[] } | ParkReferenceFailure {
  if (input.positions) {
    const parks = input.positions.map(
      (position) => state.currentResults[position - 1],
    );
    return parks.every((park): park is ParkReference => Boolean(park))
      ? { parkNames: parks.map((park) => park.name) }
      : referenceFailure(state, "INVALID_POSITION");
  }

  if (input.reference === "FIRST_TWO_RESULTS") {
    return state.currentResults.length >= 2
      ? { parkNames: state.currentResults.slice(0, 2).map((park) => park.name) }
      : referenceFailure(state, "INVALID_POSITION");
  }

  if (input.reference === "LAST_COMPARED") {
    return state.lastComparedParks.length >= 2
      ? { parkNames: state.lastComparedParks.map((park) => park.name) }
      : referenceFailure(state, "NO_PARK_CONTEXT");
  }

  if (input.parkNames) return { parkNames: input.parkNames };
  return referenceFailure(state, "AMBIGUOUS_REFERENCE");
}

export function createConversationAwareAssistantV2Tools(
  context: AssistantV2TurnContext,
) {
  return {
    searchParks: tool({
      description:
        "นับหรือแสดงรายชื่ออุทยาน NorthPark ทั้งหมดหรือตามจังหวัด ไม่ใช้แทนคำแนะนำ",
      inputSchema: statefulSearchParksInputSchema,
      execute: async (input) =>
        context.runExclusive(async (state) => {
          const result = executeSearchParks({
            province: input.province,
          });

          if (input.province) {
            state.userConstraints = {
              ...state.userConstraints,
              province: input.province,
            };
          }

          setCurrentResults(state, result.parks);

          return result;
        }),
      toModelOutput: ({ input, output }) => ({
        type: "json",
        value:
          input.operation === "COUNT"
            ? {
                scope: output.scope,
                coverage: output.coverage,
                coverageNote: output.coverageNote,
                ...(output.province ? { province: output.province } : {}),
                count: output.count,
              }
            : output,
      }),
    }),
    getParkInfo: tool({
      description:
        "ข้อมูลจังหวัด กิจกรรม การกางเต็นท์ หรือข้อมูลพื้นฐานของอุทยานหนึ่งแห่ง ใช้ position สำหรับที่แรก/ที่สอง และเว้นชื่อเพื่อใช้ Selected park",
      inputSchema: statefulGetParkInfoInputSchema,
      execute: async (input) =>
        context.runExclusive(async (state) => {
          const resolved = resolveParkNameFromState(state, input);
          if ("status" in resolved) return resolved;
          const result = await executeGetParkInfo({
            parkName: resolved.parkName,
            topic: input.topic,
          });
          if ("found" in result && result.found) {
            state.selectedPark = toReference(result.park);
          }
          return result;
        }),
    }),
    recommendParks: tool({
      description:
        "แนะนำอุทยานโดย argument เป็น patch ของ Current preferences: ช่องที่ไม่ส่งจะคงเดิม, activities ใส่กิจกรรมที่ผู้ใช้เพิ่มหรือขอ, excludedActivities ใส่กิจกรรมที่ผู้ใช้ปฏิเสธ, เปลี่ยนจังหวัดให้ส่งจังหวัดใหม่, ไปคนเดียวให้ส่ง companions:[]",
      inputSchema: statefulRecommendParksInputSchema,
      execute: async (input) =>
        context.runExclusive(async (state) => {
          const modelMergedConstraints = mergeRecommendationConstraints(
            state.userConstraints,
            input,
          );

          const explicitActivityPatch = extractExplicitActivityPatch(
            context.currentMessage,
          );

          const constraints = mergeRecommendationConstraints(
            modelMergedConstraints,
            explicitActivityPatch,
          );
          const result = await executeRecommendParks(
            recommendParksInputSchema.parse(constraints),
          );
          state.userConstraints = structuredClone(result.constraints);
          setCurrentResults(
            state,
            result.recommendations.map((recommendation) => recommendation.park),
          );
          return result;
        }),
    }),
    compareParks: tool({
      description:
        "เปรียบเทียบ 2-3 อุทยาน ใช้ positions หรือ FIRST_TWO_RESULTS สำหรับลำดับใน Current results และ LAST_COMPARED สำหรับสองที่ที่เพิ่งเปรียบเทียบ ห้ามเดาอุทยาน",
      inputSchema: statefulCompareParksInputSchema,
      execute: async (input) =>
        context.runExclusive(async (state) => {
          const resolved = resolveComparisonNames(state, input);
          if ("status" in resolved) return resolved;
          const result = await executeCompareParks({
            parkNames: resolved.parkNames,
            question: input.question,
          });
          if (result.status === "OK") {
            state.lastComparedParks = result.comparison.parks.map(({ park }) =>
              toReference(park),
            );
          }
          return result;
        }),
    }),
    getParkKnowledge: tool({
      description:
        "ข้อมูลเชิงลึกของอุทยานจาก RAG เช่น ภาพรวม จุดเด่น การเดินทาง ถนน ที่จอดรถ สิ่งอำนวยความสะดวก ห้องน้ำ ร้านอาหาร การเดิน ความยาก เด็ก ผู้สูงอายุ accessibility ความปลอดภัย ฤดูกาล และรูปแบบการเที่ยว ใช้ position สำหรับผลลัพธ์ตามลำดับ และเว้น parkName เพื่อใช้ Selected park",
      inputSchema: statefulGetParkKnowledgeInputSchema,
      execute: async (input, options) =>
        context.runExclusive(async (state) => {
          if (
            !input.parkName &&
            input.position === undefined &&
            !state.selectedPark &&
            state.currentResults.length === 0
          ) {
            return executeGetParkKnowledge(
              { question: input.question },
              {},
              options.abortSignal ?? context.signal,
            );
          }
          const resolved = resolveParkNameFromState(state, input);
          if ("status" in resolved) return resolved;
          const result = await executeGetParkKnowledge(
            { parkName: resolved.parkName, question: input.question },
            {},
            options.abortSignal ?? context.signal,
          );
          if (result.status === "OK" && result.park) {
            state.selectedPark = toReference(result.park);
          }
          return result;
        }),
    }),
    selectPark: createSelectParkTool(context),
    findNearbyParks: tool({
      description:
        "ค้นหาอุทยานที่ใกล้และเดินทางสะดวกที่สุดจากจังหวัดต้นทางหรือพิกัด เช่น 'เดินทางจากกำแพงเพชร', 'จากเชียงใหม่', หรือพิกัด lat/lng",
      inputSchema: z.object({
        province: z.string().trim().optional().describe("ชื่อจังหวัดต้นทาง เช่น กำแพงเพชร, เชียงใหม่, ตาก"),
        lat: z.number().optional().describe("ละติจูดต้นทาง (ถ้ามี)"),
        lng: z.number().optional().describe("ลองจิจูดต้นทาง (ถ้ามี)"),
      }),
      execute: async (input) =>
        context.runExclusive(async (state) => {
          const { findNearbyParksFromOrigin } = await import("@/lib/services/province-route-service");
          const query = input.province || (input.lat !== undefined && input.lng !== undefined ? { lat: input.lat, lng: input.lng } : undefined);
          if (!query) {
            return { status: "ERROR", message: "กรุณาระบุจังหวัดต้นทางหรือพิกัด" };
          }
          const result = findNearbyParksFromOrigin(query, 4);
          if (!result) {
            return { status: "NOT_FOUND", message: `ไม่พบข้อมูลพิกัดของจังหวัด ${input.province}` };
          }

          const mappedParks = result.parks.map((p) => ({
            id: p.slug,
            slug: p.slug,
            name: p.nameTh,
          }));

          setCurrentResults(state, mappedParks);
          if (mappedParks.length > 0) {
            state.selectedPark = mappedParks[0];
          }

          return {
            status: "OK",
            origin: result.originName,
            originCoordinates: { lat: result.originLat, lng: result.originLng },
            nearestParks: result.parks.map((p) => ({
              parkName: p.nameTh,
              province: p.province,
              distanceKm: p.distanceKm,
              estimatedDrivingMinutes: p.estimatedDrivingMinutes,
              openingHours: `${p.openTime} - ${p.closeTime}`,
              hasCampsite: p.hasCampsite,
              highlight: p.highlightAttraction,
            })),
          };
        }),
    }),
  };
}
