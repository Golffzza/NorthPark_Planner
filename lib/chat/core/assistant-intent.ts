import type { AssistantIntent, IntentResult } from "@/lib/chat/shared/contracts";
import { answerStructuredFact, findMentionedParks } from "./park-catalog";
import { extractContextPatch } from "./assistant-context";
import { isGreeting, isParkInformationFollowUp, normalizeQuery } from "./query-signals";

export type AssistantIntentAnalysisContext = {
  hasParkContext: boolean;
};

export interface AssistantIntentAnalyzer {
  analyze(
    message: string,
    signal?: AbortSignal,
    context?: AssistantIntentAnalysisContext,
  ): Promise<IntentResult>;
  isReady?(): boolean;
}
export const ASSISTANT_INTENTS: AssistantIntent[] = ["SYSTEM_FACT", "PARK_INFO", "PARK_SEARCH", "RECOMMEND", "COMPARE", "GENERAL"];

const configuredFallbackConfidence = Number(
  process.env.ASSISTANT_INTENT_FALLBACK_MIN_CONFIDENCE ?? 0.65,
);
const LLM_FALLBACK_MIN_CONFIDENCE = Number.isFinite(configuredFallbackConfidence)
  ? Math.min(1, Math.max(0, configuredFallbackConfidence))
  : 0.65;

export function getAssistantIntentTimeoutMs(): number {
  const configured = Number(process.env.ASSISTANT_INTENT_TIMEOUT_MS ?? 2_500);
  return Number.isFinite(configured) && configured > 0 ? configured : 2_500;
}

export function detectAssistantIntent(message: string): IntentResult | undefined {
  const query = normalizeQuery(message);
  const rule = (intent: AssistantIntent): IntentResult => ({intent, confidence: 0.95, source: "RULE"});
  const mentionedParks = findMentionedParks(query);
  if (isGreeting(query)) return rule("GENERAL");
  if (/^(?:ช่วยคิด(?:หน่อย)?|ช่วยหน่อย|ไม่รู้จะไปไหน|อะไรก็ได้)$/.test(query)) return rule("GENERAL");
  if (/เปรียบเทียบ|ต่างกัน|เทียบ|(?:น้อย|มาก|หนัก|ง่าย|เบา)กว่า|อันไหน.*กว่า/.test(query)
    || (mentionedParks.length >= 2 && /อันไหน|ที่ไหนดี|เลือก.*ไหนดี|ไหนเหมาะ/.test(query))) return rule("COMPARE");
  if (mentionedParks.length || /(?:ที่|อัน|ตัว)(?:ที่)?(?:แรก|สอง|สาม)|ที่นี่|เมื่อกี้|ก่อนหน้า|อันนั้น/.test(query)) return rule("PARK_INFO");
  if (/แนะนำ|อยากเที่ยว|น่าเที่ยว|เหมาะกับ/.test(query)) return rule("RECOMMEND");
  if (answerStructuredFact(message)) return rule("SYSTEM_FACT");
  if (/^หา|ค้นหา|มีที่ไหน/.test(query)) return rule("PARK_SEARCH");
  if (Object.keys(extractContextPatch(message)).length || /ขอที่|เดินน้อย|ไปกับ|มีเวลา|ไม่เดิน|ไม่เอา/.test(query)) return rule("RECOMMEND");
  return undefined;
}

export async function resolveAssistantIntent(
  message: string,
  analyzer: AssistantIntentAnalyzer,
  signal?: AbortSignal,
  hasParkContext = false,
): Promise<IntentResult> {
  if (hasParkContext && isParkInformationFollowUp(message)) {
    return { intent: "PARK_INFO", confidence: 0.95, source: "RULE" };
  }
  const rule = detectAssistantIntent(message);
  if (rule) return rule;

  const fallback: IntentResult = {
    intent: "GENERAL",
    confidence: 0,
    source: "FALLBACK",
  };
  if (analyzer.isReady?.() === false) return fallback;

  const deadlineController = new AbortController();
  const analysisSignal = signal
    ? AbortSignal.any([signal, deadlineController.signal])
    : deadlineController.signal;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    const analyzed = await Promise.race([
      analyzer.analyze(message, analysisSignal, { hasParkContext }),
      new Promise<never>((_resolve, reject) => {
        deadline = setTimeout(() => {
          deadlineController.abort();
          reject(new Error("Assistant intent fallback timed out"));
        }, getAssistantIntentTimeoutMs());
      }),
    ]);
    if (analyzed.confidence < LLM_FALLBACK_MIN_CONFIDENCE) return fallback;
    if (analyzed.intent === "PARK_INFO" && !hasParkContext) return fallback;
    return analyzed;
  } catch {
    return fallback;
  } finally {
    if (deadline) clearTimeout(deadline);
  }
}
