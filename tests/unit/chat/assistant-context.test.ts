import { describe, expect, it } from "vitest";

import {
  extractContextPatch,
  mergeAssistantContext,
} from "@/lib/chat/core/assistant-context";
import { resolveParkReferences } from "@/lib/chat/core/reference-resolver";
import type { AssistantContext, ParkReference } from "@/lib/chat/shared/contracts";

const parks: ParkReference[] = [
  { id: "p1", slug: "one", name: "อุทยานหนึ่ง" },
  { id: "p2", slug: "two", name: "อุทยานสอง" },
  { id: "p3", slug: "three", name: "อุทยานสาม" },
];

describe("assistant structured context", () => {
  it("merges constraints across turns and preserves unrelated values", () => {
    let context: AssistantContext = {};
    context = mergeAssistantContext(context, extractContextPatch("อยากเที่ยวเชียงใหม่"));
    context = mergeAssistantContext(context, extractContextPatch("เอาที่เดินไม่เยอะ"));
    context = mergeAssistantContext(context, extractContextPatch("ไปกับพ่อแม่"));

    expect(context.userConstraints).toEqual({
      province: "เชียงใหม่",
      fatigue: "LOW",
      companions: ["FAMILY", "ELDERLY"],
    });
  });

  it("overrides an explicit province without deleting other constraints", () => {
    const context = mergeAssistantContext(
      {
        userConstraints: {
          province: "เชียงใหม่",
          fatigue: "LOW",
          companions: ["FAMILY"],
        },
      },
      extractContextPatch("เปลี่ยนเป็นเชียงราย"),
    );

    expect(context.userConstraints).toEqual({
      province: "เชียงราย",
      fatigue: "LOW",
      companions: ["FAMILY"],
    });
  });

  it.each([
    ["อยากเที่ยวถ้ำ", ["CAVE"]],
    ["ขอล่องแก่ง", ["RAFTING"]],
    ["อยากนั่งเรือชมอ่างเก็บน้ำ", ["BOAT", "RESERVOIR"]],
    ["อยากชมดอกไม้", ["FLOWER"]],
    ["อยากดูทุ่งหญ้า", ["SAVANNA"]],
    ["อยากชมวิวแล้วแวะออนเซ็น", ["VIEWPOINT", "HOT_SPRING"]],
  ])("understands activity wording in %s", (message, expected) => {
    expect(extractContextPatch(message).activities).toEqual(expected);
  });

  it("does not turn the broad word nature into a narrow activity requirement", () => {
    expect(extractContextPatch("อยากเที่ยวธรรมชาติที่เชียงใหม่").activities)
      .toBeUndefined();
  });

  it("applies a negation across joined activities but stops at a contrasting request", () => {
    const patch = extractContextPatch("ไม่เอาน้ำตกกับกางเต็นท์ แต่ขอชมวิว");
    expect(patch.excludedActivities).toEqual(["WATERFALL", "CAMPSITE"]);
    expect(patch.activities).toEqual(["VIEWPOINT"]);
  });

  it("understands conversational province replacement without requiring the word ขอ", () => {
    expect(extractContextPatch("ไม่ไปเชียงใหม่ ไปเชียงรายแทน").province)
      .toBe("เชียงราย");
  });

  it.each([
    ["ไม่อยากเหนื่อย", "LOW"],
    ["ขอแบบเดินนิดเดียว", "LOW"],
    ["อยากได้ทางเดินง่ายๆ", "LOW"],
  ] as const)("understands conversational effort in %s", (message, expected) => {
    expect(extractContextPatch(message).fatigue).toBe(expected);
  });

  it("recognizes older-adult wording and Thai duration words", () => {
    expect(extractContextPatch("ไปกับผู้สูงวัยสองวัน")).toMatchObject({
      companions: ["ELDERLY"],
      durationDays: 2,
    });
  });
});

describe("park reference resolution", () => {
  const context: AssistantContext = { lastRecommendedParks: parks };

  it.each([
    ["ที่แรก", [parks[0]]],
    ["อันที่สอง", [parks[1]]],
    ["ที่สาม", [parks[2]]],
    ["สองที่แรก", parks.slice(0, 2)],
    ["ทั้งสองที่", parks.slice(0, 2)],
  ])("resolves %s", (message, expected) => {
    expect(resolveParkReferences(message, context).parks).toEqual(expected);
  });

  it("does not guess when no prior result exists", () => {
    expect(resolveParkReferences("เอาอันนั้น", {})).toEqual({
      parks: [],
      unresolved: true,
    });
  });

  it("resolves ordinals from the latest presented park list", () => {
    const latest = [
      { id: "p4", slug: "four", name: "อุทยานสี่" },
      { id: "p5", slug: "five", name: "อุทยานห้า" },
    ];
    expect(resolveParkReferences("ที่แรก", {
      lastRecommendedParks: parks,
      lastParkResults: latest,
    }).parks).toEqual([latest[0]]);
  });

  it("does not let a stale selected park override a newer ambiguous list", () => {
    expect(resolveParkReferences("เอาอันนั้น", {
      selectedPark: parks[0],
      lastParkResults: parks.slice(1),
    })).toEqual({ parks: [], unresolved: true });
  });
});
