import type {
  ChatResponse,
  LlmProvider,
} from "@/lib/chat/shared/contracts";

import type {
  ConversationStore,
} from "@/lib/chat/orchestration/conversation-state";

import {
  RagChatResponder,
} from "@/lib/chat/rag/rag-chat-responder";
import { AssistantCoreService } from "@/lib/chat/core/assistant-core-service";
import { OllamaAssistantIntentAnalyzer } from "@/lib/chat/core/ollama-intent-analyzer";

export class ChatOrchestrator {
  private readonly ragChat:
    RagChatResponder;
  private readonly assistantCore: AssistantCoreService;

  constructor(
    private readonly llm:
      LlmProvider,

    private readonly conversations:
      ConversationStore,
  ) {
    this.ragChat =
      new RagChatResponder(
        this.llm,
      );
    this.assistantCore = new AssistantCoreService(
      new OllamaAssistantIntentAnalyzer(this.llm),
      this.ragChat,
    );
  }

  async reply(input: {
    message: string;
    conversationId?: string;
    ownerId: string;
    signal?: AbortSignal;
  }): Promise<ChatResponse> {
    /*
     * 1. สร้างหรือ resolve
     * conversation เดิม
     */
    const conversationId =
      this.conversations.createOrResolve(
        input.conversationId,
        input.ownerId,
      );

    /*
     * 2. ดึง history ก่อนหน้า
     *
     * history นี้จะถูกใช้ทั้ง:
     * - Retrieval context
     * - LLM conversation context
     */
    const history =
      this.conversations.getMessages(
        conversationId,
        input.ownerId,
      );
    const context = this.conversations.getContext(
      conversationId,
      input.ownerId,
    );

    /*
     * 3. RAG response
     *
     * ภายใน RagChatResponder:
     *
     * history + current message
     *        ↓
     * KnowledgeRetriever
     *        ↓
     * NorthPark knowledge context
     *        ↓
     * Llama
     */
    const response =
      await this.assistantCore.respond(
        history,
        context,
        input.message,
        input.signal,
      );

    /*
     * 4. เก็บ user + assistant
     * ลง conversation state
     *
     * เก็บหลังตอบสำเร็จเท่านั้น
     */
    this.conversations.appendTurn(
      conversationId,
      input.ownerId,
      input.message,
      response.message,
    );
    this.conversations.setContext(
      conversationId,
      input.ownerId,
      response.context,
    );

    /*
     * 5. ส่งกลับ API
     */
    return {
      conversationId,
      message: response.message,
      ...(response.contextSummary
        ? { contextSummary: response.contextSummary }
        : {}),
      ...(response.recommendations
        ? { recommendations: response.recommendations }
        : {}),
      ...(response.comparison ? { comparison: response.comparison } : {}),
      ...(response.sources ? { sources: response.sources } : {}),
    };
  }
}
