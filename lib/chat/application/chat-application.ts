import { OllamaProvider } from "@/lib/chat/llm/ollama-provider";
import { ChatOrchestrator } from "@/lib/chat/orchestration/chat-orchestrator";
import { conversationStateStore } from "@/lib/chat/orchestration/conversation-state";
import type {
  ChatRequest,
  ChatResponse,
} from "@/lib/chat/shared/contracts";
import { getChatMessageMaxLength } from "@/lib/chat/shared/limits";

const MAX_MESSAGE_LENGTH = getChatMessageMaxLength();

export class ChatApplication {
  constructor(
    private readonly orchestrator: ChatOrchestrator,
  ) {}

  async send(input: ChatRequest, ownerId: string, signal?: AbortSignal): Promise<ChatResponse> {
    const message = input.message?.trim();

    if (!message) {
      throw new Error("MESSAGE_REQUIRED");
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new Error("MESSAGE_TOO_LONG");
    }

    return this.orchestrator.reply({
      message,
      conversationId: input.conversationId,
      ownerId,
      signal,
    });
  }
}

const ollama = new OllamaProvider();
void ollama.prepare();

const orchestrator = new ChatOrchestrator(
  ollama,
  conversationStateStore,
);

export const chatApplication =
  new ChatApplication(orchestrator);
