export type AssistantV2StreamEvent =
  | { type: "text"; text: string }
  | { type: "done"; text: string }
  | { type: "error"; message: string };

function parseEvent(line: string): AssistantV2StreamEvent {
  const value: unknown = JSON.parse(line);
  if (!value || typeof value !== "object" || !("type" in value)) {
    throw new Error("ข้อมูลตอบกลับจากผู้ช่วยไม่ถูกต้อง");
  }
  if (
    (value.type === "text" || value.type === "done") &&
    "text" in value && typeof value.text === "string"
  ) {
    return { type: value.type, text: value.text };
  }
  if (
    value.type === "error" &&
    "message" in value && typeof value.message === "string"
  ) {
    return { type: "error", message: value.message };
  }
  throw new Error("ข้อมูลตอบกลับจากผู้ช่วยไม่ถูกต้อง");
}

export async function readAssistantV2Stream(
  stream: ReadableStream<Uint8Array>,
  onText: (text: string) => void,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let completed: string | undefined;

  const consumeLine = (line: string) => {
    if (!line.trim()) return;
    const event = parseEvent(line);
    if (event.type === "error") throw new Error(event.message);
    if (event.type === "text") {
      if (completed !== undefined) throw new Error("ข้อมูลตอบกลับจากผู้ช่วยไม่ถูกต้อง");
      text += event.text;
      onText(text);
    } else {
      completed = event.text;
      onText(completed);
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        consumeLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) consumeLine(buffer);
    if (!completed?.trim()) throw new Error("คำตอบขาดตอน กรุณาลองอีกครั้ง");
    return completed;
  } finally {
    reader.releaseLock();
  }
}
