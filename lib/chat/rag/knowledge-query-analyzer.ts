// ./lib/chat/rag/knowledge-query-analyzer.ts

export type QueryIntent =
  | "RECOMMENDATION"
  | "GENERAL_INFO"
  | "LIVE_STATUS";

export type QueryEffort =
  | "LOW"
  | "HIGH"
  | "ANY";

export type KnowledgeQueryAnalysis = {
  intent: QueryIntent;

  activityTypes: string[];
  preferredTags: string[];

  effort: QueryEffort;

  requiresLiveVerification: boolean;
};

export type QueryAnalyzerVocabulary = {
  activityTypes: string[];
  tags: string[];
};

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

type RawAnalyzerResponse = {
  intent?: unknown;
  activityTypes?: unknown;
  preferredTags?: unknown;
  effort?: unknown;
};

function uniqueStrings(
  values: string[],
): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

function normalizeVocabularyValue(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase();
}

function filterVocabulary(
  values: unknown,
  allowedValues: string[],
  maxItems: number,
): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const lookup =
    new Map<string, string>();

  for (const allowed of allowedValues) {
    lookup.set(
      normalizeVocabularyValue(
        allowed,
      ),
      allowed,
    );
  }

  const result: string[] = [];

  for (const value of values) {
    if (
      typeof value !== "string"
    ) {
      continue;
    }

    const resolved =
      lookup.get(
        normalizeVocabularyValue(
          value,
        ),
      );

    if (resolved) {
      result.push(resolved);
    }
  }

  return uniqueStrings(result).slice(
    0,
    maxItems,
  );
}

function parseIntent(
  value: unknown,
): QueryIntent {
  if (
    value === "RECOMMENDATION" ||
    value === "GENERAL_INFO" ||
    value === "LIVE_STATUS"
  ) {
    return value;
  }

  return "GENERAL_INFO";
}

function parseEffort(
  value: unknown,
): QueryEffort {
  if (
    value === "LOW" ||
    value === "HIGH" ||
    value === "ANY"
  ) {
    return value;
  }

  return "ANY";
}

function shouldRetry(
  error: unknown,
): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes(
      "invalid JSON",
    ) ||
    error.message.includes(
      "empty response",
    )
  );
}

export class KnowledgeQueryAnalyzer {
  private readonly baseUrl: string;
  private readonly model: string;

  private readonly timeoutMs: number;
  private readonly numPredict: number;
  private readonly numCtx: number;

  constructor() {
    this.baseUrl = (
      process.env.OLLAMA_BASE_URL ??
      "http://127.0.0.1:11434"
    ).replace(/\/$/, "");

    this.model =
      process.env
        .RAG_QUERY_ANALYZER_MODEL ??
      process.env.OLLAMA_MODEL ??
      "llama3.2:3b";

    this.timeoutMs = Number(
      process.env
        .RAG_QUERY_ANALYZER_TIMEOUT_MS ??
        6_000,
    );

    this.numPredict = Number(
      process.env
        .RAG_QUERY_ANALYZER_NUM_PREDICT ??
        128,
    );

    this.numCtx = Number(
      process.env
        .RAG_QUERY_ANALYZER_NUM_CTX ??
        2048,
    );
  }

  async analyze(
    query: string,
    vocabulary: QueryAnalyzerVocabulary,
  ): Promise<KnowledgeQueryAnalysis> {
    let lastError: unknown;

    for (
      let attempt = 1;
      attempt <= 2;
      attempt += 1
    ) {
      try {
        return await this.analyzeOnce(
          query,
          vocabulary,
        );
      } catch (error) {
        lastError = error;

        if (
          attempt >= 2 ||
          !shouldRetry(error)
        ) {
          throw error;
        }

        console.warn(
          `RAG query analyzer invalid output; retrying (${attempt}/2).`,
        );
      }
    }

    throw lastError;
  }

  private async analyzeOnce(
    query: string,
    vocabulary: QueryAnalyzerVocabulary,
  ): Promise<KnowledgeQueryAnalysis> {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        this.timeoutMs,
      );

    try {
      const systemPrompt = `
คุณคือ Query Analyzer ของระบบ NorthPark

หน้าที่:
แปลงข้อความของผู้ใช้เป็น structured constraints สำหรับ retrieval

คุณไม่ได้ตอบคำถาม
คุณไม่ได้เลือกสถานที่
คุณไม่ได้จัดอันดับสถานที่
คุณไม่ได้สร้างข้อเท็จจริงใหม่

วิเคราะห์เฉพาะสิ่งที่ผู้ใช้ต้องการจริงจากข้อความ
ห้ามเลือกค่าเพียงเพราะค่านั้นปรากฏอยู่ใน vocabulary

INTENT

RECOMMENDATION
ใช้เมื่อผู้ใช้ต้องการค้นหา เลือก เปรียบเทียบ หรือขอคำแนะนำสถานที่/กิจกรรมตามความชอบหรือข้อจำกัด

GENERAL_INFO
ใช้เมื่อผู้ใช้ถามข้อมูลทั่วไปที่ไม่จำเป็นต้องทราบสถานะปัจจุบัน

LIVE_STATUS
ใช้เมื่อคำตอบจำเป็นต้องรู้ "สถานะจริง ณ ช่วงเวลาปัจจุบันหรือช่วงเวลาที่ผู้ใช้ถาม"
เช่น ต้องตรวจว่าพื้นที่ใช้งานได้หรือไม่ บริการพร้อมหรือไม่ หรือข้อเท็จจริงที่อาจเปลี่ยนหลังจากฐานความรู้ถูกสร้าง

LIVE_STATUS มีลำดับความสำคัญสูงกว่า RECOMMENDATION และ GENERAL_INFO
ถ้าคำถามมีลักษณะเป็นการแนะนำ แต่คำตอบจำเป็นต้องตรวจสถานะปัจจุบันจริง ให้เลือก LIVE_STATUS

อย่าเลือก LIVE_STATUS เพียงเพราะผู้ใช้สนใจสิ่งที่เปลี่ยนตามฤดูกาลหรือสภาพธรรมชาติ
ถ้าสามารถตอบเป็น "สถานที่ที่โดยทั่วไปเหมาะกับความต้องการนี้" โดยไม่ต้องรู้สถานการณ์วันนี้ ให้ใช้ RECOMMENDATION

ACTIVITY TYPES

เลือกเฉพาะค่าจาก activityTypes vocabulary
เลือกเฉพาะประเภทสถานที่หรือกิจกรรมที่ผู้ใช้ต้องการจริง
เลือกได้หลายค่าเมื่อความต้องการมีหลายองค์ประกอบ
หากไม่ได้ขอประเภทใดชัดเจน ให้คืน []

PREFERRED TAGS

เลือกเฉพาะค่าจาก tags vocabulary
เลือกเฉพาะ preference หลักที่ผู้ใช้สื่อจริง
ห้ามคัดลอก tags ของ candidate หรือ park
ห้ามพยายามเลือก tag ให้ได้จำนวนมาก
เลือกเฉพาะค่าที่ช่วยแยกผลลัพธ์จริง
หากไม่มี ให้คืน []

EFFORT

LOW
ผู้ใช้ต้องการลดการเดิน ลดการใช้แรง ต้องการเที่ยวสบาย
หรือหลีกเลี่ยงกิจกรรมหนัก

HIGH
ผู้ใช้ตั้งใจทำกิจกรรมที่ใช้แรงจริงจัง เช่น เดินระยะไกล
ขึ้นเขา ไต่ระดับ หรือยอมรับกิจกรรมที่ท้าทาย

ANY
ผู้ใช้ไม่ได้กำหนดระดับการใช้แรงอย่างชัดเจน
รวมถึงกรณีที่ต้องการกิจกรรมทั่วไปในระดับกลาง

อย่าใช้ระดับกลางเป็น preference
ถ้าไม่ชัดว่า LOW หรือ HIGH ให้ใช้ ANY

สำหรับคำถามสถานะของสถานที่ ให้ใช้ ANY

กฎสำคัญ:
- เข้าใจข้อความปฏิเสธ
- อย่าเดาความต้องการที่ไม่ได้อยู่ในข้อความ user
- อย่า infer preference จากคุณสมบัติของ candidate
- ตอบเฉพาะ JSON ตาม schema
`.trim();

      const userPrompt =
        JSON.stringify(
          {
            query,

            availableVocabulary: {
              activityTypes:
                vocabulary.activityTypes,

              tags:
                vocabulary.tags,
            },
          },
          null,
          2,
        );

      const response =
        await fetch(
          `${this.baseUrl}/api/chat`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            signal:
              controller.signal,

            cache: "no-store",

            body: JSON.stringify({
              model:
                this.model,

              stream: false,

              keep_alive:
                "10m",

              messages: [
                {
                  role: "system",
                  content:
                    systemPrompt,
                },

                {
                  role: "user",
                  content:
                    userPrompt,
                },
              ],

              format: {
                type: "object",

                properties: {
                  intent: {
                    type: "string",

                    enum: [
                      "RECOMMENDATION",
                      "GENERAL_INFO",
                      "LIVE_STATUS",
                    ],
                  },

                  activityTypes: {
                    type: "array",

                    maxItems: 3,

                    items: {
                      type: "string",
                    },
                  },

                  preferredTags: {
                    type: "array",

                    maxItems: 3,

                    items: {
                      type: "string",
                    },
                  },

                  effort: {
                    type: "string",

                    enum: [
                      "LOW",
                      "MODERATE",
                      "HIGH",
                      "ANY",
                    ],
                  },
                },

                required: [
                  "intent",
                  "activityTypes",
                  "preferredTags",
                  "effort",
                ],

                additionalProperties:
                  false,
              },

              options: {
                temperature: 0,

                num_predict:
                  this.numPredict,

                num_ctx:
                  this.numCtx,
              },
            }),
          },
        );

      if (!response.ok) {
        throw new Error(
          `Query analyzer failed (${response.status}): ${await response.text()}`,
        );
      }

      const data =
        (await response.json()) as OllamaChatResponse;

      const content =
        data.message
          ?.content
          ?.trim();

      if (!content) {
        throw new Error(
          "Query analyzer returned empty response",
        );
      }

      let parsed:
        RawAnalyzerResponse;

      try {
        parsed =
          JSON.parse(
            content,
          ) as RawAnalyzerResponse;
      } catch {
        throw new Error(
          "Query analyzer returned invalid JSON",
        );
      }

      const intent =
        parseIntent(
          parsed.intent,
        );

      /*
       * LIVE status ไม่ให้ LLM
       * ส่ง activity/tag/effort มารบกวน
       * focused lookup
       */
      if (
        intent === "LIVE_STATUS"
      ) {
        return {
          intent,

          activityTypes: [],

          preferredTags: [],

          effort: "ANY",

          requiresLiveVerification:
            true,
        };
      }

      return {
        intent,

        activityTypes:
          filterVocabulary(
            parsed.activityTypes,
            vocabulary.activityTypes,
            3,
          ),

        preferredTags:
          filterVocabulary(
            parsed.preferredTags,
            vocabulary.tags,
            3,
          ),

        effort:
          parseEffort(
            parsed.effort,
          ),

        /*
         * Source of truth คือ intent
         * ไม่ถาม boolean ซ้ำจาก LLM
         */
        requiresLiveVerification:
          false,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.name ===
          "AbortError"
      ) {
        throw new Error(
          `Query analyzer timed out after ${this.timeoutMs}ms`,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const knowledgeQueryAnalyzer =
  new KnowledgeQueryAnalyzer();
