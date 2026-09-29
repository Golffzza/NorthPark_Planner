import type {
  AssistantComparison,
  AssistantContext,
  AssistantRecommendation,
  AssistantSource,
  ChatMessage,
  ChatResponse,
} from "@/lib/chat/shared/contracts";
import type { AssistantIntentAnalyzer } from "./assistant-intent";
import { resolveAssistantIntent } from "./assistant-intent";
import { extractContextPatch, mergeAssistantContext } from "./assistant-context";
import {
  answerStructuredFact,
  findMentionedParks,
  getParkCatalog,
  type ParkCatalogEntry,
} from "./park-catalog";
import { resolveParkReferences } from "./reference-resolver";
import { recommendParks } from "./recommendation-engine";
import { compareParks, selectComparisonEvidence } from "./comparison-service";
import { sourcesForEvidence } from "./source-metadata";
import type { RagChatResponder } from "@/lib/chat/rag/rag-chat-responder";
import type { KnowledgeRetrievalResult } from "@/lib/chat/rag/knowledge-retriever";
import {
  ACTIVITY_WORDS,
  asksForParkRationale,
  isGreeting,
  isNegated,
  normalizeQuery,
  requiresLiveData,
} from "./query-signals";
import { answerDeterministicParkFact } from "@/lib/chat/rag/deterministic-park-facts";

export type AssistantCoreResult = Omit<ChatResponse, "conversationId"> & {
  context: AssistantContext;
};

function humanizeDifficulty(value: string): string {
  return value
    .replaceAll("VERY_HIGH", "หนักมาก")
    .replaceAll("MODERATE-HIGH", "ค่อนข้างหนัก")
    .replaceAll("LOW-MODERATE", "เบาถึงปานกลาง")
    .replaceAll("MODERATE", "ปานกลาง")
    .replaceAll("HIGH", "หนัก")
    .replaceAll("LOW", "เบา")
    .replaceAll("ความยาก", "ระดับการเดิน");
}

function formatRecommendationReason(reason: string): string {
  if (reason.startsWith("ข้อควรระวัง:")) {
    return `ควรระวัง: ${reason.slice("ข้อควรระวัง:".length).trim()}`;
  }
  if (reason.includes("ระยะเดิน") || reason.includes("ความยาก")) {
    return `การเดิน: ${humanizeDifficulty(reason)}`;
  }
  if (reason.startsWith("ยังไม่ยืนยัน")) return reason;
  return `จุดที่น่าสนใจ: ${reason}`;
}

function formatRecommendations(results: AssistantRecommendation[]): string {
  if (results.length === 0) {
    return "ไม่พบอุทยานที่ตรงกับเงื่อนไขทั้งหมด ลองผ่อนเงื่อนไขจังหวัด กิจกรรม หรือระดับการเดินดูได้ครับ";
  }
  return [
    `จากเงื่อนไขที่ให้มา ผมพบ ${results.length} ตัวเลือกที่น่าสนใจครับ`,
    ...results.map((result, index) => [
      `${index + 1}) ${result.park.name}`,
      ...result.reasons.map((reason) => `• ${formatRecommendationReason(reason)}`),
    ].join("\n")),
  ].join("\n");
}

function formatComparison(comparison: AssistantComparison): string {
  return [
    "ลองเทียบจากข้อมูลรายจุดท่องเที่ยวที่มีนะครับ",
    ...comparison.parks.map((item, index) => [
      `${index + 1}) ${item.park.name} — ${item.provinces.join(", ")}`,
      ...item.highlights.map((highlight) => `• ${humanizeDifficulty(highlight)}`),
    ].join("\n")),
    "",
    comparison.summary,
  ].join("\n");
}

function sourceIdsFromContent(content: string): string[] {
  const value = content.match(/^- \*\*source_ids:\*\*\s*(.+)$/im)?.[1];
  if (!value) return [];
  return value
    .replaceAll("`", "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function evidenceField(content: string, field: string): string | undefined {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content.match(new RegExp(`^- \\*\\*${escaped}:\\*\\*\\s*(.+)$`, "im"))?.[1]
    ?.replaceAll("`", "").trim();
}

function sourcesFromRetrieval(retrieval?: KnowledgeRetrievalResult): AssistantSource[] {
  if (!retrieval) return [];
  return sourcesForEvidence(
    retrieval.chunks.map((chunk) => ({
      parkSlug: chunk.slug,
      sourceIds: sourceIdsFromContent(chunk.content),
    })),
  );
}

function sourcesFromChunks(chunks: KnowledgeRetrievalResult["chunks"]): AssistantSource[] {
  return sourcesForEvidence(chunks.map((chunk) => ({
    parkSlug: chunk.slug,
    sourceIds: sourceIdsFromContent(chunk.content),
  })));
}

function selectRelevantChunks(
  chunks: KnowledgeRetrievalResult["chunks"],
  message: string,
): KnowledgeRetrievalResult["chunks"] {
  const wantedSections = new Set<string>();
  if (/จังหวัด|ชื่อ|ข้อมูลพื้นฐาน/.test(message)) wantedSections.add("basic_info");
  if (/เดินทาง|เข้า|รถ|ทาง/.test(message)) wantedSections.add("access");
  if (/ปลอดภัย|ระวัง|อันตราย/.test(message)) wantedSections.add("safety");
  if (/ห้องน้ำ|อาหาร|ที่จอด|สิ่งอำนวย|ที่พัก|บ้านพัก|ลานกางเต็นท์/.test(message)) wantedSections.add("facilities");
  if (/เหมาะ|เดิน|ผู้สูงอายุ|เด็ก/.test(message)) wantedSections.add("suitability");
  if (/เปิด|ปิด|กี่โมง|เวลาเปิด|สถานะ/.test(message)) wantedSections.add("dynamic");
  const rationaleQuestion = asksForParkRationale(message);
  if (rationaleQuestion) wantedSections.add("suitability");
  const normalizedMessage = normalizeQuery(message);
  const activityTypes = Object.entries(ACTIVITY_WORDS)
    .filter(([, words]) => words.some((word) => {
      const position = normalizedMessage.lastIndexOf(word);
      return position >= 0 && !isNegated(normalizedMessage, position);
    }))
    .map(([type]) => type);
  const scored = chunks.map((chunk, ordinal) => {
    let score = chunk.section === "overview" ? 4 : 0;
    if (wantedSections.has(chunk.section)) score += 8;
    if (activityTypes.some((type) => chunk.section.startsWith(`attraction:${type}:`))) score += 10;
    if (/มีอะไร|กิจกรรม|เที่ยว|จุดเด่น/.test(message) && chunk.section.startsWith("attraction:")) score += 6;
    if (rationaleQuestion && chunk.section.startsWith("attraction:")) score += 6;
    return { chunk, score, ordinal };
  }).sort((a, b) => b.score - a.score || a.ordinal - b.ordinal);
  if (/มีอะไร|กิจกรรม|เที่ยว|จุดเด่น/.test(message)) {
    const attractions = scored.filter((item) => item.chunk.section.startsWith("attraction:"));
    if (attractions.length) return attractions.slice(0, 6).map((item) => item.chunk);
  }
  const relevant = scored.filter((item) => item.score > 0);
  return (relevant.length ? relevant : scored).slice(0, 6).map((item) => item.chunk);
}

function generalSectionBody(content: string): string | undefined {
  const lines = content.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => /^##\s+\d+\./.test(line.trim()));
  const bodyLines = (headingIndex >= 0 ? lines.slice(headingIndex + 1) : lines)
    .filter((line) => !/^(?:อุทยาน|ชื่ออังกฤษ|park_slug|slug|จังหวัด|legal_status|verified_at|recommendation_tags|section):/i.test(line.trim()));
  const policyIndex = bodyLines.findIndex((line) =>
    /^\*\*(?:Route|Seasonality|Safety|Freshness) policy\*\*$/i.test(line.trim()),
  );
  const visibleLines = (policyIndex >= 0 ? bodyLines.slice(0, policyIndex) : bodyLines)
    .map((line) => {
      const trimmed = line.trim();
      const field = trimmed.match(/^-\s+\*\*([^*]+):\*\*\s*(.+)$/);
      if (field) {
        const [, key, rawValue] = field;
        const value = rawValue.replaceAll("`", "").trim();
        if (/^(?:UNKNOWN_IN_STATIC_RAG|USE_[A-Z0-9_]+)$/i.test(value)) return undefined;
        const label = key === "last_known_status_note"
          ? "หมายเหตุสถานะล่าสุด"
          : key.replaceAll("_", " ");
        return `• ${label}: ${value}`;
      }
      return trimmed
        .replace(/^>\s*/, "")
        .replace(/^###\s+/, "")
        .replace(/^-\s+/, "• ")
        .replaceAll("**", "")
        .replaceAll("`", "");
    })
    .filter((line): line is string => Boolean(line))
    .filter((line) => !/(?:UNKNOWN_IN_STATIC_RAG|USE_[A-Z0-9_]+)/i.test(line));
  if (visibleLines.length === 0) return undefined;
  const visible = visibleLines.join("\n");
  return visible.length <= 600 ? visible : `${visible.slice(0, 597).trimEnd()}...`;
}

function displaySectionTitle(title: string): string {
  const withoutParkName = title.includes(":")
    ? title.split(":").slice(1).join(":")
    : title;
  return withoutParkName
    .replace(/^#+\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\s*\(Dynamic\)\s*$/i, "")
    .trim();
}

function formatParkInformation(
  retrieval: KnowledgeRetrievalResult | undefined,
  parkName?: string,
): string {
  if (!retrieval?.chunks.length) {
    return "ขณะนี้ไม่พบข้อมูลอ้างอิงเพียงพอสำหรับอุทยานนี้ครับ";
  }
  const items = retrieval.chunks.map((chunk) => {
    const summary = evidenceField(chunk.content, "summary");
    const details = chunk.section.startsWith("attraction:") ? [
      evidenceField(chunk.content, "walking") && `ระยะเดิน ${evidenceField(chunk.content, "walking")}`,
      evidenceField(chunk.content, "difficulty") && `ความยาก ${evidenceField(chunk.content, "difficulty")}`,
      evidenceField(chunk.content, "risks") && `ข้อควรระวัง ${evidenceField(chunk.content, "risks")}`,
    ].filter(Boolean).join("; ") : "";
    if (!chunk.section.startsWith("attraction:")) {
      const body = generalSectionBody(chunk.content);
      return humanizeDifficulty(`${displaySectionTitle(chunk.title)}${body ? `: ${body}` : ""}`);
    }
    return humanizeDifficulty(`${chunk.title}${summary ? `: ${summary}` : ""}${details ? ` (${details})` : ""}`);
  });
  const uniqueItems = [...new Set(items)].slice(0, 5);
  return [
    parkName ? `สำหรับ${parkName} พบข้อมูลดังนี้ครับ` : "ข้อมูลที่พบมีดังนี้ครับ",
    ...uniqueItems.map((item, index) => `${index + 1}. ${item}`),
    ...(retrieval.requiresLiveVerification
      ? ["ข้อมูลสถานะปัจจุบันยังต้องตรวจสอบกับอุทยานโดยตรงครับ"]
      : []),
  ].join("\n");
}

function firstCompactEvidenceLine(content: string): string | undefined {
  const line = generalSectionBody(content)
    ?.split(/\r?\n/)
    .map((item) => item.replace(/^[•*-]\s*/, "").trim())
    .find((item) => item.length > 3
      && !/^\d+\.\s*/.test(item)
      && !/^(?:ภาพรวม|เหมาะกับ|ควรหลีกเลี่ยง.*|ข้อควรพิจารณา.*)$/i.test(item));
  if (!line) return undefined;
  const firstClause = line.split(/\s+(?=จึง|แต่|อย่างไรก็ตาม)/, 1)[0];
  if (firstClause.length <= 180) return firstClause;
  const boundary = firstClause.lastIndexOf(" ", 177);
  const end = boundary >= 120 ? boundary : 177;
  return `${firstClause.slice(0, end).trimEnd()}...`;
}

function formatParkRationale(
  retrieval: KnowledgeRetrievalResult | undefined,
  parkName?: string,
): string {
  if (!retrieval?.chunks.length) {
    return "ขณะนี้ไม่พบข้อมูลอ้างอิงเพียงพอสำหรับอุทยานนี้ครับ";
  }

  const overview = retrieval.chunks.find((chunk) => chunk.section === "overview");
  const suitability = retrieval.chunks.find((chunk) => chunk.section === "suitability");
  const overviewLine = overview
    ? firstCompactEvidenceLine(overview.content)
    : undefined;
  const suitabilityLine = suitability
    ? firstCompactEvidenceLine(suitability.content)
    : undefined;
  const attractions = [
    ...new Set(
      retrieval.chunks
        .filter((chunk) => chunk.section.startsWith("attraction:"))
        .map((chunk) => displaySectionTitle(chunk.title))
        .filter(Boolean),
    ),
  ].slice(0, 3);
  const details = [
    overviewLine ? `• ภาพรวม: ${overviewLine}` : undefined,
    attractions.length ? `• จุดเด่น: ${attractions.join(", ")}` : undefined,
    suitabilityLine ? `• เหมาะกับ: ${suitabilityLine}` : undefined,
  ].filter((line): line is string => Boolean(line));

  if (details.length === 0) return formatParkInformation(retrieval, parkName);
  return [
    `${parkName ?? "อุทยานนี้"}มีเหตุผลที่น่าพิจารณาดังนี้ครับ`,
    ...details,
    ...(retrieval.requiresLiveVerification
      ? ["สถานะปัจจุบันควรตรวจสอบกับอุทยานโดยตรงก่อนเดินทางครับ"]
      : []),
  ].join("\n");
}

function catalogEntriesForReferences(
  references: { slug: string }[],
  catalog: ParkCatalogEntry[],
): ParkCatalogEntry[] {
  return references.map((ref) => catalog.find((park) => park.slug === ref.slug))
    .filter((park): park is ParkCatalogEntry => Boolean(park));
}

function cloneAssistantContext(context: AssistantContext): AssistantContext {
  return {
    ...context,
    ...(context.userConstraints ? {
      userConstraints: {
        ...context.userConstraints,
        ...(context.userConstraints.activities
          ? { activities: [...context.userConstraints.activities] }
          : {}),
        ...(context.userConstraints.excludedActivities
          ? { excludedActivities: [...context.userConstraints.excludedActivities] }
          : {}),
        ...(context.userConstraints.companions
          ? { companions: [...context.userConstraints.companions] }
          : {}),
      },
    } : {}),
    ...(context.lastParkResults ? { lastParkResults: [...context.lastParkResults] } : {}),
    ...(context.lastRecommendedParks ? { lastRecommendedParks: [...context.lastRecommendedParks] } : {}),
    ...(context.lastComparedParks ? { lastComparedParks: [...context.lastComparedParks] } : {}),
  };
}

export class AssistantCoreService {
  private readonly catalog = getParkCatalog();

  constructor(
    private readonly analyzer: AssistantIntentAnalyzer,
    private readonly rag: RagChatResponder,
  ) {}

  private async retrieveParkChunks(slugs: string[]): Promise<KnowledgeRetrievalResult["chunks"]> {
    try {
      return await this.rag.retrieveParkChunks(slugs);
    } catch (error) {
      console.warn("Assistant park knowledge retrieval failed:", error);
      return [];
    }
  }

  async respond(
    history: ChatMessage[],
    currentContext: AssistantContext,
    message: string,
    signal?: AbortSignal,
  ): Promise<AssistantCoreResult> {
    if (isGreeting(message)) {
      return { message: "สวัสดีครับ ผมช่วยค้นข้อมูล แนะนำ และเปรียบเทียบอุทยานในภาคเหนือได้ อยากไปจังหวัดไหนหรือสนใจกิจกรรมอะไรครับ?", context: currentContext, contextSummary: currentContext };
    }
    const hasParkContext = Boolean(
      currentContext.selectedPark
      || currentContext.lastParkResults?.length
      || currentContext.lastRecommendedParks?.length
      || currentContext.lastComparedParks?.length,
    );
    const intent = await resolveAssistantIntent(
      message,
      this.analyzer,
      signal,
      hasParkContext,
    );
    const context = intent.intent === "RECOMMEND" || intent.intent === "PARK_SEARCH"
      ? mergeAssistantContext(cloneAssistantContext(currentContext), extractContextPatch(message))
      : cloneAssistantContext(currentContext);
    context.lastIntent = intent.intent;
    const references = resolveParkReferences(message, context);
    const explicitParks = findMentionedParks(message);

    if (references.unresolved && explicitParks.length === 0) {
      return {
        message: "หมายถึงอุทยานไหนครับ? กรุณาระบุชื่อหรือเลือกจากรายการก่อนหน้า",
        context,
        contextSummary: context,
      };
    }

    const factPark = explicitParks[0] ?? references.parks[0];
    const deterministic = answerDeterministicParkFact(factPark ? `${factPark.name}: ${message}` : message);
    if (deterministic) {
      if (factPark) {
        context.selectedPark = factPark;
        context.lastParkResults = [factPark];
        delete context.lastRecommendedParks;
        delete context.lastComparedParks;
      }
      return { message: deterministic, context, contextSummary: context };
    }

    if (intent.intent === "SYSTEM_FACT") {
      const fact = answerStructuredFact(message, this.catalog);
      if (fact) {
        if (fact.parks) {
          context.lastParkResults = fact.parks;
          delete context.lastRecommendedParks;
          delete context.lastComparedParks;
          delete context.selectedPark;
        }
        return { message: fact.message, context, contextSummary: context };
      }
    }

    if (intent.intent === "RECOMMEND" || intent.intent === "PARK_SEARCH") {
      const candidates = (context.userConstraints?.province
        ? this.catalog.filter((park) => park.provinces.includes(context.userConstraints!.province!))
        : this.catalog);
      const evidence = await this.retrieveParkChunks(candidates.map((park) => park.slug));
      if (evidence.length === 0) {
        return {
          message: "ขณะนี้ไม่สามารถตรวจข้อมูลอุทยานสำหรับการแนะนำได้ กรุณาลองอีกครั้งครับ",
          context,
          contextSummary: context,
        };
      }
      const recommendations = recommendParks(
        this.catalog,
        context.userConstraints ?? {},
        3,
        evidence,
      );
      context.lastRecommendedParks = recommendations.map((item) => item.park);
      context.lastParkResults = context.lastRecommendedParks;
      delete context.lastComparedParks;
      delete context.selectedPark;
      const draft = formatRecommendations(recommendations);
      const usedEvidence = recommendations.flatMap((recommendation) =>
        evidence.filter((chunk) => {
          if (chunk.slug !== recommendation.park.slug || !chunk.section.startsWith("attraction:")) return false;
          const evidenceName = chunk.content.match(/^สถานที่:\s*(.+)$/m)?.[1]?.trim();
          return Boolean(evidenceName && recommendation.reasons.some((reason) => reason.includes(evidenceName)));
        }),
      );
      return {
        message: await this.rag.composeGrounded(message, draft, usedEvidence, signal),
        recommendations,
        ...(usedEvidence.length ? { sources: sourcesFromChunks(usedEvidence) } : {}),
        context,
        contextSummary: context,
      };
    }

    if (intent.intent === "COMPARE") {
      const fallbackReferences =
        references.parks.length >= 2
          ? references.parks
          : context.lastRecommendedParks?.slice(0, 2) ?? [];
      const parks = explicitParks.length > 0
        ? explicitParks
        : catalogEntriesForReferences(fallbackReferences, this.catalog);
      if (parks.length < 2) {
        return {
          message: "ต้องการเปรียบเทียบอุทยานสองแห่งใดครับ?",
          context,
          contextSummary: context,
        };
      }
      const evidence = await this.retrieveParkChunks(parks.map((park) => park.slug));
      const comparisonEvidence = selectComparisonEvidence(parks, evidence, message);
      const evidencedParks = new Set(comparisonEvidence.map((chunk) => chunk.slug));
      if (parks.some((park) => !evidencedParks.has(park.slug))) {
        return {
          message: "ขณะนี้ไม่พบข้อมูลอ้างอิงเพียงพอสำหรับเปรียบเทียบอุทยานทั้งสองแห่งครับ",
          context,
          contextSummary: context,
        };
      }
      const comparison = compareParks(parks, comparisonEvidence);
      context.lastComparedParks = comparison.parks.map((item) => item.park);
      context.lastParkResults = context.lastComparedParks;
      delete context.lastRecommendedParks;
      delete context.selectedPark;
      const draft = formatComparison(comparison);
      return {
        message: await this.rag.composeGrounded(message, draft, comparisonEvidence, signal),
        comparison,
        ...(comparisonEvidence.length ? { sources: sourcesFromChunks(comparisonEvidence) } : {}),
        context,
        contextSummary: context,
      };
    }

    const resolvedPark = explicitParks[0] ?? references.parks[0];
    if (resolvedPark) {
      context.selectedPark = resolvedPark;
      context.lastParkResults = [resolvedPark];
      delete context.lastRecommendedParks;
      delete context.lastComparedParks;
    }
    const ragMessage = resolvedPark
      ? `${resolvedPark.name}: ${message}`
      : message;

    if (intent.intent === "PARK_INFO") {
      const directChunks = resolvedPark
        ? selectRelevantChunks(await this.retrieveParkChunks([resolvedPark.slug]), message)
        : [];
      const retrieval = directChunks.length ? {
        query: ragMessage,
        mode: "FOCUSED" as const,
        focusedSlug: resolvedPark?.slug,
        explicitProvinces: [],
        requiresLiveVerification: requiresLiveData(message),
        analysis: {
          intent: requiresLiveData(message) ? "LIVE_STATUS" as const : "GENERAL_INFO" as const,
          activityTypes: [], preferredTags: [], effort: "ANY" as const,
          requiresLiveVerification: requiresLiveData(message),
        },
        chunks: directChunks,
      } : await this.rag.retrieveOnly(resolvedPark ? [] : history, ragMessage, signal);
      const sources = sourcesFromRetrieval(retrieval);
      const retrievedParks = retrieval?.chunks
        .map((chunk) => this.catalog.find((park) => park.slug === chunk.slug))
        .filter((park): park is ParkCatalogEntry => Boolean(park));
      if (retrievedParks?.length) {
        context.lastParkResults = [
          ...new Map(retrievedParks.map((park) => [park.slug, park])).values(),
        ];
        delete context.lastRecommendedParks;
        delete context.lastComparedParks;
      }
      const draft = asksForParkRationale(message)
        ? formatParkRationale(retrieval, resolvedPark?.name)
        : formatParkInformation(retrieval, resolvedPark?.name);
      return {
        message: retrieval?.chunks.length
          ? await this.rag.composeGrounded(message, draft, retrieval.chunks, signal)
          : draft,
        ...(sources.length ? { sources } : {}),
        context,
        contextSummary: context,
      };
    }

    if (intent.intent === "GENERAL") {
      return {
        message: [
          "ได้ครับ ช่วยบอกเพิ่มอีกนิดว่ากำลังมองหาแบบไหน",
          "• จังหวัดที่สนใจ",
          "• กิจกรรม เช่น น้ำตก กางเต็นท์ หรือเดินป่า",
          "• หรือชื่ออุทยานที่อยากถาม",
        ].join("\n"),
        context,
        contextSummary: context,
      };
    }

    const detailed = await this.rag.respondDetailed(
      resolvedPark ? [] : history,
      ragMessage,
      signal,
    );
    const sources = sourcesFromRetrieval(detailed.retrieval);
    const retrievedParks = detailed.retrieval?.chunks
      .map((chunk) => this.catalog.find((park) => park.slug === chunk.slug))
      .filter((park): park is ParkCatalogEntry => Boolean(park));
    if (retrievedParks?.length) {
      context.lastParkResults = [
        ...new Map(retrievedParks.map((park) => [park.slug, park])).values(),
      ];
      delete context.lastRecommendedParks;
      delete context.lastComparedParks;
    }
    return {
      message: detailed.message,
      ...(sources.length ? { sources } : {}),
      context,
      contextSummary: context,
    };
  }
}
