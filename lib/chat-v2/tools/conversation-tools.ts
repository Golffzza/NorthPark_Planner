// ./lib/chat-v2/tools/conversation-tools.ts

import { tool } from "ai";
import { z } from "zod";

import { findMentionedParks } from "@/lib/chat/core/park-catalog";
import { provinceCoordinates } from "@/lib/data/province-coordinates";
import type { ParkReference } from "@/lib/chat/shared/contracts";
import {
  ACTIVITY_WORDS,
  isNegated,
  normalizeQuery,
} from "@/lib/chat/core/query-signals";

import {
  setSelectedPark,
  type AssistantV2ConversationState,
} from "@/lib/chat-v2/state/conversation-state";
import { mergeRecommendationConstraints } from "@/lib/chat-v2/state/recommendation-constraints";
import { editTripDraft, tripDraftEditSchema } from "@/lib/chat-v2/state/trip-draft-edit";
import { executeCompareParks } from "@/lib/chat-v2/tools/compare-parks";
import { executeGetParkInfo } from "@/lib/chat-v2/tools/get-park-info";
import { executeGetParkKnowledge } from "@/lib/chat-v2/tools/get-park-knowledge";
import {
  asksForHistoricalWeather,
  executeGetParkWeather,
  getParkWeatherInputSchema,
} from "@/lib/chat-v2/tools/get-park-weather";
import {
  executeGetTripEvaluation,
  getTripEvaluationInputSchema,
} from "@/lib/chat-v2/tools/get-trip-evaluation";
import { resolveSinglePark } from "@/lib/chat-v2/tools/park-resolution";
import {
  nearbyCategorySchema,
  searchNearbyPlacesForPark,
} from "@/lib/services/nearby-places-service";
import {
  executePlanTrip,
  planTripInputSchema,
} from "@/lib/chat-v2/tools/plan-trip";
import {
  executeRecommendParks,
  recommendParksInputSchema,
} from "@/lib/chat-v2/tools/recommend-parks";
import { executeSearchParks } from "@/lib/chat-v2/tools/search-parks";
import {
  createSelectParkTool,
  hasExplicitPositionReference,
} from "@/lib/chat-v2/tools/select-park";
import type { AssistantV2TurnContext } from "@/lib/chat-v2/tools/turn-context";

const parkTopicSchema = z.enum([
  "province",
  "activities",
  "camping",
  "basic",
  "hours",
  "fees",
  "contact",
]);

const statefulSearchParksInputSchema = z.object({
  province: z.string().trim().optional(),
  operation: z.enum(["COUNT", "LIST"]).optional(),
});

const statefulGetParkInfoInputSchema = z.object({
  parkName: z.string().trim().min(1).optional(),
  position: z.number().int().positive().optional(),
  topic: parkTopicSchema,
});

const statefulRecommendParksInputSchema =
  recommendParksInputSchema.extend({
    reset: z.boolean().optional(),
  });

const statefulCompareParksInputSchema = z.object({
  parkNames: z.array(z.string().trim().min(1))
    .min(2)
    .max(3)
    .optional(),
  positions: z.array(z.number().int().positive())
    .min(2)
    .max(3)
    .optional(),
  reference: z.enum([
    "FIRST_TWO_RESULTS",
    "LAST_COMPARED",
  ]).optional(),
  question: z.string().trim().optional(),
});

const statefulGetParkKnowledgeInputSchema = z.object({
  parkName: z.string().trim().min(1).optional(),
  position: z.number().int().positive().optional(),
  question: z.string().trim().min(1),
});

const statefulNearbyPlacesInputSchema = z.object({
  parkName: z.string().trim().min(1).optional(),
  position: z.number().int().positive().optional(),
  placeName: z.string().trim().min(1).optional().describe("Exact nearby place name explicitly supplied by the user when asking about a particular place"),
  categories: z.array(nearbyCategorySchema).min(1).max(5),
  radiusMeters: z.number().int().min(500).max(5000).default(3000),
  limit: z.number().int().min(1).max(20).default(10),
});

function needsExactNearbyPlace(message: string): boolean {
  const query = normalizeQuery(message);
  return /(?:ขับรถ|ขับไป|ไกล|ระยะทาง|ใช้เวลา|กี่นาที|สะดวกไหม)/.test(query)
    && /(?:ร้านนั้น|ร้านที่เจอ|ร้านที่พบ|คาเฟ่นั้น|ที่พักนั้น|โรงแรมนั้น|ที่นั่น|ที่นั้น|แห่งนั้น|ใช้เวลากี่นาที|ถ้าขับรถไปจะสะดวกไหม)/.test(query);
}

function isVagueNearbyPlaceName(name: string): boolean {
  return /^(?:ร้าน(?:อาหาร)?|คาเฟ่|ที่พัก|โรงแรม|ลานกางเต็นท์|สถานที่|ที่|แห่ง)?(?:นั้น|นี้|ที่เจอ|ที่พบ|ใกล้ๆ)?$/.test(normalizeQuery(name));
}

function nearbyPlaceReferenceRequired() {
  return {
    status: "PLACE_REFERENCE_REQUIRED" as const,
    places: [],
    interpretation: "ยังระบุสถานที่ปลายทางที่แน่นอนไม่ได้ กรุณาถามชื่อร้านหรือสถานที่ก่อนตอบระยะทางถนนและเวลาขับรถ",
  };
}

type ParkReferenceFailure = {
  status: "REFERENCE_ERROR";
  reason:
    | "NO_PARK_CONTEXT"
    | "AMBIGUOUS_REFERENCE"
    | "INVALID_POSITION";
  candidates: ParkReference[];
};

function toReference(park: {
  id: string;
  slug: string;
  name: string;
}): ParkReference {
  return {
    id: park.id,
    slug: park.slug,
    name: park.name,
  };
}

function setCurrentResults(
  state: AssistantV2ConversationState,
  parks: Array<{
    id: string;
    slug: string;
    name: string;
  }>,
): void {
  state.currentResults = parks.map(toReference);
  // Tools may use this ranking within the turn. The final answer reconciles it
  // with the list actually shown before the conversation state is committed.
  state.currentResultsOrderVerified = true;

  if (
    state.selectedPark &&
    !state.currentResults.some(
      (park) => park.id === state.selectedPark?.id,
    )
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
    candidates: state.currentResults.map((park) => ({
      ...park,
    })),
  };
}

function extractExplicitActivityPatch(
  message: string,
): {
  activities?: string[];
  excludedActivities?: string[];
} {
  const normalizedMessage = normalizeQuery(message);
  const activities: string[] = [];
  const excludedActivities: string[] = [];

  for (const [activityType, words] of Object.entries(
    ACTIVITY_WORDS,
  )) {
    let latestPosition = -1;

    for (const word of words) {
      const normalizedWord = normalizeQuery(word);
      const position = normalizedMessage.lastIndexOf(
        normalizedWord,
      );

      if (position > latestPosition) {
        latestPosition = position;
      }
    }

    if (latestPosition < 0) continue;

    if (isNegated(normalizedMessage, latestPosition)) {
      excludedActivities.push(activityType);
    } else {
      activities.push(activityType);
    }
  }

  return {
    ...(activities.length > 0 ? { activities } : {}),
    ...(excludedActivities.length > 0
      ? { excludedActivities }
      : {}),
  };
}

function identifiesDraftActivity(message: string, items: string[], position: number): boolean {
  if (items.length <= 1) return true;
  const normalized = normalizeQuery(message);
  const namedPositions = items.flatMap((name, index) =>
    normalized.includes(normalizeQuery(name)) ? [index + 1] : []
  );
  if (namedPositions.length > 0) {
    return namedPositions.length === 1 && namedPositions[0] === position;
  }

  const ordinalWords: Record<string, number> = { "แรก": 1, "หนึ่ง": 1, "สอง": 2, "สาม": 3 };
  const references = [...normalized.matchAll(/(?:กิจกรรม|รายการ)(?:ลำดับ)?(?:ที่)?(แรก|หนึ่ง|สอง|สาม|\d+)/g)]
    .map((match) => ordinalWords[match[1]] ?? Number(match[1]));
  return references.length === 1 && references[0] === position;
}

function isParkNameInMessage(
  parkName: string,
  message: string,
): boolean {
  const normalizedMessage = normalizeQuery(message);
  const normalizedName = normalizeQuery(parkName);
  const shortName = normalizedName.replace(/^อุทยานแห่งชาติ/, "");

  return normalizedMessage.includes(normalizedName) ||
    (shortName.length > 0 && normalizedMessage.includes(shortName));
}

function findRequestedProvince(message: string): string | undefined {
  const normalizedMessage = normalizeQuery(message);
  const mentioned = provinceCoordinates.filter(({ name }) => {
    const position = normalizedMessage.lastIndexOf(normalizeQuery(name));
    return position >= 0 && !isNegated(normalizedMessage, position);
  });

  if (mentioned.length === 1) {
    return mentioned[0].name;
  }

  const destinations = mentioned.filter(({ name }) =>
    !new RegExp(`(?:จาก|ต้นทาง)(?:จังหวัด)?${normalizeQuery(name)}`).test(normalizedMessage)
  );

  return destinations.length === 1 ? destinations[0].name : undefined;
}

function requestsNorthernScope(message: string): boolean {
  return /(?:ทั่ว|ทั้ง)?ภาคเหนือ|ทุกจังหวัด|หลายจังหวัด/.test(normalizeQuery(message));
}

function asksGeneralKnowledge(message: string): boolean {
  const normalized = normalizeQuery(message);
  return /ทั่วไป|โดยรวม|ภาพรวม|ภาคเหนือ|ที่ไหน|อุทยาน(?:แห่งชาติ)?(?:ไหน|อะไร|ใด)/.test(normalized) &&
    !/ที่นี่|ที่นั่น|แห่งนี้|อุทยานนี้/.test(normalized);
}

function resolveParkNameFromState(
  state: AssistantV2ConversationState,
  input: {
    parkName?: string;
    position?: number;
  },
  currentMessage: string,
): { parkName: string } | ParkReferenceFailure {
  const mentioned = findMentionedParks(currentMessage);

  if (mentioned.length > 1) {
    return referenceFailure(
      state,
      "AMBIGUOUS_REFERENCE",
    );
  }

  // ชื่ออุทยานที่ผู้ใช้ระบุเองมีความสำคัญสูงสุด
  if (mentioned.length === 1) {
    return {
      parkName: mentioned[0].name,
    };
  }

  const mentionedPositions = Array.from(
    { length: Math.max(9, state.currentResults.length, input.position ?? 0) },
    (_, index) => index + 1,
  ).filter((position) => hasExplicitPositionReference(currentMessage, position));

  if (mentionedPositions.length > 1) {
    return referenceFailure(state, "AMBIGUOUS_REFERENCE");
  }

  if (mentionedPositions.length === 1) {
    if (state.currentResultsOrderVerified === false) {
      return referenceFailure(state, "AMBIGUOUS_REFERENCE");
    }
    const position = mentionedPositions[0];
    const park = state.currentResults[position - 1];

    return park
      ? { parkName: park.name }
      : referenceFailure(state, "INVALID_POSITION");
  }

  if (input.parkName && isParkNameInMessage(input.parkName, currentMessage)) {
    return { parkName: input.parkName };
  }

  // คำถามต่อเนื่องต้องใช้อุทยานที่เลือกไว้
  if (state.selectedPark) {
    return {
      parkName: state.selectedPark.name,
    };
  }

  if (state.currentResultsOrderVerified !== false && state.currentResults.length === 1) {
    return {
      parkName: state.currentResults[0].name,
    };
  }

  return referenceFailure(
    state,
    state.currentResults.length > 1
      ? "AMBIGUOUS_REFERENCE"
      : "NO_PARK_CONTEXT",
  );
}

function resolveComparisonNames(
  state: AssistantV2ConversationState,
  input: z.infer<typeof statefulCompareParksInputSchema>,
): { parkNames: string[] } | ParkReferenceFailure {
  if (input.positions) {
    if (state.currentResultsOrderVerified === false) {
      return referenceFailure(state, "AMBIGUOUS_REFERENCE");
    }
    const parks = input.positions.map(
      (position) => state.currentResults[position - 1],
    );

    return parks.every(
      (park): park is ParkReference => Boolean(park),
    )
      ? {
          parkNames: parks.map((park) => park.name),
        }
      : referenceFailure(state, "INVALID_POSITION");
  }

  if (input.reference === "FIRST_TWO_RESULTS") {
    if (state.currentResultsOrderVerified === false) {
      return referenceFailure(state, "AMBIGUOUS_REFERENCE");
    }
    return state.currentResults.length >= 2
      ? {
          parkNames: state.currentResults
            .slice(0, 2)
            .map((park) => park.name),
        }
      : referenceFailure(state, "INVALID_POSITION");
  }

  if (input.reference === "LAST_COMPARED") {
    return state.lastComparedParks.length >= 2
      ? {
          parkNames: state.lastComparedParks.map(
            (park) => park.name,
          ),
        }
      : referenceFailure(state, "NO_PARK_CONTEXT");
  }

  if (input.parkNames) {
    return {
      parkNames: input.parkNames,
    };
  }

  return referenceFailure(state, "AMBIGUOUS_REFERENCE");
}

export function createConversationAwareAssistantV2Tools(
  context: AssistantV2TurnContext,
) {
  return {
    getParkWeather: tool({
      description:
        "อ่านพยากรณ์อากาศรายวันจาก Open-Meteo สำหรับอุทยานที่ผู้ใช้ระบุหรือ Selected Park; ไม่ใช่สภาพอากาศที่ตรวจวัดขณะนี้ ไม่ใช่ snapshot ทริปย้อนหลัง และไม่ยืนยันสถานะเปิดปิดหรือความปลอดภัยของเส้นทาง",
      inputSchema: getParkWeatherInputSchema,
      execute: async (input) => {
        if (asksForHistoricalWeather(context.currentMessage)) {
          return { status: "HISTORICAL_SNAPSHOT_UNAVAILABLE" as const };
        }
        const mentioned = findMentionedParks(context.currentMessage);
        if (mentioned.length > 1) return { status: "AMBIGUOUS_PARK" as const };
        const park = mentioned[0] ?? context.state.selectedPark;
        if (!park) return { status: "PARK_REQUIRED" as const };
        return executeGetParkWeather(park.slug, input, context.currentMessage, context.signal);
      },
    }),
    getTripEvaluation: tool({
      description:
        "อ่านผลประเมินทริปที่บันทึกไว้ของผู้ใช้ที่เข้าสู่ระบบเท่านั้น ไม่ประเมินใหม่ หากมีหลายทริปและยังระบุทริปไม่ชัดเจน ให้ถามผู้ใช้เลือกทริป",
      inputSchema: getTripEvaluationInputSchema,
      execute: async (input) => executeGetTripEvaluation(input, context.currentMessage),
    }),
    searchParks: tool({
      description:
        "ค้นหารายชื่อหรือนับจำนวนอุทยานใน NorthPark ทั้งหมดหรือตามจังหวัด",
      inputSchema: statefulSearchParksInputSchema,

      execute: async (input) =>
        context.runExclusive(async (state) => {
          const result = executeSearchParks({
            province: findRequestedProvince(context.currentMessage) ?? input.province,
          });

          state.userConstraints = {
            ...state.userConstraints,
            province: result.province,
          };

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
                ...(output.province
                  ? { province: output.province }
                  : {}),
                count: output.count,
              }
            : output,
      }),
    }),

    getParkInfo: tool({
      description:
        "ข้อมูลอุทยานที่มีโครงสร้าง: จังหวัด ข้อมูลพื้นฐาน เวลาเปิดปิดที่บันทึกไว้ (hours) ค่าเข้าที่บันทึกไว้ (fees) ที่อยู่/ช่องทางติดต่อ (contact) กิจกรรม และการกางเต็นท์ หากเป็นคำถามต่อเนื่องให้ใช้ Selected park; ข้อมูลบันทึกไม่ใช่สถานะสด",
      inputSchema: statefulGetParkInfoInputSchema,

      execute: async (input) =>
        context.runExclusive(async (state) => {
          const resolved = resolveParkNameFromState(
            state,
            input,
            context.currentMessage,
          );

          if ("status" in resolved) {
            return resolved;
          }

          const result = await executeGetParkInfo({
            parkName: resolved.parkName,
            topic: input.topic,
          });

          if ("found" in result && result.found) {
            setSelectedPark(state, result.park);
          }

          return result;
        }),
    }),

    recommendParks: tool({
      description:
        "แนะนำอุทยานตามความต้องการของผู้ใช้ ใช้ค่ารอบใหม่เป็น patch ของ Current preferences และคงค่าที่ไม่ได้เปลี่ยน",
      inputSchema: statefulRecommendParksInputSchema,

      execute: async (input) =>
        context.runExclusive(async (state) => {
          const requestedProvince = findRequestedProvince(context.currentMessage);
          const modelMergedConstraints =
            mergeRecommendationConstraints(
              state.userConstraints,
              {
                ...input,
                province: requestedProvince ?? input.province,
              },
            );
          if (!requestedProvince && requestsNorthernScope(context.currentMessage)) {
            delete modelMergedConstraints.province;
          }

          const explicitActivityPatch =
            extractExplicitActivityPatch(
              context.currentMessage,
            );

          const constraints =
            mergeRecommendationConstraints(
              modelMergedConstraints,
              explicitActivityPatch,
            );

          const result = await executeRecommendParks(
            recommendParksInputSchema.parse(constraints),
          );

          state.userConstraints = structuredClone(
            result.constraints,
          );

          setCurrentResults(
            state,
            result.recommendations.map(
              (recommendation) => recommendation.park,
            ),
          );

          return result;
        }),
    }),

    compareParks: tool({
      description:
        "เปรียบเทียบอุทยาน 2-3 แห่ง ใช้ลำดับ Current results หรือคู่ที่เปรียบเทียบล่าสุด",
      inputSchema: statefulCompareParksInputSchema,

      execute: async (input) =>
        context.runExclusive(async (state) => {
          const resolved = resolveComparisonNames(
            state,
            input,
          );

          if ("status" in resolved) {
            return resolved;
          }

          const result = await executeCompareParks({
            parkNames: resolved.parkNames,
            question: input.question,
          });

          if (result.status === "OK") {
            state.lastComparedParks =
              result.comparison.parks.map(({ park }) =>
                toReference(park),
              );
          }

          return result;
        }),
    }),

    getParkKnowledge: tool({
      description:
        "ค้นข้อมูลอุทยานจาก RAG เช่น จุดเด่น เส้นทาง ห้องน้ำ ร้านอาหาร ที่พัก สิ่งอำนวยความสะดวก ความปลอดภัย การเดินทาง หรือการเตรียมตัว คำถามค่าเข้าและเวลาเปิดมี structuredFacts แนบให้ด้วย ถ้ามี Selected park ให้ใช้ชื่ออุทยานเดิม",
      inputSchema: statefulGetParkKnowledgeInputSchema,

      execute: async (input, options) =>
        context.runExclusive(async (state) => {
          if (
            (input.position === undefined ||
              !hasExplicitPositionReference(context.currentMessage, input.position)) &&
            findMentionedParks(context.currentMessage).length === 0 &&
            (asksGeneralKnowledge(context.currentMessage) ||
              (!state.selectedPark && state.currentResults.length === 0 &&
                (!input.parkName || !isParkNameInMessage(input.parkName, context.currentMessage))))
          ) {
            return executeGetParkKnowledge(
              {
                question: input.question,
              },
              {},
              options.abortSignal ?? context.signal,
            );
          }

          const resolved = resolveParkNameFromState(
            state,
            input,
            context.currentMessage,
          );

          if ("status" in resolved) {
            return resolved;
          }

          const result = await executeGetParkKnowledge(
            {
              parkName: resolved.parkName,
              question: input.question,
            },
            {},
            options.abortSignal ?? context.signal,
          );

          if (
            result.status === "OK" &&
            "park" in result &&
            result.park
          ) {
            setSelectedPark(state, result.park);
          }

          return result;
        }),
    }),

    findNearbyPlaces: tool({
      description:
        "Find real nearby food, accommodation, campsites, attractions, or services from OpenStreetMap around the selected park. For a driving follow-up about a specific place, supply placeName only if the user explicitly named it; if the place cannot be identified, ask for its name. Keep straightLineDistanceMeters separate. Only report roadDistanceMeters and estimatedDrivingMinutes when routeStatus is OK. For NO_ROUTE, UNSUPPORTED, or UNAVAILABLE, say driving estimates are unavailable. Do not invent places or travel details.",
      inputSchema: statefulNearbyPlacesInputSchema,
      execute: async (input) => context.runExclusive(async (state) => {
        const resolved = resolveParkNameFromState(state, input, context.currentMessage);
        if ("status" in resolved) return resolved;
        const park = resolveSinglePark(resolved.parkName);
        if (!park.found) return { status: park.ambiguous ? "AMBIGUOUS_PARK" as const : "PARK_NOT_FOUND" as const, candidates: park.candidates };
        if ((needsExactNearbyPlace(context.currentMessage) && !input.placeName)
          || (input.placeName && isVagueNearbyPlaceName(input.placeName))
          || (input.placeName && !normalizeQuery(context.currentMessage).includes(normalizeQuery(input.placeName)))) {
          return nearbyPlaceReferenceRequired();
        }
        try {
          const result = await searchNearbyPlacesForPark(
            park.park.slug,
            { categories: input.categories, radiusMeters: input.radiusMeters ?? 3000, limit: input.limit ?? 10 },
            {},
            context.signal,
          );
          if (input.placeName && result.status === "OK") {
            const matches = result.places.filter((place) =>
              normalizeQuery(place.name) === normalizeQuery(input.placeName!),
            );
            return matches.length === 1
              ? { ...result, places: matches }
              : nearbyPlaceReferenceRequired();
          }
          if (result.status === "EMPTY") {
            return {
              ...result,
              interpretation: `ไม่พบรายการจาก OpenStreetMap ตามประเภทที่ค้นในรัศมี ${input.radiusMeters ?? 3000} เมตรรอบพิกัดอุทยาน ไม่ได้ยืนยันว่าไม่มีสถานที่จริง`,
            };
          }
          if (result.status.startsWith("UPSTREAM_")) {
            return {
              ...result,
              interpretation: "ยังตรวจรายชื่อสถานที่รอบอุทยานไม่ได้ เพราะบริการแผนที่ไม่ตอบในขณะนี้",
            };
          }
          return result;
        } catch {
          return { status: "UPSTREAM_UNAVAILABLE" as const, places: [], message: "ยังค้นสถานที่ใกล้อุทยานไม่ได้ กรุณาลองใหม่ภายหลัง" };
        }
      }),
    }),

    selectPark: createSelectParkTool(context),

    planTrip: tool({
      description:
        "ใช้เมื่อผู้ใช้ขอจัดทริปหรือวางแผนเที่ยว แม้ยังไม่บอกจำนวนวันก็ต้องเรียก เพื่อให้ Tool ตรวจข้อมูลที่ขาด ถ้ามี Selected park ให้ใช้จาก State ไม่ถามชื่อซ้ำ และเมื่อผู้ใช้บอกจำนวนวันต่อจากการขอจัดทริปให้เรียกอีกครั้ง",

      inputSchema: planTripInputSchema,

      execute: async (input) =>
        context.runExclusive(async (state) => {
          if (state.draftTrip && !state.draftTrip.savedTripId) {
            return {
              status: "DRAFT_EXISTS" as const,
              draftTrip: structuredClone(state.draftTrip),
              message: "มีแผนฉบับร่างอยู่แล้ว กรุณาแก้ไขหรือยกเลิกแผนเดิมก่อนสร้างแผนใหม่",
            };
          }
          const mentioned = findMentionedParks(
            context.currentMessage,
          );

          if (mentioned.length > 1) {
            return {
              status: "NEEDS_CLARIFICATION" as const,
              missing: ["parkName"] as const,
              message:
                "อยากจัดทริปที่อุทยานแห่งไหนครับ?",
            };
          }

          // ชื่อจากผู้ใช้ > Selected park > ชื่อจากโมเดล
          const parkName =
            mentioned[0]?.name ??
            (input.parkName && isParkNameInMessage(input.parkName, context.currentMessage)
              ? input.parkName
              : undefined) ??
            state.selectedPark?.name;

          if (!parkName) {
            return {
              status: "NEEDS_CLARIFICATION" as const,
              missing: ["parkName"] as const,
              message:
                "อยากจัดทริปที่อุทยานแห่งไหนครับ?",
            };
          }

          const constraints =
            mergeRecommendationConstraints(
              state.userConstraints,
              {
                activities: input.activities,
                excludedActivities:
                  input.excludedActivities,
                fatigue: input.fatigue,
                companions: input.companions,
                durationDays: input.durationDays,
              },
            );

          const result = await executePlanTrip(
            {
              ...input,
              parkName,
            },
            constraints,
          );

          if (result.status === "OK") {
            state.userConstraints = structuredClone(
              result.constraints,
            );

            setSelectedPark(state, result.draftTrip.park);

            state.draftTrip = {
              ...structuredClone(result.draftTrip),
              draftId: crypto.randomUUID(),
              revision: 1,
              verifiedActivities: result.verifiedActivities.map((item) => ({
                name: item.name,
                sourceReference: item.sourceReference,
              })),
            };
          }

          return result;
        }),
    }),

    updateTripDraft: tool({
      description: "แก้แผนทริปฉบับร่างที่ยังไม่บันทึก: จำนวนวัน เพิ่มกิจกรรมที่มีหลักฐาน ลบ ย้าย หรือสลับลำดับกิจกรรม ใช้เมื่อผู้ใช้ขอแก้โดยชัดเจน",
      inputSchema: tripDraftEditSchema,
      execute: async (input) => context.runExclusive(async (state) => {
        if (!state.draftTrip) return { status: "NO_DRAFT" as const };
        if (input.operation === "MOVE_ACTIVITY" || input.operation === "REMOVE_ACTIVITY") {
          const day = input.operation === "MOVE_ACTIVITY" ? input.fromDay : input.day;
          const items = state.draftTrip.days.find((entry) => entry.day === day)?.items;
          const position = input.operation === "MOVE_ACTIVITY"
            ? input.fromPosition
            : input.position ?? (input.activityName ? (items?.indexOf(input.activityName) ?? -1) + 1 : 0);
          if (items && position > 0 && position <= items.length && !identifiesDraftActivity(context.currentMessage, items, position)) {
            return { status: "NEEDS_CLARIFICATION" as const, activities: [...items] };
          }
        }
        const result = editTripDraft(state.draftTrip, input);
        if (result.status === "OK") state.draftTrip = result.draft;
        return result;
      }),
    }),

    reviewTripDraft: tool({
      description: "แสดงแผนทริปฉบับร่างปัจจุบันโดยไม่เปลี่ยนข้อมูล",
      inputSchema: z.object({}),
      execute: async () => context.runExclusive(async (state) => ({
        status: state.draftTrip ? "OK" as const : "NO_DRAFT" as const,
        draftTrip: state.draftTrip ? structuredClone(state.draftTrip) : undefined,
      })),
    }),

    discardTripDraft: tool({
      description: "ยกเลิกแผนทริปฉบับร่าง เฉพาะเมื่อผู้ใช้สั่งยกเลิกหรือทิ้งแผนนี้ชัดเจน",
      inputSchema: z.object({}),
      execute: async () => context.runExclusive(async (state) => {
        const instruction = context.currentMessage.trim().replace(/[.!?。！？]+$/, "").trim();
        if (!/^(?:(?:ยกเลิก|ทิ้ง|ลบ)แผน(?:ทริป|เที่ยว|นี้|ฉบับร่าง)?|เริ่มแผนใหม่|discard (?:the )?(?:trip |draft )?plan)(?:เลย|ครับ|ค่ะ|นะ)?$/i.test(instruction)) {
          return { status: "NEEDS_EXPLICIT_REQUEST" as const };
        }
        if (!state.draftTrip) return { status: "NO_DRAFT" as const };
        if (state.draftTrip.savedTripId) return { status: "ALREADY_SAVED" as const };
        state.draftTrip = undefined;
        return { status: "DISCARDED" as const };
      }),
    }),

    findNearbyParks: tool({
      description:
        "ค้นหาอุทยานที่ใกล้หรือเดินทางสะดวกจากจังหวัดต้นทางหรือพิกัด",

      inputSchema: z.object({
        province: z.string().trim().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
      }),

      execute: async (input) =>
        context.runExclusive(async (state) => {
          const { findNearbyParksFromOrigin } =
            await import(
              "@/lib/services/province-route-service"
            );

          const query =
            input.province ||
            (input.lat !== undefined &&
            input.lng !== undefined
              ? {
                  lat: input.lat,
                  lng: input.lng,
                }
              : undefined);

          if (!query) {
            return {
              status: "ERROR",
              message:
                "กรุณาระบุจังหวัดต้นทางหรือพิกัด",
            };
          }

          const result = findNearbyParksFromOrigin(
            query,
            4,
          );

          if (!result) {
            return {
              status: "NOT_FOUND",
              message:
                `ไม่พบข้อมูลพิกัดของจังหวัด ${input.province}`,
            };
          }

          const mappedParks = result.parks.map(
            (park) => ({
              id: park.slug,
              slug: park.slug,
              name: park.nameTh,
            }),
          );

          setCurrentResults(state, mappedParks);

          return {
            status: "OK",
            origin: result.originName,
            estimationNote: "ระยะทางและเวลาขับรถเป็นค่าประมาณจากระยะเส้นตรง ไม่ใช่ระยะทางจากเส้นทางถนนจริง",
            originCoordinates: {
              lat: result.originLat,
              lng: result.originLng,
            },
            nearestParks: result.parks.map(
              (park) => ({
                parkName: park.nameTh,
                province: park.province,
                distanceKm: park.distanceKm,
                estimatedDrivingMinutes:
                  park.estimatedDrivingMinutes,
                openingHours:
                  `${park.openTime} - ${park.closeTime}`,
                hasCampsite: park.hasCampsite,
                highlight:
                  park.highlightAttraction,
              }),
            ),
          };
        }),
    }),
  };
}
