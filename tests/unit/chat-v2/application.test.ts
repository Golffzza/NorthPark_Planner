import { describe, expect, it } from "vitest";

import {
  ASSISTANT_V2_TEMPERATURE,
  prepareAssistantV2Step,
  sanitizeAssistantV2Text,
} from "@/lib/chat-v2/application/chat-v2-application";
import { ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS } from "@/lib/chat-v2/ai/instructions";

describe("Assistant V2 application step preparation", () => {
  it("uses deterministic sampling for reproducible local responses", () => {
    expect(ASSISTANT_V2_TEMPERATURE).toBe(0);
  });

  it("keeps tools available for routing, then removes their schemas for the answer step", () => {
    expect(prepareAssistantV2Step({ stepNumber: 0 })).toBeUndefined();
    expect(prepareAssistantV2Step({ stepNumber: 1 })).toEqual({
      activeTools: [],
      instructions: ASSISTANT_V2_FINAL_ANSWER_INSTRUCTIONS,
    });
  });

  it("removes unrelated scripts from otherwise Thai answers", () => {
    expect(
      sanitizeAssistantV2Text("ควรตรวจสอบ передเดินทาง مرحبا 旅行"),
    ).toBe("ควรตรวจสอบ เดินทาง");
  });

  it("normalizes the qwen Thai spelling slip without changing park data", () => {
    expect(sanitizeAssistantV2Text("อุทยิานแห่งชาติขุนขาน"))
      .toBe("อุทยานแห่งชาติขุนขาน");
  });
});
