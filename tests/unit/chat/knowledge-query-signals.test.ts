import { describe, expect, it } from "vitest";
import { analyzeKnowledgeQueryLocally } from "@/lib/chat/rag/knowledge-retriever";

describe("local knowledge query analysis", () => {
  it("extracts activity and low effort without another LLM request", () => {
    expect(analyzeKnowledgeQueryLocally("อยากเที่ยวน้ำตกแต่ไม่เดินเยอะ", {
      activityTypes: ["WATERFALL", "TRAIL"], tags: [],
    })).toMatchObject({
      intent: "RECOMMENDATION",
      activityTypes: ["WATERFALL"],
      effort: "LOW",
      requiresLiveVerification: false,
    });
  });

  it("marks live status questions conservatively", () => {
    expect(analyzeKnowledgeQueryLocally("วันนี้เปิดไหม", { activityTypes: [], tags: [] }))
      .toMatchObject({ intent: "LIVE_STATUS", requiresLiveVerification: true });
  });

  it("does not turn a negated activity into a positive retrieval signal", () => {
    expect(analyzeKnowledgeQueryLocally("ไม่เอาน้ำตก ขอเดินป่า", {
      activityTypes: ["WATERFALL", "TRAIL"], tags: [],
    }).activityTypes).toEqual(["TRAIL"]);
  });

  it.each([
    ["เปิดกี่โมง", "LIVE_STATUS"],
    ["เวลาเปิดปิดเป็นยังไง", "LIVE_STATUS"],
    ["ต้องซื้อตั๋วไหม", "LIVE_STATUS"],
    ["บ้านพักยังว่างหรือเปล่า", "LIVE_STATUS"],
    ["ตอนนี้ทางขึ้นใช้ได้หรือเปล่า", "LIVE_STATUS"],
    ["เปิดวันไหนบ้าง", "LIVE_STATUS"],
  ] as const)("treats %s as live data", (query, intent) => {
    expect(analyzeKnowledgeQueryLocally(query, { activityTypes: [], tags: [] }))
      .toMatchObject({ intent, requiresLiveVerification: true });
  });

  it("extracts activity types that exist in the knowledge base vocabulary", () => {
    expect(analyzeKnowledgeQueryLocally(
      "อยากเที่ยวถ้ำและล่องแก่ง",
      { activityTypes: ["CAVE", "RAFTING", "WATERFALL"], tags: [] },
    ).activityTypes).toEqual(["CAVE", "RAFTING"]);
  });
});
