// ./lib/chat/rag/knowledge-retriever.ts

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

import { OllamaEmbeddingProvider } from "@/lib/chat/rag/ollama-embedding-provider";
import { assertKnowledgeEmbeddingDimension } from "@/lib/chat/rag/embedding-config";

import type {
  KnowledgeQueryAnalysis,
  QueryAnalyzerVocabulary,
  QueryEffort,
} from "@/lib/chat/rag/knowledge-query-analyzer";
import {
  ACTIVITY_WORDS,
  isNegated,
  normalizeQuery,
  requiresLiveData,
} from "@/lib/chat/core/query-signals";

export type RetrievedKnowledgeChunk = {
  id: string;
  documentId: string;

  slug: string;
  parkTitle: string;

  title: string;
  section: string;
  content: string;

  similarity: number;
  rankScore: number;
};

export type KnowledgeRetrievalResult = {
  query: string;

  mode: "FOCUSED" | "EXPLORATORY";

  focusedSlug?: string;

  explicitProvinces: string[];

  requiresLiveVerification: boolean;

  analysis: KnowledgeQueryAnalysis;

  chunks: RetrievedKnowledgeChunk[];
};

export interface KnowledgeRepository {
  retrieve(
    query: string,
    limit?: number,
    signal?: AbortSignal,
  ): Promise<KnowledgeRetrievalResult>;
  findByParkSlugs?(slugs: string[]): Promise<RetrievedKnowledgeChunk[]>;
}

type RawKnowledgeChunk = Omit<RetrievedKnowledgeChunk, "rankScore">;

type CandidateMetadata = {
  provinces: string[];

  legalStatus?: string;

  recommendationTags: string[];

  attractionType?: string;
  attractionName?: string;

  difficulty?: string;
  walking?: string;
};

const DEFAULT_LIMIT = Number(process.env.RAG_RESULT_LIMIT ?? 5);

const VECTOR_CANDIDATE_LIMIT = Number(
  process.env.RAG_VECTOR_CANDIDATE_LIMIT ?? 60,
);

const MAX_CHUNKS_PER_PARK = Number(process.env.RAG_MAX_CHUNKS_PER_PARK ?? 2);

/*
 * ============================
 * Ranking configuration
 * ============================
 *
 * ไม่มี semantic keyword
 * ของข้อความผู้ใช้อยู่ตรงนี้
 */

const ACTIVITY_MATCH_WEIGHT = Number(
  process.env.RAG_ACTIVITY_MATCH_WEIGHT ?? 0.14,
);

const ACTIVITY_MISMATCH_PENALTY = Number(
  process.env.RAG_ACTIVITY_MISMATCH_PENALTY ?? 0.05,
);

const ACTIVITY_CONTEXT_PENALTY = Number(
  process.env.RAG_ACTIVITY_CONTEXT_PENALTY ?? 0.025,
);

const TAG_MATCH_WEIGHT = Number(process.env.RAG_TAG_MATCH_WEIGHT ?? 0.035);

const TAG_MATCH_MAX = Number(process.env.RAG_TAG_MATCH_MAX ?? 0.105);

const EFFORT_EXACT_WEIGHT = Number(process.env.RAG_EFFORT_EXACT_WEIGHT ?? 0.1);

const EFFORT_ADJACENT_WEIGHT = Number(
  process.env.RAG_EFFORT_ADJACENT_WEIGHT ?? 0.04,
);

const EFFORT_DISTANCE_PENALTY = Number(
  process.env.RAG_EFFORT_DISTANCE_PENALTY ?? 0.04,
);

const PREPARATORY_PENALTY = Number(process.env.RAG_PREPARATORY_PENALTY ?? 0.18);

const ATTRACTION_SECTION_WEIGHT = Number(
  process.env.RAG_ATTRACTION_SECTION_WEIGHT ?? 0.025,
);

const SUITABILITY_SECTION_WEIGHT = Number(
  process.env.RAG_SUITABILITY_SECTION_WEIGHT ?? 0.02,
);

const ITINERARY_SECTION_WEIGHT = Number(
  process.env.RAG_ITINERARY_SECTION_WEIGHT ?? 0.01,
);

const DYNAMIC_SECTION_WEIGHT = Number(
  process.env.RAG_DYNAMIC_SECTION_WEIGHT ?? 0.16,
);

const EXACT_ENTITY_WEIGHT = Number(process.env.RAG_EXACT_ENTITY_WEIGHT ?? 0.16);

const LOW_EFFORT_WALKING_KM = Number(
  process.env.RAG_LOW_EFFORT_WALKING_KM ?? 1.5,
);

const LONG_WALK_PENALTY = Number(process.env.RAG_LONG_WALK_PENALTY ?? 0.07);

/*
 * Dynamic semantic fallback
 *
 * ถ้า analyzer พลาด LIVE_STATUS
 * เรายังดู semantic similarity
 * ของ dynamic chunk ได้
 */
const DYNAMIC_LIVE_MIN_SIMILARITY = Number(
  process.env.RAG_DYNAMIC_LIVE_MIN_SIMILARITY ?? 0.3,
);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[()[\]{}"'`.,!?/\\:;_-]/g, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

/*
 * ============================
 * Knowledge metadata parsing
 * ============================
 */

function getChunkProvinces(content: string): string[] {
  const value = content.match(/^จังหวัด:\s*(.+)$/m)?.[1];

  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((province) => province.trim())
    .filter(Boolean);
}

function getLegalStatus(content: string): string | undefined {
  return content
    .match(/^legal_status:\s*(.+)$/m)?.[1]
    ?.trim()
    .toUpperCase();
}

function getRecommendationTags(content: string): string[] {
  const value = content.match(/^recommendation_tags:\s*(.*)$/m)?.[1];

  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function extractMarkdownField(
  content: string,
  field: string,
): string | undefined {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const match = content.match(
    new RegExp(`^- \\*\\*${escaped}:\\*\\*\\s*(.+)$`, "im"),
  );

  return match?.[1]?.replaceAll("`", "").trim();
}

function getAttractionType(section: string): string | undefined {
  return section
    .match(/^attraction:([^:]+):/i)?.[1]
    ?.trim()
    .toUpperCase();
}

function getAttractionName(candidate: RawKnowledgeChunk): string | undefined {
  if (!candidate.section.startsWith("attraction:")) {
    return undefined;
  }

  const fromContent = candidate.content.match(/^สถานที่:\s*(.+)$/m)?.[1];

  if (fromContent) {
    return fromContent.trim();
  }

  const separator = candidate.title.indexOf(":");

  if (separator < 0) {
    return undefined;
  }

  return candidate.title.slice(separator + 1).trim();
}

function getCandidateMetadata(candidate: RawKnowledgeChunk): CandidateMetadata {
  return {
    provinces: getChunkProvinces(candidate.content),

    legalStatus: getLegalStatus(candidate.content),

    recommendationTags: getRecommendationTags(candidate.content),

    attractionType: getAttractionType(candidate.section),

    attractionName: getAttractionName(candidate),

    difficulty: extractMarkdownField(candidate.content, "difficulty"),

    walking: extractMarkdownField(candidate.content, "walking"),
  };
}

/*
 * ============================
 * Vocabulary from real data
 * ============================
 */

function buildVocabulary(
  candidates: RawKnowledgeChunk[],
): QueryAnalyzerVocabulary {
  const activityTypes: string[] = [];

  const tags: string[] = [];

  for (const candidate of candidates) {
    const metadata = getCandidateMetadata(candidate);

    if (metadata.attractionType) {
      activityTypes.push(metadata.attractionType);
    }

    tags.push(...metadata.recommendationTags);
  }

  return {
    activityTypes: unique(activityTypes),

    tags: unique(tags),
  };
}

/*
 * ============================
 * Province detection
 * ============================
 *
 * จังหวัดไม่ได้ให้ Llama เดา
 *
 * vocabulary จังหวัดมาจาก
 * knowledge จริง
 *
 * แล้วใช้เฉพาะจังหวัดที่ชื่อ
 * ปรากฏใน query จริงเท่านั้น
 */

function detectExplicitProvinces(
  query: string,
  candidates: RawKnowledgeChunk[],
): string[] {
  const available = new Set<string>();

  for (const candidate of candidates) {
    for (const province of getChunkProvinces(candidate.content)) {
      available.add(province);
    }
  }

  const normalizedQuery = normalize(query);

  return [...available]
    .sort((a, b) => b.length - a.length)
    .filter((province) => normalizedQuery.includes(normalize(province)));
}

/*
 * ============================
 * Entity detection
 * ============================
 */

function detectFocusedSlug(
  query: string,
  candidates: RawKnowledgeChunk[],
): string | undefined {
  const normalizedQuery = normalize(query);

  /*
   * Attraction ก่อน
   */
  for (const candidate of candidates) {
    const name = getAttractionName(candidate);

    if (!name) {
      continue;
    }

    const normalizedName = normalize(name);

    if (
      normalizedName.length >= 3 &&
      normalizedQuery.includes(normalizedName)
    ) {
      return candidate.slug;
    }
  }

  /*
   * Park
   */
  for (const candidate of candidates) {
    const parkName = candidate.parkTitle.replace(/^อุทยานแห่งชาติ/, "").trim();

    const normalizedName = normalize(parkName);

    if (
      normalizedName.length >= 3 &&
      normalizedQuery.includes(normalizedName)
    ) {
      return candidate.slug;
    }
  }

  return undefined;
}

function queryMatchesAttraction(
  query: string,
  candidate: RawKnowledgeChunk,
): boolean {
  const name = getAttractionName(candidate);

  if (!name) {
    return false;
  }

  const normalizedName = normalize(name);

  if (normalizedName.length < 3) {
    return false;
  }

  return normalize(query).includes(normalizedName);
}

/*
 * ============================
 * Effort scoring
 * ============================
 */

function difficultyLevel(difficulty?: string): number | undefined {
  if (!difficulty) {
    return undefined;
  }

  switch (difficulty.trim().toUpperCase()) {
    case "LOW":
      return 1;

    case "LOW-MODERATE":
      return 2;

    case "MODERATE":
      return 3;

    case "MODERATE-HIGH":
      return 4;

    case "HIGH":
      return 5;

    case "VERY_HIGH":
      return 6;

    default:
      return undefined;
  }
}

function desiredEffortLevel(effort: QueryEffort): number | undefined {
  switch (effort) {
    case "LOW":
      return 1;

    case "HIGH":
      return 5;

    default:
      return undefined;
  }
}

function scoreEffort(
  desiredEffort: QueryEffort,
  candidateDifficulty?: string,
): number {
  const desired = desiredEffortLevel(desiredEffort);

  const actual = difficultyLevel(candidateDifficulty);

  if (desired === undefined || actual === undefined) {
    return 0;
  }

  const distance = Math.abs(desired - actual);

  if (distance === 0) {
    return EFFORT_EXACT_WEIGHT;
  }

  if (distance === 1) {
    return EFFORT_ADJACENT_WEIGHT;
  }

  return -EFFORT_DISTANCE_PENALTY * distance;
}

function getWalkingDistanceKm(walking?: string): number | undefined {
  if (!walking) {
    return undefined;
  }

  const normalized = walking.replace(/,/g, "");

  const metres = normalized.match(/(\d+(?:\.\d+)?)\s*(?:ม\.|เมตร)/i);

  if (metres) {
    return Number(metres[1]) / 1000;
  }

  const kilometres = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:-|–|ถึง)?\s*(?:\d+(?:\.\d+)?)?\s*กม\./i,
  );

  if (kilometres) {
    return Number(kilometres[1]);
  }

  return undefined;
}

/*
 * ============================
 * Dynamic semantic signal
 * ============================
 */

function detectDynamicSignal(candidates: RawKnowledgeChunk[]): boolean {
  if (candidates.length === 0) {
    return false;
  }

  const topCandidate = [...candidates].sort(
    (a, b) => Number(b.similarity) - Number(a.similarity),
  )[0];

  if (!topCandidate) {
    return false;
  }

  if (topCandidate.section !== "dynamic") {
    return false;
  }

  return Number(topCandidate.similarity) >= DYNAMIC_LIVE_MIN_SIMILARITY;
}

/*
 * ============================
 * Candidate ranking
 * ============================
 */

function scoreCandidate(
  query: string,
  candidate: RawKnowledgeChunk,
  analysis: KnowledgeQueryAnalysis,
  focused: boolean,
): number {
  let score = Number(candidate.similarity);

  const metadata = getCandidateMetadata(candidate);

  /*
   * PREPARATORY
   */
  if (!focused && metadata.legalStatus === "PREPARATORY") {
    score -= PREPARATORY_PENALTY;
  }

  /*
   * Exact attraction entity
   */
  if (queryMatchesAttraction(query, candidate)) {
    score += EXACT_ENTITY_WEIGHT;
  }

  /*
   * Activity compatibility
   */
  if (analysis.activityTypes.length > 0) {
    if (metadata.attractionType) {
      if (analysis.activityTypes.includes(metadata.attractionType)) {
        score += ACTIVITY_MATCH_WEIGHT;
      } else {
        score -= ACTIVITY_MISMATCH_PENALTY;
      }
    } else {
      /*
       * ถ้า user ขอ activity ชัด
       * section ทั่วไปยังใช้เป็น
       * supporting context ได้
       *
       * แต่ไม่ควรแซง attraction
       * ที่ตรง activity ง่ายเกินไป
       */
      score -= ACTIVITY_CONTEXT_PENALTY;
    }
  }

  /*
   * Tag compatibility
   */
  if (analysis.preferredTags.length > 0) {
    const availableTags = new Set(metadata.recommendationTags);

    const matches = analysis.preferredTags.filter((tag) =>
      availableTags.has(tag),
    ).length;

    score += Math.min(TAG_MATCH_MAX, matches * TAG_MATCH_WEIGHT);
  }

  /*
   * Difficulty compatibility
   */
  score += scoreEffort(analysis.effort, metadata.difficulty);

  /*
   * Walking distance
   */
  if (analysis.effort === "LOW") {
    const distanceKm = getWalkingDistanceKm(metadata.walking);

    if (distanceKm !== undefined && distanceKm >= LOW_EFFORT_WALKING_KM) {
      score -= LONG_WALK_PENALTY;
    }
  }

  /*
   * Section usefulness
   */
  if (candidate.section.startsWith("attraction:")) {
    score += ATTRACTION_SECTION_WEIGHT;
  }

  if (candidate.section === "suitability") {
    score += SUITABILITY_SECTION_WEIGHT;
  }

  if (candidate.section === "itinerary") {
    score += ITINERARY_SECTION_WEIGHT;
  }

  /*
   * Dynamic information
   */
  if (analysis.requiresLiveVerification && candidate.section === "dynamic") {
    score += DYNAMIC_SECTION_WEIGHT;
  }

  return score;
}

/*
 * ============================
 * Diversity
 * ============================
 */

function diversify(
  candidates: RetrievedKnowledgeChunk[],
  limit: number,
  focused: boolean,
): RetrievedKnowledgeChunk[] {
  if (focused) {
    return candidates.slice(0, limit);
  }

  const selected: RetrievedKnowledgeChunk[] = [];

  const countByPark = new Map<string, number>();

  for (const candidate of candidates) {
    const current = countByPark.get(candidate.slug) ?? 0;

    if (current >= MAX_CHUNKS_PER_PARK) {
      continue;
    }

    selected.push(candidate);

    countByPark.set(candidate.slug, current + 1);

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

/*
 * ============================
 * Safe analyzer fallback
 * ============================
 */

export function analyzeKnowledgeQueryLocally(
  query: string,
  vocabulary: QueryAnalyzerVocabulary,
): KnowledgeQueryAnalysis {
  const normalized = normalizeQuery(query);
  const allowedActivities = new Set(
    vocabulary.activityTypes.map((item) => item.toUpperCase()),
  );
  const activityTypes = Object.entries(ACTIVITY_WORDS)
    .filter(
      ([activity, words]) =>
        allowedActivities.has(activity) &&
        words.some((word) => {
          const position = normalized.lastIndexOf(word);
          return position >= 0 && !isNegated(normalized, position);
        }),
    )
    .map(([activity]) => activity);
  const preferredTags = vocabulary.tags
    .filter((tag) => normalized.includes(normalizeQuery(tag)))
    .slice(0, 3);
  let effort: QueryEffort = "ANY";
  if (
    /ไม่(?:อยาก|เอา|ต้องการ)?เดิน(?:หนัก|ไกล|เยอะ)|เดินไม่เยอะ|เดินน้อย|เที่ยวสบาย|ใช้แรงน้อย/.test(
      normalized,
    )
  ) {
    effort = "LOW";
  } else if (/เดินหนัก|เดินไกล|ท้าทาย|ขึ้นเขา/.test(normalized)) {
    effort = "HIGH";
  }
  const live = requiresLiveData(query);
  return {
    intent: live
      ? "LIVE_STATUS"
      : /แนะนำ|เหมาะ|อยากเที่ยว|ค้นหา|หาอุทยาน|เลือก/.test(normalized) ||
          activityTypes.length > 0 ||
          effort !== "ANY"
        ? "RECOMMENDATION"
        : "GENERAL_INFO",
    activityTypes,
    preferredTags,
    effort,
    requiresLiveVerification: live,
  };
}

export class KnowledgeRetriever implements KnowledgeRepository {
  constructor(
    private readonly embeddingProvider = new OllamaEmbeddingProvider(),
  ) {}

  async retrieve(
    query: string,
    limit = DEFAULT_LIMIT,
    signal?: AbortSignal,
  ): Promise<KnowledgeRetrievalResult> {
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      return {
        query,

        mode: "EXPLORATORY",

        explicitProvinces: [],

        requiresLiveVerification: false,

        analysis: {
          intent: "GENERAL_INFO",

          activityTypes: [],

          preferredTags: [],

          effort: "ANY",

          requiresLiveVerification: false,
        },

        chunks: [],
      };
    }

    /*
     * =====================
     * 1. Embedding
     * =====================
     */

    const embedding = await this.embeddingProvider.embed(cleanQuery, signal);

    assertKnowledgeEmbeddingDimension(embedding);

    const vector = `[${embedding.join(",")}]`;

    /*
     * =====================
     * 2. Broad vector search
     * =====================
     */

    const vectorCandidates = await prisma.$queryRaw<RawKnowledgeChunk[]>(
      Prisma.sql`
          SELECT
            kc."id"
              AS "id",

            kc."documentId"
              AS "documentId",

            kd."sourceEntityId"
              AS "slug",

            kd."title"
              AS "parkTitle",

            kc."title"
              AS "title",

            kc."section"
              AS "section",

            kc."content"
              AS "content",

            1 - (
              kc."embedding"
              <=>
              ${vector}::vector
            )
              AS "similarity"

          FROM
            "KnowledgeChunk" kc

          INNER JOIN
            "KnowledgeDocument" kd

          ON
            kd."id" =
            kc."documentId"

          WHERE
            kc."embedding"
            IS NOT NULL

          ORDER BY
            kc."embedding"
            <=>
            ${vector}::vector

          LIMIT
            ${VECTOR_CANDIDATE_LIMIT}
        `,
    );

    if (vectorCandidates.length === 0) {
      return {
        query: cleanQuery,

        mode: "EXPLORATORY",

        explicitProvinces: [],

        requiresLiveVerification: false,

        analysis: {
          intent: "GENERAL_INFO",

          activityTypes: [],

          preferredTags: [],

          effort: "ANY",

          requiresLiveVerification: false,
        },

        chunks: [],
      };
    }

    /*
     * =====================
     * 3. Entity detection
     * =====================
     */

    const focusedSlug = detectFocusedSlug(cleanQuery, vectorCandidates);

    const focused = Boolean(focusedSlug);

    /*
     * =====================
     * 4. Province detection
     * =====================
     *
     * deterministic
     * จาก metadata จริง
     */

    const explicitProvinces = detectExplicitProvinces(
      cleanQuery,
      vectorCandidates,
    );

    /*
     * =====================
     * 5. Candidate scope
     * =====================
     */

    let candidates: RawKnowledgeChunk[];

    if (focusedSlug) {
      /*
       * ถาม entity เจาะจง
       *
       * ดึงทุก chunk ใน park
       * แล้ว sort ด้วย query vector
       */
      candidates = await prisma.$queryRaw<RawKnowledgeChunk[]>(
        Prisma.sql`
            SELECT
              kc."id"
                AS "id",

              kc."documentId"
                AS "documentId",

              kd."sourceEntityId"
                AS "slug",

              kd."title"
                AS "parkTitle",

              kc."title"
                AS "title",

              kc."section"
                AS "section",

              kc."content"
                AS "content",

              1 - (
                kc."embedding"
                <=>
                ${vector}::vector
              )
                AS "similarity"

            FROM
              "KnowledgeChunk" kc

            INNER JOIN
              "KnowledgeDocument" kd

            ON
              kd."id" =
              kc."documentId"

            WHERE
              kc."embedding"
              IS NOT NULL

              AND
              kd."sourceEntityId"
              =
              ${focusedSlug}

            ORDER BY
              kc."embedding"
              <=>
              ${vector}::vector
          `,
      );
    } else {
      candidates = vectorCandidates;

      /*
       * Province เป็น hard
       * structured constraint
       *
       * แต่ province vocabulary
       * มาจาก DB ไม่ได้ hardcode
       */
      if (explicitProvinces.length > 0) {
        const filtered = candidates.filter((candidate) => {
          const provinces = getChunkProvinces(candidate.content);

          return explicitProvinces.some((province) =>
            provinces.includes(province),
          );
        });

        if (filtered.length > 0) {
          candidates = filtered;
        }
      }
    }

    /*
     * =====================
     * 6. Analyzer vocabulary
     * =====================
     */

    const vocabulary = buildVocabulary(candidates);

    /*
     * =====================
     * 7. Query analysis
     * =====================
     */

    const analysis = analyzeKnowledgeQueryLocally(cleanQuery, vocabulary);

    /*
     * =====================
     * 8. Dynamic fallback
     * =====================
     */

    /*
     * Dynamic semantic safeguard
     *
     * ใช้เฉพาะ focused entity query
     * เพื่อช่วยกรณี Analyzer
     * ตี intent ผิด
     *
     * ไม่ใช้ keyword ของ user
     */
    const dynamicSignal = focused && detectDynamicSignal(candidates);

    /*
     * ถ้า semantic query ใกล้
     * dynamic section มากพอ
     *
     * ถือว่า LIVE_STATUS
     * แม้ analyzer จะพลาด
     */
    const effectiveIntent =
      dynamicSignal || analysis.requiresLiveVerification
        ? "LIVE_STATUS"
        : analysis.intent;

    const requiresLiveVerification = effectiveIntent === "LIVE_STATUS";

    /*
     * LIVE_STATUS ไม่ควรเอา
     * activity/tag/effort มา boost
     * สิ่งอื่นโดยไม่จำเป็น
     */
    const effectiveAnalysis: KnowledgeQueryAnalysis =
      effectiveIntent === "LIVE_STATUS"
        ? {
            intent: "LIVE_STATUS",

            activityTypes: [],

            preferredTags: [],

            effort: "ANY",

            requiresLiveVerification: true,
          }
        : {
            ...analysis,

            intent: effectiveIntent,

            requiresLiveVerification: false,
          };

    /*
     * =====================
     * 9. Ranking
     * =====================
     */

    const ranked = candidates
      .map(
        (candidate): RetrievedKnowledgeChunk => ({
          ...candidate,

          similarity: Number(candidate.similarity),

          rankScore: scoreCandidate(
            cleanQuery,
            candidate,
            effectiveAnalysis,
            focused,
          ),
        }),
      )
      .sort((a, b) => b.rankScore - a.rankScore);

    /*
     * =====================
     * 10. Diversity
     * =====================
     */

    const chunks = diversify(ranked, limit, focused);

    return {
      query: cleanQuery,

      mode: focused ? "FOCUSED" : "EXPLORATORY",

      focusedSlug,

      explicitProvinces,

      requiresLiveVerification,

      analysis: effectiveAnalysis,

      chunks,
    };
  }

  async search(
    query: string,
    limit = DEFAULT_LIMIT,
  ): Promise<RetrievedKnowledgeChunk[]> {
    const result = await this.retrieve(query, limit);

    return result.chunks;
  }

  async findByParkSlugs(slugs: string[]): Promise<RetrievedKnowledgeChunk[]> {
    const uniqueSlugs = unique(slugs);
    if (uniqueSlugs.length === 0) return [];

    const chunks = await prisma.knowledgeChunk.findMany({
      where: { document: { sourceEntityId: { in: uniqueSlugs } } },
      select: {
        id: true,
        documentId: true,
        title: true,
        section: true,
        content: true,
        ordinal: true,
        document: { select: { sourceEntityId: true, title: true } },
      },
      orderBy: [{ documentId: "asc" }, { ordinal: "asc" }],
    });

    return chunks.map((chunk) => ({
      id: chunk.id,
      documentId: chunk.documentId,
      slug: chunk.document.sourceEntityId,
      parkTitle: chunk.document.title,
      title: chunk.title,
      section: chunk.section,
      content: chunk.content,
      similarity: 1,
      rankScore: 1,
    }));
  }
}

export const knowledgeRetriever = new KnowledgeRetriever();
