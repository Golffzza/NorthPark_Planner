// ./lib/chat/rag/rag-chat-responder.ts

import type {
  ChatMessage,
  LlmProvider,
} from "@/lib/chat/shared/contracts";

import {
  knowledgeRetriever,
  type KnowledgeRepository,
  type KnowledgeRetrievalResult,
} from "@/lib/chat/rag/knowledge-retriever";

import {
  NORTHPARK_GROUNDED_COMPOSER_PROMPT,
  NORTHPARK_SYSTEM_PROMPT,
} from "@/lib/chat/llm/prompts";

import {
  answerDeterministicParkFact,
} from "@/lib/chat/rag/deterministic-park-facts";
import knowledgeIndex from "@/data/knowledge/knowledge-index.json";

const RAG_RESULT_LIMIT =
  Number(
    process.env
      .CHATBOT_RAG_RESULT_LIMIT ??
      4,
  );

const RAG_CHUNK_MAX_CHARS =
  Number(
    process.env
      .CHATBOT_RAG_CHUNK_MAX_CHARS ??
      900,
  );

const RAG_HISTORY_USER_TURNS =
  Number(
    process.env
      .CHATBOT_RAG_HISTORY_USER_TURNS ??
      2,
  );

const COMPOSE_TIMEOUT_MS = Number(
  process.env.ASSISTANT_COMPOSE_TIMEOUT_MS ?? 3_500,
);

const COMPOSE_NUM_PREDICT = Number(
  process.env.ASSISTANT_COMPOSE_NUM_PREDICT ?? 64,
);

function clip(
  value: string,
  maxLength: number,
): string {
  const text =
    value.trim();

  if (
    text.length <= maxLength
  ) {
    return text;
  }

  return `${text.slice(
    0,
    maxLength,
  )}…`;
}

const INTERNAL_COMPOSITION_MARKER = /\b(?:[EK]\d+|RAG|chunks?|vectors?|embeddings?|rank(?:ing)? score)\b/i;

function isComparisonQuestion(question: string): boolean {
  return /เปรียบ|เทียบ|ต่างกัน|ไหน.{0,16}กว่า/.test(question);
}

function normalizeComposedSummary(value: string): string {
  return value
    .trim()
    .replace(/^```(?:text)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/\s*\r?\n+\s*/g, " ")
    .trim();
}

/**
 * Retrieval ต้องเห็น context ก่อนหน้า
 *
 * ตัวอย่าง:
 *
 * User: อยากเที่ยวเชียงใหม่
 * User: ชอบน้ำตก
 * User: ไม่อยากเดินเยอะ
 *
 * ถ้าส่งเฉพาะข้อความล่าสุด
 * Retriever จะเสียเชียงใหม่ + น้ำตก
 */
export function buildRetrievalQuery(
  history: ChatMessage[],
  currentMessage: string,
): string {
  const previousUserMessages =
    history
      .filter(
        (
          message,
        ): message is ChatMessage & {
          role: "user";
        } =>
          message.role ===
          "user",
      )
      .slice(
        -RAG_HISTORY_USER_TURNS,
      )
      .map(
        (message) =>
          message.content.trim(),
      )
      .filter(Boolean);

  if (
    previousUserMessages.length ===
    0
  ) {
    return currentMessage.trim();
  }

  return [
    "บริบทความต้องการก่อนหน้า:",
    ...previousUserMessages.map(
      (message, index) =>
        `${index + 1}. ${message}`,
    ),
    "",
    "ข้อความล่าสุด:",
    currentMessage.trim(),
  ].join("\n");
}

function buildKnowledgeHeader(
  retrieval: KnowledgeRetrievalResult,
): string {
  return [
    "ข้อมูลอ้างอิงภายในของ NorthPark",
    `retrieval_mode: ${retrieval.mode}`,
    `focused_park: ${retrieval.focusedSlug ?? "NONE"}`,
    `live_verification_required: ${
      retrieval.requiresLiveVerification
        ? "YES"
        : "NO"
    }`,
  ].join("\n");
}

export function buildKnowledgeContext(
  retrieval: KnowledgeRetrievalResult,
): string {
  const header =
    buildKnowledgeHeader(
      retrieval,
    );

  if (
    retrieval.chunks.length ===
    0
  ) {
    return `
${header}

ไม่พบข้อมูลอ้างอิงที่เหมาะสมจากฐานความรู้สำหรับคำถามนี้

กฎ:
- ห้ามแต่งข้อเท็จจริงเฉพาะของอุทยานขึ้นเอง
- ถ้าต้องใช้ข้อมูลเฉพาะที่ไม่มีหลักฐาน ให้บอกผู้ใช้ตามธรรมชาติว่าไม่มีข้อมูลเพียงพอ
- ห้ามพูดถึงระบบ retrieval, vector, chunk หรือคะแนนภายใน
`.trim();
  }

  const evidence =
    retrieval.chunks.map(
      (chunk, index) => {
        return `
[K${index + 1}]
อุทยาน: ${chunk.parkTitle}
slug: ${chunk.slug}
หัวข้อ: ${chunk.title}
section: ${chunk.section}

${clip(
  chunk.content,
  RAG_CHUNK_MAX_CHARS,
)}
`.trim();
      },
    );

  return `
${header}

ต่อไปนี้คือข้อมูลที่ค้นได้จากฐานความรู้ NorthPark:

${evidence.join("\n\n")}

กฎการใช้ข้อมูล:

- ใช้ข้อมูล [K1], [K2], ... เป็นหลักฐานสำหรับข้อเท็จจริงเฉพาะของอุทยาน
- สรุปและเรียบเรียงเป็นภาษาธรรมชาติ ไม่ต้องอ่านข้อความดิบกลับทั้งหมด
- ห้ามแต่งข้อมูลที่ไม่มีอยู่ในหลักฐาน
- ห้ามบอกผู้ใช้เรื่อง vector similarity, rank score, embedding, RAG, chunk หรือระบบภายใน
- ไม่จำเป็นต้องเขียน [K1] หรือ [K2] ในคำตอบ เว้นแต่ระบบในอนาคตกำหนดให้แสดง citation
- หากหลักฐานขัดกัน ให้ตอบอย่างระมัดระวังและไม่ฟันธงเกินข้อมูล

กฎข้อมูลสด:

${
  retrieval.requiresLiveVerification
    ? `
คำถามนี้ต้องตรวจข้อมูลสด

ตอนนี้ระบบยังไม่ได้เชื่อม live tools สำหรับยืนยันข้อมูลปัจจุบันใน conversation pipeline นี้

ดังนั้น:
- ห้ามยืนยันว่า "ตอนนี้เปิด", "ตอนนี้ปิด", "ไปได้แน่นอน" หรือสถานะปัจจุบันอื่นจาก static knowledge
- สามารถอธิบายข้อมูลพื้นฐานหรือ last-known context ที่มีในหลักฐานได้
- ต้องบอกผู้ใช้สั้น ๆ ว่ายังยืนยันสถานะล่าสุดไม่ได้
`
    : `
คำถามนี้ไม่จำเป็นต้องใช้ข้อมูลสดตามผล retrieval
สามารถตอบจากฐานความรู้ที่ให้มาได้
`
}
`.trim();
}

export class RagChatResponder {
  constructor(
    private readonly llm:
      LlmProvider,
    private readonly retriever: KnowledgeRepository =
      knowledgeRetriever,
  ) {}

  async retrieveParkChunks(slugs: string[]): Promise<import("./knowledge-retriever").RetrievedKnowledgeChunk[]> {
    try {
      return await this.retriever.findByParkSlugs?.(slugs) ?? [];
    } catch (error) {
      console.warn("Direct park knowledge retrieval failed:", error);
      return [];
    }
  }

  async composeGrounded(
    question: string,
    draft: string,
    chunks: import("./knowledge-retriever").RetrievedKnowledgeChunk[],
    signal?: AbortSignal,
  ): Promise<string> {
    if (chunks.length === 0) return draft;
    if (this.llm.prepare && this.llm.isPrepared && !this.llm.isPrepared()) {
      void this.llm.prepare();
      return draft;
    }
    const evidence = chunks.slice(0, 10).map((chunk, index) =>
      `[E${index + 1}] ${chunk.parkTitle} | ${chunk.title}\n${clip(chunk.content, 650)}`,
    ).join("\n\n");
    const input = `${question}\n${draft}\n${evidence}`;
    try {
      const rawAnswer = await this.llm.chat([
        {
          role: "system",
          content: NORTHPARK_GROUNDED_COMPOSER_PROMPT,
        },
        { role: "user", content: `คำถาม: ${question}\n\nร่างที่ตรวจแล้ว:\n${draft}` },
      ], {
        signal,
        timeoutMs: COMPOSE_TIMEOUT_MS,
        numPredict: COMPOSE_NUM_PREDICT,
        temperature: 0.2,
      });

      const answer = normalizeComposedSummary(rawAnswer);
      if (!answer || answer === draft.trim() || answer.includes(draft.trim()) || draft.includes(answer)) {
        return draft;
      }

      const allowedNumbers = new Set<string>([
        ...(input.match(/\d+(?:[.,-]\d+)*/g) ?? []),
        "1", "2", "3",
      ]);
      const outputNumbers = answer.match(/\d+(?:[.,-]\d+)*/g) ?? [];
      const insertedPark = knowledgeIndex.some((park) => {
        const names = [park.nameTh, park.nameTh.replace(/^อุทยานแห่งชาติ/, ""), park.nameEn]
          .filter((name) => name.length >= 3);
        return names.some((name) => answer.toLowerCase().includes(name.toLowerCase())
          && !input.toLowerCase().includes(name.toLowerCase()));
      });
      const orderedDraftParks = knowledgeIndex
        .map((park) => {
          const names = [park.nameTh, park.nameTh.replace(/^อุทยานแห่งชาติ/, ""), park.nameEn]
            .filter((name) => name.length >= 3);
          const positions = names.map((name) => draft.toLowerCase().indexOf(name.toLowerCase()))
            .filter((position) => position >= 0);
          return { park, position: positions.length ? Math.min(...positions) : -1 };
        })
        .filter((item) => item.position >= 0)
        .sort((a, b) => a.position - b.position);
      const firstDraftPark = orderedDraftParks[0]?.park;
      const highlightsLowerRankedPark = !isComparisonQuestion(question)
        && Boolean(firstDraftPark) && orderedDraftParks
        .slice(1)
        .some(({ park }) => {
          const names = [park.nameTh, park.nameTh.replace(/^อุทยานแห่งชาติ/, ""), park.nameEn];
          return names.some((name) => name.length >= 3 && answer.toLowerCase().includes(name.toLowerCase()));
        });
      const unsupportedCertainty = [
        "เหมาะสำหรับทุกคน",
        "เหมาะกับทุกคน",
        "ช่วงเวลาสั้น",
        "ดีที่สุด",
        "เหมาะที่สุด",
        "น้อยที่สุด",
        "มากที่สุด",
        "ง่ายที่สุด",
        "ปลอดภัยที่สุด",
        "สูงที่สุด",
        "ยอดนิยมที่สุด",
        "ปลอดภัยแน่นอน",
        "เปิดอยู่",
        "เปิดแน่นอน",
      ].some((phrase) => answer.includes(phrase) && !draft.includes(phrase));
      const unsupportedComparison = ["ดีกว่า", "เหมาะกว่า", "เดินน้อยกว่า", "ง่ายกว่า", "ปลอดภัยกว่า", "ควรเลือก"]
        .some((phrase) => answer.includes(phrase) && !draft.includes(phrase));
      return outputNumbers.every((value) => allowedNumbers.has(value))
        && !insertedPark
        && !highlightsLowerRankedPark
        && !unsupportedCertainty
        && !unsupportedComparison
        && !INTERNAL_COMPOSITION_MARKER.test(answer)
        && answer.length <= 320
        ? `${answer}\n\n${draft}`
        : draft;
    } catch {
      return draft;
    }
  }

  async respond(
    history: ChatMessage[],
    currentMessage: string,
    signal?: AbortSignal,
  ): Promise<string> {
    return (await this.respondDetailed(history, currentMessage, signal)).message;
  }

  async respondDetailed(
    history: ChatMessage[],
    currentMessage: string,
    signal?: AbortSignal,
  ): Promise<{ message: string; retrieval?: KnowledgeRetrievalResult }> {
    const deterministicAnswer =
      answerDeterministicParkFact(
        currentMessage,
      );

    if (deterministicAnswer) {
      return { message: deterministicAnswer };
    }

    const retrieval = await this.retrieveOnly(history, currentMessage, signal);

    const messages:
      ChatMessage[] = [
      {
        role: "system",
        content:
          NORTHPARK_SYSTEM_PROMPT,
      },
    ];

    if (retrieval) {
      messages.push({
        role: "system",
        content: buildKnowledgeContext(retrieval),
      });
    } else {
      messages.push({
        role: "system",
        content: `
ฐานความรู้ NorthPark ไม่สามารถใช้งานได้ใน turn นี้

ห้ามแต่งข้อเท็จจริงเฉพาะของอุทยานขึ้นเอง
หากคำถามต้องใช้ข้อมูลเฉพาะของอุทยาน ให้บอกตามธรรมชาติว่าไม่สามารถตรวจข้อมูลส่วนนั้นได้ในขณะนี้
`.trim(),
      });
    }

    messages.push(...history);
    messages.push({ role: "user", content: currentMessage });

    try {
      return {
        message: await this.llm.chat(messages, { signal, timeoutMs: 30_000 }),
        retrieval,
      };
    } catch {
      return {
        message: retrieval?.chunks.length
          ? "พบข้อมูลอ้างอิงในฐานความรู้ แต่ไม่สามารถเรียบเรียงคำตอบได้ในขณะนี้ กรุณาลองอีกครั้งครับ"
          : "ขณะนี้ไม่สามารถตรวจข้อมูลอุทยานจากฐานความรู้ได้ กรุณาลองอีกครั้งครับ",
        retrieval,
      };
    }
  }

  async retrieveOnly(
    history: ChatMessage[],
    currentMessage: string,
    signal?: AbortSignal,
  ): Promise<KnowledgeRetrievalResult | undefined> {
    const retrievalQuery =
      buildRetrievalQuery(
        history,
        currentMessage,
      );

    let retrieval:
      KnowledgeRetrievalResult | undefined;

    try {
      retrieval =
        await this.retriever.retrieve(
          retrievalQuery,
          RAG_RESULT_LIMIT,
          signal,
        );
    } catch (error) {
      /*
       * RAG fail ไม่ควรทำ chatbot
       * ทั้งระบบล้ม
       *
       * System prompt จะบังคับ
       * LLM ไม่ให้แต่ง park facts
       */
      console.warn(
        "Knowledge retrieval failed:",
        error,
      );
    }

    return retrieval;
  }
}
