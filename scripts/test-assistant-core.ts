import { AssistantCoreService } from "../lib/chat/core/assistant-core-service";
import { OllamaAssistantIntentAnalyzer } from "../lib/chat/core/ollama-intent-analyzer";
import { OllamaProvider } from "../lib/chat/llm/ollama-provider";
import { RagChatResponder } from "../lib/chat/rag/rag-chat-responder";
import type { AssistantContext, ChatMessage } from "../lib/chat/shared/contracts";

const llm = new OllamaProvider();
const core = new AssistantCoreService(
  new OllamaAssistantIntentAnalyzer(llm),
  new RagChatResponder(llm),
);

let context: AssistantContext = {};
const history: ChatMessage[] = [];

async function turn(label: string, message: string) {
  const result = await core.respond(history, context, message);
  context = result.context;
  history.push(
    { role: "user", content: message },
    { role: "assistant", content: result.message },
  );
  console.log(
    JSON.stringify(
      {
        label,
        message,
        answer: result.message,
        constraints: context.userConstraints,
        recommendationSlugs: result.recommendations?.map((item) => item.park.slug),
        comparisonSlugs: result.comparison?.parks.map((item) => item.park.slug),
        sourceIds: result.sources?.map((source) => source.id),
      },
      null,
      2,
    ),
  );
}

async function main() {
  await turn("fact", "ตอนนี้ในระบบมีอุทยานกี่แห่ง");
  await turn("recommend-province", "อยากเที่ยวเชียงใหม่");
  await turn("recommend-effort", "เอาที่เดินไม่เยอะ");
  await turn("recommend-family", "ไปกับพ่อแม่");
  await turn("compare-reference", "สองที่แรกต่างกันยังไง");
  await turn("follow-up-reference", "แล้วอันที่สองมีกิจกรรมอะไรบ้าง");
  await turn("override", "เปลี่ยนเป็นเชียงราย");

  const isolatedCore = new AssistantCoreService(
    { analyze: async () => { throw new Error("simulated timeout"); } },
    new RagChatResponder(llm),
  );
  const unresolved = await isolatedCore.respond([], {}, "เอาอันนั้น");
  console.log(JSON.stringify({ label: "unresolved", answer: unresolved.message }, null, 2));

  const timeoutCore = new AssistantCoreService(
    { analyze: async () => { throw new Error("simulated timeout"); } },
    {
      respondDetailed: async () => ({ message: "ตอบผ่าน safe fallback" }),
    } as unknown as RagChatResponder,
  );
  const timeoutFallback = await timeoutCore.respond([], {}, "ช่วยคิดหน่อย");
  console.log(
    JSON.stringify(
      { label: "intent-timeout", answer: timeoutFallback.message },
      null,
      2,
    ),
  );
}

void main();
