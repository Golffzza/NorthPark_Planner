// ./lib/chat-v2/tools/get-park-knowledge.ts

import { tool } from "ai";
import { z } from "zod";

import { findMentionedParks } from "@/lib/chat/core/park-catalog";
import { requiresLiveData } from "@/lib/chat/core/query-signals";
import {
  knowledgeRetriever,
  type KnowledgeRetrievalResult,
  type RetrievedKnowledgeChunk,
} from "@/lib/chat/rag/knowledge-retriever";
import type { ParkKnowledgeChunk } from "@/lib/chat-v2/shared/contracts";
import {
  resolveSinglePark,
  toParkSummary,
  type ParkResolver,
} from "@/lib/chat-v2/tools/park-resolution";

export const getParkKnowledgeInputSchema = z.object({
  parkName: z.string().trim().min(1).optional(),
  question: z.string().trim().min(1),
});

export type GetParkKnowledgeInput = z.infer<
  typeof getParkKnowledgeInputSchema
>;

type GetParkKnowledgeDependencies = {
  findMentionedParks?: ParkResolver;

  retrieve?: (
    query: string,
    limit?: number,
    signal?: AbortSignal,
  ) => Promise<KnowledgeRetrievalResult>;

  findByParkSlugs?: (
    slugs: string[],
  ) => Promise<RetrievedKnowledgeChunk[]>;
};

const DETAIL_RETRIEVAL_LIMIT = 3;
const BROAD_OVERVIEW_LIMIT = 2;

function mapRawChunks(
  chunks: RetrievedKnowledgeChunk[],
): ParkKnowledgeChunk[] {
  return chunks.map((chunk) => ({
    chunkId: chunk.id,
    slug: chunk.slug,
    parkTitle: chunk.parkTitle,
    title: chunk.title,
    section: chunk.section,
    content: chunk.content,
  }));
}

function mapChunks(
  retrieval: KnowledgeRetrievalResult,
): ParkKnowledgeChunk[] {
  return mapRawChunks(retrieval.chunks);
}

function normalizeQuestion(
  value: string,
): string {
  return value
    .toLocaleLowerCase("th-TH")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * ตรวจคำถามที่ต้องการ "ภาพรวม" ของอุทยาน
 *
 * จุดประสงค์คือไม่ส่ง attraction / facilities /
 * accessibility / safety หลาย chunk เข้า LLM
 * หากผู้ใช้เพียงต้องการรู้จักอุทยานโดยภาพรวม
 *
 * ถ้ามี live-data intent จะไม่เข้า fast path นี้
 */
function isBroadOverviewQuestion(
  question: string,
): boolean {
  if (requiresLiveData(question)) {
    return false;
  }

  const normalized =
    normalizeQuestion(question);

  const patterns: RegExp[] = [
    /รู้จัก.*ไหม/,
    /เป็นยังไง/,
    /เล่า.*(?:หน่อย|ให้ฟัง)/,
    /ภาพรวม/,
    /ข้อมูลทั่วไป/,
    /มีอะไรน่าสนใจ/,
    /น่าเที่ยวไหม/,
  ];

  return patterns.some((pattern) =>
    pattern.test(normalized),
  );
}

/**
 * สำหรับคำถามภาพรวม:
 * overview มาก่อน แล้วตามด้วย basic_info
 *
 * ไม่ดึง recommendation_metadata,
 * facilities, suitability, safety ฯลฯ
 * หากผู้ใช้ยังไม่ได้ถามรายละเอียดเหล่านั้น
 */
function selectOverviewChunks(
  chunks: RetrievedKnowledgeChunk[],
): RetrievedKnowledgeChunk[] {
  const selected:
    RetrievedKnowledgeChunk[] = [];

  const overview = chunks.find(
    (chunk) =>
      chunk.section === "overview",
  );

  if (overview) {
    selected.push(overview);
  }

  const basicInfo = chunks.find(
    (chunk) =>
      chunk.section === "basic_info",
  );

  if (basicInfo) {
    selected.push(basicInfo);
  }

  if (selected.length > 0) {
    return selected.slice(
      0,
      BROAD_OVERVIEW_LIMIT,
    );
  }

  /*
   * fallback เผื่อ knowledge รุ่นเก่า
   * ไม่มี overview/basic_info
   */
  return chunks.slice(
    0,
    BROAD_OVERVIEW_LIMIT,
  );
}

export async function executeGetParkKnowledge(
  input: GetParkKnowledgeInput,
  dependencies: GetParkKnowledgeDependencies = {},
  signal?: AbortSignal,
) {
  const retrieve =
    dependencies.retrieve ??
    knowledgeRetriever.retrieve.bind(
      knowledgeRetriever,
    );

  const findByParkSlugs =
    dependencies.findByParkSlugs ??
    knowledgeRetriever.findByParkSlugs.bind(
      knowledgeRetriever,
    );

  /*
   * ไม่มี parkName:
   * ปล่อยให้ RAG หา entity/context ตาม query
   * เหมือน behavior เดิม
   */
  if (!input.parkName) {
    const retrieval = await retrieve(
      input.question,
      DETAIL_RETRIEVAL_LIMIT,
      signal,
    );

    return {
      status: "OK" as const,
      requiresLiveVerification:
        retrieval.requiresLiveVerification,
      chunks: mapChunks(retrieval),
    };
  }

  const resolved = resolveSinglePark(
    input.parkName,
    dependencies.findMentionedParks ??
      findMentionedParks,
  );

  if (!resolved.found) {
    return {
      status: "UNRESOLVED" as const,
      ...resolved,
    };
  }

  /*
   * คำถามกว้าง เช่น:
   * - รู้จักดอยจงไหม
   * - ดอยจงเป็นยังไง
   * - เล่าเกี่ยวกับดอยจงหน่อย
   * - มีอะไรน่าสนใจ
   *
   * ใช้ knowledge ของ park โดยตรง
   * แล้วส่งเฉพาะ overview + basic_info
   *
   * ไม่ต้องทำ embedding/vector retrieval
   */
  if (
    isBroadOverviewQuestion(
      input.question,
    )
  ) {
    const parkChunks =
      await findByParkSlugs([
        resolved.park.slug,
      ]);

    const overviewChunks =
      selectOverviewChunks(
        parkChunks,
      );

    if (overviewChunks.length > 0) {
      return {
        status: "OK" as const,
        park: toParkSummary(
          resolved.park,
        ),
        requiresLiveVerification:
          false,
        chunks:
          mapRawChunks(
            overviewChunks,
          ),
      };
    }
  }

  /*
   * คำถามเฉพาะ:
   * access / facilities /
   * accessibility / itinerary /
   * safety / attraction ฯลฯ
   *
   * ใช้ semantic retrieval ตามเดิม
   */
  const retrieval = await retrieve(
    `${resolved.park.name}: ${input.question}`,
    DETAIL_RETRIEVAL_LIMIT,
    signal,
  );

  return {
    status: "OK" as const,
    park: toParkSummary(
      resolved.park,
    ),
    requiresLiveVerification:
      retrieval.requiresLiveVerification,
    chunks: mapChunks(retrieval),
  };
}

export function createGetParkKnowledgeTool() {
  return tool({
    description:
      "ใช้ค้นข้อมูลเชิงลึกจาก RAG ของอุทยาน เช่น ภาพรวม จุดเด่น การเดินทาง สิ่งอำนวยความสะดวก การเดิน ความยาก accessibility ความปลอดภัย ฤดูกาล และรูปแบบการเที่ยว ห้ามตอบจากความจำและไม่ใช่เครื่องมือข้อมูลสด",
    inputSchema:
      getParkKnowledgeInputSchema,
    execute: async (
      input,
      options,
    ) =>
      executeGetParkKnowledge(
        input,
        {},
        options.abortSignal,
      ),
  });
}