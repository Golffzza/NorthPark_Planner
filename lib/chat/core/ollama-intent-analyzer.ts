import type {
  AssistantIntent,
  IntentResult,
  LlmProvider,
} from "@/lib/chat/shared/contracts";
import type {
  AssistantIntentAnalysisContext,
  AssistantIntentAnalyzer,
} from "./assistant-intent";
import { getAssistantIntentTimeoutMs } from "./assistant-intent";

const VALID_INTENTS = new Set<AssistantIntent>([
  "SYSTEM_FACT",
  "PARK_INFO",
  "PARK_SEARCH",
  "RECOMMEND",
  "COMPARE",
  "GENERAL",
]);

export class OllamaAssistantIntentAnalyzer implements AssistantIntentAnalyzer {
  constructor(private readonly llm: LlmProvider) {}

  isReady(): boolean {
    return this.llm.isPrepared?.() ?? true;
  }

  async analyze(
    message: string,
    signal?: AbortSignal,
    context: AssistantIntentAnalysisContext = { hasParkContext: false },
  ): Promise<IntentResult> {
    const raw = await this.llm.chat([
      {
        role: "system",
        content: [
          "จำแนก intent ของข้อความสำหรับ NorthPark Assistant เท่านั้น",
          "ตอบ JSON เท่านั้น: {\"intent\": string, \"confidence\": number}",
          "intent ที่อนุญาต: SYSTEM_FACT, PARK_INFO, PARK_SEARCH, RECOMMEND, COMPARE, GENERAL",
          "ถ้าผู้ใช้ถามต่อถึงอุทยานเดิมและ hasParkContext=true ให้ใช้ PARK_INFO",
          "ถ้าข้อความกำกวมและไม่มีบริบทอุทยาน ให้ใช้ GENERAL",
          "ห้ามตอบหรือสร้างข้อมูลอุทยาน",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          message,
          conversationContext: context,
        }),
      },
    ], {
      signal,
      timeoutMs: getAssistantIntentTimeoutMs(),
      numPredict: 48,
      temperature: 0,
      format: "json",
    });

    let parsed: { intent?: unknown; confidence?: unknown };
    try {
      parsed = JSON.parse(raw.trim()) as typeof parsed;
    } catch {
      throw new Error("Assistant intent analyzer returned invalid JSON");
    }

    if (
      typeof parsed.intent !== "string" ||
      !VALID_INTENTS.has(parsed.intent as AssistantIntent) ||
      typeof parsed.confidence !== "number" ||
      !Number.isFinite(parsed.confidence) ||
      parsed.confidence < 0 ||
      parsed.confidence > 1
    ) {
      throw new Error("Assistant intent analyzer returned invalid fields");
    }

    return {
      intent: parsed.intent as AssistantIntent,
      confidence: parsed.confidence,
      source: "LLM",
    };
  }
}
