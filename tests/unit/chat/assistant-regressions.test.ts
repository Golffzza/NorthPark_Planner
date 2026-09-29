import { describe, expect, it } from "vitest";
import { detectAssistantIntent } from "@/lib/chat/core/assistant-intent";
import { extractContextPatch, mergeAssistantContext } from "@/lib/chat/core/assistant-context";
import { answerStructuredFact, findMentionedParks } from "@/lib/chat/core/park-catalog";
import { resolveParkReferences } from "@/lib/chat/core/reference-resolver";

describe("reported conversation regressions", () => {
  it.each([
    ["ดอยอินทนนท์กางเต็นท์ได้ไหม", "PARK_INFO"],
    ["แนะนำอุทยานในจังหวัดเชียงใหม่", "RECOMMEND"],
    ["มีอุทยานอะไรในเชียงใหม่", "SYSTEM_FACT"],
    ["มีทั้งหมดกี่ที่", "SYSTEM_FACT"],
    ["เอาที่เดินน้อยกว่า", "COMPARE"],
  ])("routes %s correctly", (message, expected) => {
    expect(detectAssistantIntent(message)?.intent).toBe(expected);
  });
  it("recognizes common short names in mention order", () => {
    expect(findMentionedParks("แม่วางกับดอยสุเทพและดอยอินทนนท์").map(p => p.slug))
      .toEqual(["mae-wang", "doi-suthep-pui", "doi-inthanon"]);
  });
  it("recognizes common shortened mountain park names", () => {
    expect(findMentionedParks("สุเทพกับอินทนนท์").map(p => p.slug))
      .toEqual(["doi-suthep-pui", "doi-inthanon"]);
  });
  it("never answers a missing province with the global total", () => {
    expect(answerStructuredFact("ภูเก็ตมีอุทยานกี่แห่ง")?.message).not.toContain("44");
    expect(answerStructuredFact("ภูเก็ตมีอุทยานกี่แห่ง")?.message).toContain("ไม่มีข้อมูล");
  });
  it("understands negative effort and replaces a negated province", () => {
    expect(extractContextPatch("ไม่เดินหนัก").fatigue).toBe("LOW");
    expect(extractContextPatch("ไม่ไปเชียงใหม่ ขอเชียงราย").province).toBe("เชียงราย");
  });
  it("removes cancelled activities and companions", () => {
    const context = mergeAssistantContext({ userConstraints: {
      activities: ["WATERFALL"], companions: ["FAMILY", "ELDERLY"],
    } }, extractContextPatch("ไม่เอาน้ำตก เปลี่ยนเป็นกางเต็นท์ ไปคนเดียว"));
    expect(context.userConstraints?.activities).toEqual(["CAMPSITE"]);
    expect(context.userConstraints?.companions).toEqual([]);
  });
  it("scopes activity negation to its clause", () => {
    const patch = extractContextPatch("ไม่เอาน้ำตก แต่ขอกางเต็นท์");
    expect(patch.excludedActivities).toEqual(["WATERFALL"]);
    expect(patch.activities).toEqual(["CAMPSITE"]);
  });
  it("does not guess ambiguous references among multiple results", () => {
    const parks = ["a", "b"].map(slug => ({id: slug, slug, name: slug}));
    expect(resolveParkReferences("เอาอันนั้น", {lastRecommendedParks: parks}).unresolved).toBe(true);
  });
});
