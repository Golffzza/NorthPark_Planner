import { describe, expect, it, vi } from "vitest";

import type { ParkCatalogEntry } from "@/lib/chat/core/park-catalog";
import type { RetrievedKnowledgeChunk } from "@/lib/chat/rag/knowledge-retriever";
import { executeCompareParks } from "@/lib/chat-v2/tools/compare-parks";
import { executeGetParkInfo } from "@/lib/chat-v2/tools/get-park-info";
import { executeGetParkKnowledge } from "@/lib/chat-v2/tools/get-park-knowledge";
import { executeRecommendParks } from "@/lib/chat-v2/tools/recommend-parks";
import {
  executeSearchParks,
  searchParksInputSchema,
} from "@/lib/chat-v2/tools/search-parks";

const parks: ParkCatalogEntry[] = [
  {
    id: "doi-inthanon",
    slug: "doi-inthanon",
    name: "อุทยานแห่งชาติดอยอินทนนท์",
    nameEn: "Doi Inthanon National Park",
    provinces: ["เชียงใหม่"],
    legalStatus: "DECLARED",
    tags: ["น้ำตก", "จุดชมวิว"],
    attractionCount: 2,
    verifiedAt: "2026-01-01",
  },
  {
    id: "doi-suthep-pui",
    slug: "doi-suthep-pui",
    name: "อุทยานแห่งชาติดอยสุเทพ-ปุย",
    nameEn: "Doi Suthep-Pui National Park",
    provinces: ["เชียงใหม่"],
    legalStatus: "DECLARED",
    tags: ["วัฒนธรรม", "จุดชมวิว"],
    attractionCount: 1,
    verifiedAt: "2026-01-01",
  },
  {
    id: "taksin-maharat",
    slug: "taksin-maharat",
    name: "อุทยานแห่งชาติตากสินมหาราช",
    nameEn: "Taksin Maharat National Park",
    provinces: ["ตาก"],
    legalStatus: "DECLARED",
    tags: ["ป่า"],
    attractionCount: 1,
    verifiedAt: "2026-01-01",
  },
];

function activityChunk(
  park: ParkCatalogEntry,
  type: string,
  name: string,
): RetrievedKnowledgeChunk {
  return {
    id: `${park.slug}:${type}:${name}`,
    documentId: `document:${park.slug}`,
    slug: park.slug,
    parkTitle: park.name,
    title: `กิจกรรม: ${name}`,
    section: `attraction:${type}:1`,
    content: [
      `สถานที่: ${name}`,
      "- **summary:** ข้อมูลทดสอบจากฐานความรู้",
      "- **difficulty:** LOW",
      "- **walking:** 200 เมตร",
      "- **risks:** ระวังพื้นลื่น",
    ].join("\n"),
    similarity: 0.9,
    rankScore: 1,
  };
}

describe("Assistant V2 tool handlers", () => {
  describe("searchParks", () => {
    it("derives the total from the complete catalog and preserves canonical names", () => {
      const result = executeSearchParks({}, { getParkCatalog: () => parks });

      expect(result).toEqual({
        scope: "ALL",
        coverage: "NORTHPARK_CATALOG",
        coverageNote: "จำนวนนี้เป็นจำนวนรายการในฐานข้อมูล NorthPark ไม่ใช่จำนวนอุทยานทั้งประเทศไทย",
        count: 3,
        parks: parks.map(({ id, slug, name, provinces }) => ({ id, slug, name, provinces })),
      });
    });

    it.each([
      ["เชียงใหม่", ["อุทยานแห่งชาติดอยอินทนนท์", "อุทยานแห่งชาติดอยสุเทพ-ปุย"]],
      ["ตาก", ["อุทยานแห่งชาติตากสินมหาราช"]],
    ])("filters the structured catalog for %s", (province, names) => {
      const result = executeSearchParks({ province }, { getParkCatalog: () => parks });

      expect(result.scope).toBe("PROVINCE");
      expect(result.province).toBe(province);
      expect(result.parks.map((park) => park.name)).toEqual(names);
      expect(result.count).toBe(names.length);
    });

    it("returns zero for an uncovered province without falling back to the global catalog", () => {
      const result = executeSearchParks(
        { province: "ภูเก็ต" },
        { getParkCatalog: () => parks },
      );

      expect(result).toEqual({
        scope: "PROVINCE",
        coverage: "NORTHPARK_CATALOG",
        coverageNote: "ผลลัพธ์นี้แสดงเฉพาะข้อมูลที่มีในฐานข้อมูล NorthPark",
        province: "ภูเก็ต",
        count: 0,
        parks: [],
      });
    });

    it("accepts an empty optional province from the model and treats it as all parks", () => {
      const parsed = searchParksInputSchema.parse({ province: "" });
      const result = executeSearchParks(parsed, { getParkCatalog: () => parks });

      expect(result.scope).toBe("ALL");
      expect(result.count).toBe(parks.length);
      expect(result).not.toHaveProperty("province");
    });
  });

  describe("getParkInfo", () => {
    it("returns the canonical park and province without retrieving knowledge", async () => {
      const findByParkSlugs = vi.fn();
      const result = await executeGetParkInfo(
        { parkName: "ดอยอินทนนท์", topic: "province" },
        {
          findMentionedParks: () => [parks[0]],
          findByParkSlugs,
        },
      );

      expect(result).toMatchObject({
        found: true,
        park: { id: "doi-inthanon", name: "อุทยานแห่งชาติดอยอินทนนท์" },
        topic: "province",
        provinces: ["เชียงใหม่"],
      });
      expect(findByParkSlugs).not.toHaveBeenCalled();
    });

    it("uses the existing resolver for an alias", async () => {
      const result = await executeGetParkInfo({
        parkName: "ดอยสุเทพ",
        topic: "province",
      });

      expect(result).toMatchObject({
        found: true,
        park: { slug: "doi-suthep-pui", name: "อุทยานแห่งชาติดอยสุเทพ-ปุย" },
      });
    });

    it("returns an explicit not-found result", async () => {
      const result = await executeGetParkInfo(
        { parkName: "อุทยานที่ไม่มี", topic: "basic" },
        { findMentionedParks: () => [] },
      );

      expect(result).toEqual({
        found: false,
        ambiguous: false,
        parkName: "อุทยานที่ไม่มี",
        candidates: [],
      });
    });

    it("returns explicit candidates when resolution is ambiguous", async () => {
      const result = await executeGetParkInfo(
        { parkName: "ดอย", topic: "basic" },
        { findMentionedParks: () => parks.slice(0, 2) },
      );

      expect(result).toMatchObject({
        found: false,
        ambiguous: true,
        candidates: [
          { slug: "doi-inthanon" },
          { slug: "doi-suthep-pui" },
        ],
      });
    });

    it("loads direct park chunks and returns unique structured activities", async () => {
      const waterfall = activityChunk(parks[0], "WATERFALL", "น้ำตกวชิรธาร");
      const findByParkSlugs = vi.fn().mockResolvedValue([waterfall, waterfall]);
      const result = await executeGetParkInfo(
        { parkName: "ดอยอินทนนท์", topic: "activities" },
        {
          findMentionedParks: () => [parks[0]],
          findByParkSlugs,
        },
      );

      expect(findByParkSlugs).toHaveBeenCalledWith(["doi-inthanon"]);
      expect(result).toMatchObject({
        found: true,
        topic: "activities",
        activities: [
          {
            type: "WATERFALL",
            name: "น้ำตกวชิรธาร",
            chunkId: waterfall.id,
            section: waterfall.section,
          },
        ],
      });
    });

    it("returns campsite evidence when it exists", async () => {
      const campsite = activityChunk(parks[0], "CAMPSITE", "ลานกางเต็นท์ดงสน");
      const result = await executeGetParkInfo(
        { parkName: "ดอยอินทนนท์", topic: "camping" },
        {
          findMentionedParks: () => [parks[0]],
          findByParkSlugs: vi.fn().mockResolvedValue([campsite]),
        },
      );

      expect(result).toMatchObject({
        found: true,
        topic: "camping",
        status: "EVIDENCE_FOUND",
        campsites: [{ type: "CAMPSITE", name: "ลานกางเต็นท์ดงสน" }],
      });
    });

    it("returns UNKNOWN rather than false when campsite evidence is absent", async () => {
      const result = await executeGetParkInfo(
        { parkName: "ดอยอินทนนท์", topic: "camping" },
        {
          findMentionedParks: () => [parks[0]],
          findByParkSlugs: vi.fn().mockResolvedValue([
            activityChunk(parks[0], "WATERFALL", "น้ำตกวชิรธาร"),
          ]),
        },
      );

      expect(result).toMatchObject({
        found: true,
        topic: "camping",
        status: "UNKNOWN",
        campsites: [],
      });
      expect(result).not.toHaveProperty("camping", false);
    });
  });

  describe("recommendParks", () => {
    it.each([
      {
        excludedActivities: ["WATERFALL"],
        remainingTypes: ["TRAIL", "CAMPSITE", "CAVE"],
      },
      {
        excludedActivities: ["TRAIL"],
        remainingTypes: ["WATERFALL", "CAMPSITE", "CAVE"],
      },
      {
        excludedActivities: ["CAMPSITE"],
        remainingTypes: ["WATERFALL", "TRAIL", "CAVE"],
      },
      {
        excludedActivities: ["CAVE", "WATERFALL"],
        remainingTypes: ["TRAIL", "CAMPSITE"],
      },
    ])(
      "removes only canonical $excludedActivities evidence before recommendation",
      async ({ excludedActivities, remainingTypes }) => {
        const evidence = ["WATERFALL", "TRAIL", "CAMPSITE", "CAVE"]
          .map((type) => activityChunk(parks[0], type, `กิจกรรม ${type}`));
        const recommendParks = vi.fn().mockReturnValue([]);

        await executeRecommendParks(
          { excludedActivities },
          {
            getParkCatalog: () => [parks[0]],
            findByParkSlugs: vi.fn().mockResolvedValue(evidence),
            recommendParks,
          },
        );

        const receivedEvidence = recommendParks.mock.calls[0][3] as
          RetrievedKnowledgeChunk[];
        expect(receivedEvidence.map((chunk) =>
          chunk.section.split(":")[1]
        )).toEqual(remainingTypes);
      },
    );

    it("retrieves direct evidence before calling the real-engine adapter", async () => {
      const events: string[] = [];
      const evidence = [activityChunk(parks[2], "TRAIL", "เส้นทางศึกษาธรรมชาติ")];
      const findByParkSlugs = vi.fn(async () => {
        events.push("evidence");
        return evidence;
      });
      const recommendParks = vi.fn((candidateParks, constraints, limit, receivedEvidence) => {
        events.push("recommend");
        expect(candidateParks).toEqual([parks[2]]);
        expect(constraints).toEqual({
          province: "ตาก",
          activities: ["TRAIL"],
          fatigue: "LOW",
          companions: ["FAMILY", "ELDERLY"],
          durationDays: 2,
        });
        expect(limit).toBe(3);
        expect(receivedEvidence).toBe(evidence);
        return [{
          park: parks[2],
          reasons: ["ข้อมูลจริง"],
          matchedConstraints: ["province", "activity:TRAIL"],
        }];
      });

      const result = await executeRecommendParks(
        {
          province: "ตาก",
          activities: ["TRAIL"],
          fatigue: "LOW",
          companions: ["FAMILY", "ELDERLY"],
          durationDays: 2,
        },
        { getParkCatalog: () => parks, findByParkSlugs, recommendParks },
      );

      expect(events).toEqual(["evidence", "recommend"]);
      expect(findByParkSlugs).toHaveBeenCalledWith(["taksin-maharat"]);
      expect(result.recommendations[0].park.name).toBe("อุทยานแห่งชาติตากสินมหาราช");
      expect(result.limitations.durationDaysAffectsRanking).toBe(false);
    });

    it("does not add constraints that were omitted from tool input", async () => {
      const recommendParks = vi.fn().mockReturnValue([]);

      await executeRecommendParks(
        { province: "ตาก", fatigue: "LOW", companions: ["FAMILY", "ELDERLY"] },
        {
          getParkCatalog: () => parks,
          findByParkSlugs: vi.fn().mockResolvedValue([]),
          recommendParks,
        },
      );

      expect(recommendParks.mock.calls[0][1]).toEqual({
        province: "ตาก",
        fatigue: "LOW",
        companions: ["FAMILY", "ELDERLY"],
      });
    });
  });

  describe("compareParks", () => {
    it("resolves independently and preserves the requested order", async () => {
      const compareParks = vi.fn((resolved) => ({
        parks: resolved.map((park: ParkCatalogEntry) => ({
          park,
          provinces: park.provinces,
          highlights: [],
        })),
        summary: "เปรียบเทียบจากข้อมูลที่มี",
      }));
      const result = await executeCompareParks(
        { parkNames: ["ดอยสุเทพ", "ดอยอินทนนท์"], question: "ต่างกันอย่างไร" },
        {
          findMentionedParks: (name) => name.includes("สุเทพ") ? [parks[1]] : [parks[0]],
          findByParkSlugs: vi.fn().mockResolvedValue([]),
          compareParks,
        },
      );

      expect(compareParks.mock.calls[0][0].map((park: ParkCatalogEntry) => park.slug)).toEqual([
        "doi-suthep-pui",
        "doi-inthanon",
      ]);
      expect(result).toMatchObject({
        status: "OK",
        comparison: {
          parks: [
            { park: { slug: "doi-suthep-pui" } },
            { park: { slug: "doi-inthanon" } },
          ],
        },
      });
    });

    it("reports unresolved input without silently substituting another park", async () => {
      const findByParkSlugs = vi.fn();
      const compareParks = vi.fn();
      const result = await executeCompareParks(
        { parkNames: ["ดอยอินทนนท์", "อุทยานที่ไม่มี"] },
        {
          findMentionedParks: (name) => name === "ดอยอินทนนท์" ? [parks[0]] : [],
          findByParkSlugs,
          compareParks,
        },
      );

      expect(result).toMatchObject({
        status: "UNRESOLVED",
        unresolved: [{ parkName: "อุทยานที่ไม่มี", reason: "NOT_FOUND" }],
      });
      expect(findByParkSlugs).not.toHaveBeenCalled();
      expect(compareParks).not.toHaveBeenCalled();
    });
  });

  describe("getParkKnowledge", () => {
    it("uses canonical park context, invokes retrieval, and maps grounded chunks", async () => {
      const chunk = activityChunk(parks[0], "VIEWPOINT", "ยอดดอยอินทนนท์");
      const retrieve = vi.fn().mockResolvedValue({
        query: "canonical query",
        mode: "FOCUSED",
        focusedSlug: parks[0].slug,
        explicitProvinces: [],
        requiresLiveVerification: true,
        analysis: {
          intent: "LIVE_STATUS",
          activityTypes: [],
          preferredTags: [],
          effort: "ANY",
          requiresLiveVerification: true,
        },
        chunks: [chunk],
      });
      const result = await executeGetParkKnowledge(
        { parkName: "ดอยอินทนนท์", question: "วันนี้มีอะไรน่าสนใจ" },
        { findMentionedParks: () => [parks[0]], retrieve },
      );

      expect(retrieve).toHaveBeenCalledWith(
        "อุทยานแห่งชาติดอยอินทนนท์: วันนี้มีอะไรน่าสนใจ",
        3,
        undefined,
      );
      expect(result).toEqual({
        status: "OK",
        park: {
          id: parks[0].id,
          slug: parks[0].slug,
          name: parks[0].name,
          provinces: parks[0].provinces,
        },
        requiresLiveVerification: true,
        chunks: [{
          chunkId: chunk.id,
          slug: chunk.slug,
          parkTitle: chunk.parkTitle,
          title: chunk.title,
          section: chunk.section,
          content: chunk.content,
        }],
      });
      if (result.status !== "OK") throw new Error("Expected grounded result");
      expect(result.chunks[0]).not.toHaveProperty("similarity");
      expect(result.chunks[0]).not.toHaveProperty("rankScore");
      expect(result.chunks[0]).not.toHaveProperty("sourceIds");
    });
  });
});
