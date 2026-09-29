export const DEFAULT_CHAT_MESSAGE_MAX_LENGTH = 1000;

export function getChatMessageMaxLength(): number {
  const configured = Number(process.env.CHATBOT_MAX_MESSAGE_LENGTH);

  if (Number.isSafeInteger(configured) && configured > 0) {
    return configured;
  }

  return DEFAULT_CHAT_MESSAGE_MAX_LENGTH;
}
