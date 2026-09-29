import { createConversationAwareAssistantV2Tools } from "@/lib/chat-v2/tools/conversation-tools";
import type { AssistantV2TurnContext } from "@/lib/chat-v2/tools/turn-context";

export function createAssistantV2Tools(context: AssistantV2TurnContext) {
  return createConversationAwareAssistantV2Tools(context);
}
