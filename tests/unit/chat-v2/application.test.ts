import { describe, expect, it } from "vitest";

import {
  ASSISTANT_V2_TEMPERATURE,
  buildAssistantV2StateSummary,
  prepareAssistantV2Step,
  sanitizeAssistantV2Text,
} from "@/lib/chat-v2/application/chat-v2-application";
import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";

describe("Assistant V2 application step preparation", () => {
  it("uses deterministic sampling for reproducible local responses", () => {
    expect(ASSISTANT_V2_TEMPERATURE).toBe(0);
  });

  it("keeps tools available for dependent lookups before the final answer step", () => {
    expect(prepareAssistantV2Step({ stepNumber: 0 })).toBeUndefined();
    expect(prepareAssistantV2Step({ stepNumber: 1 })).toBeUndefined();
    expect(prepareAssistantV2Step({ stepNumber: 2 })).toMatchObject({ activeTools: [], toolChoice: "none" });
    expect(prepareAssistantV2Step({ stepNumber: 3 })).toMatchObject({ activeTools: [], toolChoice: "none" });
    expect(prepareAssistantV2Step({ stepNumber: 2 })?.instructions)
      .toContain("เมื่อมีประวัติการสนทนาแล้ว");
  });

  it("routes an explicit park recommendation to the evidence-backed recommendation tool", () => {
    expect(prepareAssistantV2Step(
      { stepNumber: 0 },
      "ช่วยแนะนำอุทยานแห่งชาติในเชียงราย 2 แห่ง",
    )).toMatchObject({
      toolChoice: { type: "tool", toolName: "recommendParks" },
    });
    expect(prepareAssistantV2Step(
      { stepNumber: 0 },
      "แนะนำที่พักใกล้อุทยานแห่งชาติขุนแจ",
    )).toBeUndefined();
    expect(prepareAssistantV2Step(
      { stepNumber: 0 },
      "แนะนำกิจกรรมในอุทยานแห่งชาติขุนแจ",
    )).toBeUndefined();
    expect(prepareAssistantV2Step(
      { stepNumber: 0 },
      "แนะนำอุทยานแห่งชาติขุนแจว่ามีอะไรน่าสนใจ",
    )).toBeUndefined();
    expect(prepareAssistantV2Step(
      { stepNumber: 0 },
      "อุทยานแห่งชาติขุนแจอยู่จังหวัดอะไร",
    )).toBeUndefined();
  });

  it("includes the assistant's last answer in the next turn summary", () => {
    const state: AssistantV2ConversationState = {
      id: "conversation-1",
      ownerId: "user-1",
      userConstraints: {},
      currentResults: [],
      lastComparedParks: [],
      recentMessages: [
        { role: "user", content: "แนะนำเชียงรายหน่อย" },
        { role: "assistant", content: "ผมแนะนำขุนแจและดอยหลวงครับ" },
      ],
      createdAt: 0,
      updatedAt: 0,
      expiresAt: 1000,
    };

    expect(buildAssistantV2StateSummary(state)).toContain(
      "assistant: ผมแนะนำขุนแจและดอยหลวงครับ",
    );
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
