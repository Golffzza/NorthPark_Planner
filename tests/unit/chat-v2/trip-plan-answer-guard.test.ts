import { describe, expect, it } from "vitest";
import { finalizeTripPlanAnswer } from "@/lib/chat-v2/application/trip-plan-answer-guard";

describe("trip planning answer guard", () => {
  it("does not claim a new draft when the tool says a draft already exists", () => {
    const answer = finalizeTripPlanAnswer("จัดแผนใหม่ให้เรียบร้อยแล้ว", [
      { toolName: "planTrip", output: { status: "DRAFT_EXISTS" } },
    ]);
    expect(answer).toContain("ยังไม่ได้สร้างแผนใหม่");
  });

  it("asks the confirmed clarification question instead of claiming a new draft", () => {
    expect(finalizeTripPlanAnswer("จัดให้แล้ว", [
      { toolName: "planTrip", output: { status: "NEEDS_CLARIFICATION", message: "อุทยาน A หรือ B ครับ?" } },
    ])).toBe("อุทยาน A หรือ B ครับ?");
  });

  it("does not modify successful answers or unrelated turns", () => {
    expect(finalizeTripPlanAnswer("สร้างแผนสำเร็จ", [
      { toolName: "planTrip", output: { status: "OK" } },
    ])).toBe("สร้างแผนสำเร็จ");
    expect(finalizeTripPlanAnswer("แนะนำอุทยาน", [])).toBe("แนะนำอุทยาน");
  });
});
