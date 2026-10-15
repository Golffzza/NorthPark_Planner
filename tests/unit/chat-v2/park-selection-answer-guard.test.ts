import { describe, expect, it } from "vitest";
import { finalizeParkSelectionAnswer } from "@/lib/chat-v2/application/park-selection-answer-guard";
import type { AssistantV2ConversationState } from "@/lib/chat-v2/state/conversation-state";

const park = { id: "doi-khun-tan", slug: "doi-khun-tan", name: "อุทยานแห่งชาติดอยขุนตาล" };
function state(selectedPark?: typeof park): AssistantV2ConversationState {
  return { id: "test", ownerId: "test", userConstraints: {}, currentResults: [park],
    selectedPark, lastComparedParks: [], recentMessages: [],
    createdAt: 0, updatedAt: 0, expiresAt: 1000 };
}

describe("park selection answer guard", () => {
  it("rejects fabricated confirmations when selection failed", () => {
    const answer = finalizeParkSelectionAnswer("เลือกดอยขุนตาลเรียบร้อยแล้ว", [
      { toolName: "selectPark", output: { selected: false, reason: "AMBIGUOUS" } },
    ], state());
    expect(answer).toContain("ยังไม่ได้เปลี่ยนอุทยาน");
    expect(answer).not.toContain("เรียบร้อย");
  });

  it("confirms only a selection matching current state", () => {
    const toolResults = [{ toolName: "selectPark", output: { selected: true, park } }];
    expect(finalizeParkSelectionAnswer("จัดให้แล้ว", toolResults, state(park)))
      .toBe("เลือกอุทยานแห่งชาติดอยขุนตาลเรียบร้อยครับ");
    expect(finalizeParkSelectionAnswer("เลือกแล้ว", toolResults, state()))
      .toContain("ยังยืนยัน");
  });

  it("does not change answers when the user did not request selection", () => {
    expect(finalizeParkSelectionAnswer("พบร้านอาหาร", [
      { toolName: "findNearbyPlaces", output: { status: "OK" } },
    ], state())).toBe("พบร้านอาหาร");
  });
});
