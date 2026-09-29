import { describe, expect, it } from "vitest";

import { NORTHPARK_SYSTEM_PROMPT } from "@/lib/chat/llm/prompts";

describe("NorthPark assistant system prompt", () => {
  it("forbids embellishing grounded facts with unsupported attributes", () => {
    expect(NORTHPARK_SYSTEM_PROMPT).toContain(
      "ห้ามเติมคุณลักษณะ เช่น ขนาด ความสูง ความสวย หรือความนิยม",
    );
  });
});
