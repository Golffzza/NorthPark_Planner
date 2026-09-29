import { describe, expect, it } from "vitest";

import {
  appendAssistantMessage,
  appendUserMessage,
} from "@/components/assistant/chat-messages";

describe("chat message helpers", () => {
  it("appends the assistant response with the assistant role", () => {
    const messages = appendAssistantMessage(
      [{ role: "user", content: "สวัสดี" }],
      "สวัสดีครับ",
    );

    expect(messages).toEqual([
      { role: "user", content: "สวัสดี" },
      { role: "assistant", content: "สวัสดีครับ" },
    ]);
  });

  it("retains only the latest 40 messages", () => {
    const existing = Array.from({ length: 40 }, (_, index) => ({
      role: "user" as const,
      content: String(index),
    }));

    const messages = appendUserMessage(existing, "ล่าสุด");

    expect(messages).toHaveLength(40);
    expect(messages.at(-1)).toEqual({ role: "user", content: "ล่าสุด" });
    expect(messages[0].content).toBe("1");
  });

  it("keeps sources as structured links instead of appending raw URLs to content", () => {
    const sources = [{ id: "park:S01", title: "กรมอุทยานแห่งชาติ", url: "https://example.com/source" }];
    const messages = appendAssistantMessage([], "คำตอบ", sources);
    expect(messages[0]).toEqual({ role: "assistant", content: "คำตอบ", sources });
    expect(messages[0].content).not.toContain("https://");
  });
});
