import { tool } from "ai";
import { z } from "zod";

import { compareParks } from "@/lib/chat/core/comparison-service";
import { findMentionedParks, type ParkCatalogEntry } from "@/lib/chat/core/park-catalog";
import {
  knowledgeRetriever,
  type RetrievedKnowledgeChunk,
} from "@/lib/chat/rag/knowledge-retriever";
import type { AssistantComparison } from "@/lib/chat/shared/contracts";
import type { CompareParksResult } from "@/lib/chat-v2/shared/contracts";
import {
  resolveSinglePark,
  type ParkResolver,
} from "@/lib/chat-v2/tools/park-resolution";

export const compareParksInputSchema = z.object({
  parkNames: z.array(z.string().trim().min(1)).min(2).max(3),
  question: z.string().trim().optional(),
});

export type CompareParksInput = z.infer<typeof compareParksInputSchema>;

type CompareParksDependencies = {
  findMentionedParks?: ParkResolver;
  findByParkSlugs?: (slugs: string[]) => Promise<RetrievedKnowledgeChunk[]>;
  compareParks?: (
    parks: ParkCatalogEntry[],
    evidence: RetrievedKnowledgeChunk[],
    question?: string,
  ) => AssistantComparison;
};

export async function executeCompareParks(
  input: CompareParksInput,
  dependencies: CompareParksDependencies = {},
): Promise<CompareParksResult> {
  const resolver = dependencies.findMentionedParks ?? findMentionedParks;
  const resolutions = input.parkNames.map((parkName) => ({
    parkName,
    resolution: resolveSinglePark(parkName, resolver),
  }));
  const unresolved = resolutions
    .filter((item) => !item.resolution.found)
    .map(({ parkName, resolution }) => {
      if (resolution.found) throw new Error("Unexpected resolved park");
      return {
        parkName,
        reason: resolution.ambiguous ? "AMBIGUOUS" as const : "NOT_FOUND" as const,
        candidates: resolution.candidates,
      };
    });

  if (unresolved.length) {
    return { status: "UNRESOLVED", unresolved };
  }

  const resolvedParks = resolutions.map(({ resolution }) => {
    if (!resolution.found) throw new Error("Unexpected unresolved park");
    return resolution.park;
  });
  const findByParkSlugs = dependencies.findByParkSlugs
    ?? knowledgeRetriever.findByParkSlugs.bind(knowledgeRetriever);
  const evidence = await findByParkSlugs(resolvedParks.map((park) => park.slug));
  const comparison = (dependencies.compareParks ?? compareParks)(
    resolvedParks,
    evidence,
    input.question ?? "",
  );

  return { status: "OK", comparison };
}

export function createCompareParksTool() {
  return tool({
    description:
      "เปรียบเทียบอุทยาน 2-3 แห่งที่ผู้ใช้ระบุในข้อความเดียว โดยรักษาลำดับชื่อที่ผู้ใช้ให้มา",
    inputSchema: compareParksInputSchema,
    execute: async (input) => executeCompareParks(input),
  });
}
