export type ChatSource = {
  id: string;
  title: string;
  url?: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
};

const MAX_VISIBLE_MESSAGES = 40;

export function formatAssistantMessageContent(content: string): string {
  return content
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/^#{1,6}\s+/gm, "");
}

function appendMessage(
  messages: ChatMessage[],
  message: ChatMessage,
): ChatMessage[] {
  return [...messages, message].slice(-MAX_VISIBLE_MESSAGES);
}

export function appendUserMessage(
  messages: ChatMessage[],
  content: string,
): ChatMessage[] {
  return appendMessage(messages, { role: "user", content });
}

export function appendAssistantMessage(
  messages: ChatMessage[],
  content: string,
  sources?: ChatSource[],
): ChatMessage[] {
  return appendMessage(messages, {
    role: "assistant",
    content,
    ...(sources?.length ? { sources } : {}),
  });
}
