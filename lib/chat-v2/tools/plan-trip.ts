// ./lib/chat-v2/tools/plan-trip.ts

import { z } from "zod";

import { parseActivityEvidence } from "@/lib/chat/core/activity-evidence";
import { findMentionedParks } from "@/lib/chat/core/park-catalog";
import {
  knowledgeRetriever,
  type RetrievedKnowledgeChunk,
} from "@/lib/chat/rag/knowledge-retriever";
import type {
  AssistantConstraints,
  ParkReference,
} from "@/lib/chat/shared/contracts";
import { recommendParksInputSchema } from "@/lib/chat-v2/tools/recommend-parks";
import {
  resolveSinglePark,
  toParkSummary,
  type ParkResolver,
} from "@/lib/chat-v2/tools/park-resolution";

export const planTripInputSchema = recommendParksInputSchema
  .pick({
    activities: true,
    excludedActivities: true,
    fatigue: true,
    companions: true,
    durationDays: true,
  })
  .extend({
    parkName: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("ชื่ออุทยาน หรือเว้นว่างเพื่อใช้ Selected park"),
  });

export type PlanTripInput = z.infer<typeof planTripInputSchema>;

type AssistantV2DraftTripDay = {
  day: number;
  title: string;
  items: string[];
};

type AssistantV2DraftTrip = {
  park: ParkReference;
  durationDays: number;
  companions: string[];
  fatigue?: AssistantConstraints["fatigue"];
  activities: string[];
  days: AssistantV2DraftTripDay[];
  notes: string;
};

type PlanTripDependencies = {
  findMentionedParks?: ParkResolver;
  findByParkSlugs?: (
    slugs: string[],
  ) => Promise<RetrievedKnowledgeChunk[]>;
};

type PlanningCandidate = {
  type: string;
  name: string;
  summary?: string;
  difficulty?: string;
  walking?: string;
  risks?: string[];
};

function uniqueCandidates(
  chunks: RetrievedKnowledgeChunk[],
): PlanningCandidate[] {
  const candidates = chunks
    .map((chunk) => parseActivityEvidence(chunk))
    .filter((activity): activity is NonNullable<typeof activity> =>
      Boolean(activity),
    )
    .map((activity) => ({
      type: activity.type,
      name: activity.name,
      ...(activity.summary ? { summary: activity.summary } : {}),
      ...(activity.difficulty ? { difficulty: activity.difficulty } : {}),
      ...(activity.walking ? { walking: activity.walking } : {}),
      ...(activity.risks ? { risks: [...activity.risks] } : {}),
    }));

  return [
    ...new Map(
      candidates.map((candidate) => [
        `${candidate.type}:${candidate.name}`,
        candidate,
      ]),
    ).values(),
  ];
}

function effortRank(value: string | undefined): number {
  if (!value) return 1;

  const normalized = value.toUpperCase();

  if (
    normalized.includes("LOW") ||
    normalized.includes("SHORT") ||
    normalized.includes("EASY")
  ) {
    return 0;
  }

  if (
    normalized.includes("HIGH") ||
    normalized.includes("LONG") ||
    normalized.includes("HARD")
  ) {
    return 2;
  }

  return 1;
}

function candidateEffort(candidate: PlanningCandidate): number {
  return Math.max(
    effortRank(candidate.difficulty),
    effortRank(candidate.walking),
  );
}

function selectCandidates(
  candidates: PlanningCandidate[],
  constraints: AssistantConstraints,
  durationDays: number,
): PlanningCandidate[] {
  const excluded = new Set(constraints.excludedActivities ?? []);
  const preferred = new Set(constraints.activities ?? []);

  let eligible = candidates.filter(
    (candidate) => !excluded.has(candidate.type),
  );

  if (constraints.fatigue === "LOW") {
    const lowerEffort = eligible.filter(
      (candidate) => candidateEffort(candidate) < 2,
    );

    if (lowerEffort.length > 0) {
      eligible = lowerEffort;
    }
  }

  eligible.sort((a, b) => {
    const preferredA = preferred.has(a.type) ? 0 : 1;
    const preferredB = preferred.has(b.type) ? 0 : 1;

    if (preferredA !== preferredB) {
      return preferredA - preferredB;
    }

    return candidateEffort(a) - candidateEffort(b);
  });

  const maxItems = Math.max(durationDays * 3, durationDays);

  return eligible.slice(0, maxItems);
}

function distributeCandidates(
  candidates: PlanningCandidate[],
  durationDays: number,
): AssistantV2DraftTripDay[] {
  const days: AssistantV2DraftTripDay[] = Array.from(
    { length: durationDays },
    (_, index) => ({
      day: index + 1,
      title: `วันที่ ${index + 1}`,
      items: [],
    }),
  );

  candidates.forEach((candidate, index) => {
    days[index % durationDays].items.push(candidate.name);
  });

  return days;
}

export async function executePlanTrip(
  input: PlanTripInput & { parkName: string },
  constraints: AssistantConstraints,
  dependencies: PlanTripDependencies = {},
) {
  const resolved = resolveSinglePark(
    input.parkName,
    dependencies.findMentionedParks ?? findMentionedParks,
  );

  if (!resolved.found) {
    return {
      status: "UNRESOLVED" as const,
      ...resolved,
    };
  }

  const durationDays = constraints.durationDays;

  if (!durationDays) {
    return {
      status: "NEEDS_CLARIFICATION" as const,
      park: toParkSummary(resolved.park),
      missing: ["durationDays"] as const,
      message: "ต้องทราบจำนวนวันก่อนสร้างแผนทริป",
    };
  }

  const findByParkSlugs =
    dependencies.findByParkSlugs ??
    knowledgeRetriever.findByParkSlugs.bind(knowledgeRetriever);

  const chunks = await findByParkSlugs([resolved.park.slug]);
  const candidates = selectCandidates(
    uniqueCandidates(chunks),
    constraints,
    durationDays,
  );

  if (!candidates.length) {
    return {
      status: "INSUFFICIENT_EVIDENCE" as const,
      park: toParkSummary(resolved.park),
      durationDays,
      message:
        "ยังไม่มีหลักฐานกิจกรรมเพียงพอในฐานความรู้สำหรับสร้างแผนทริปที่ตรงเงื่อนไข",
    };
  }

  const park = toParkSummary(resolved.park);

  const draftTrip: AssistantV2DraftTrip = {
    park: {
      id: park.id,
      slug: park.slug,
      name: park.name,
    },
    durationDays,
    companions: [...(constraints.companions ?? [])],
    ...(constraints.fatigue
      ? { fatigue: constraints.fatigue }
      : {}),
    activities: [...(constraints.activities ?? [])],
    days: distributeCandidates(candidates, durationDays),
    notes:
      "แผนฉบับร่างอิงข้อมูลคงที่ในฐานความรู้ NorthPark และยังไม่ได้ตรวจข้อมูลสด",
  };

  return {
    status: "OK" as const,
    park,
    constraints: structuredClone(constraints),
    draftTrip,
    evidence: candidates.map((candidate) => ({
      type: candidate.type,
      name: candidate.name,
      ...(candidate.summary ? { summary: candidate.summary } : {}),
      ...(candidate.difficulty
        ? { difficulty: candidate.difficulty }
        : {}),
      ...(candidate.walking ? { walking: candidate.walking } : {}),
      ...(candidate.risks?.length ? { risks: candidate.risks } : {}),
    })),
    limitations: {
      liveDataChecked: false,
      routeOptimizationApplied: false,
      travelTimesCalculated: false,
    },
  };
}
