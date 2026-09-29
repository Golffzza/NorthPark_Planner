import { describe, expect, it } from "vitest";

import {
  answerStructuredFact,
  getParkCatalog,
} from "@/lib/chat/core/park-catalog";
import { recommendParks } from "@/lib/chat/core/recommendation-engine";
import { compareParks } from "@/lib/chat/core/comparison-service";
import { sourcesForEvidence } from "@/lib/chat/core/source-metadata";
import type { RetrievedKnowledgeChunk } from "@/lib/chat/rag/knowledge-retriever";

function activityEvidence(slug: string): RetrievedKnowledgeChunk {
  return {
    id: `${slug}:A01`, documentId: slug, slug, parkTitle: slug,
    title: "น้ำตกทดสอบ", section: "attraction:WATERFALL:A01",
    content: "สถานที่: น้ำตกทดสอบ\n- **summary:** จุดธรรมชาติ\n- **walking:** 200 เมตร\n- **difficulty:** LOW\n- **risks:** หินลื่น\n- **source_ids:** S01",
    similarity: 1, rankScore: 1,
  };
}

describe("structured park facts", () => {
  it("answers total count from the catalog", () => {
    const catalog = getParkCatalog();
    expect(answerStructuredFact("ในระบบมีอุทยานกี่แห่ง", catalog)?.message).toContain(
      String(catalog.length),
    );
  });

  it.each([
    "รายชื่ออุทยานทั้งหมด",
    "มีจังหวัดอะไรบ้าง",
    "เชียงใหม่มีอุทยานอะไรบ้าง",
    "เชียงใหม่มีอุทยานกี่แห่ง",
  ])("answers %s deterministically", (query) => {
    expect(answerStructuredFact(query, getParkCatalog())).toBeDefined();
  });
});

describe("recommendation and comparison", () => {
  it("filters by province, deduplicates parks, and includes evidence reasons", () => {
    const catalog = getParkCatalog();
    const chiangMaiEvidence = catalog.filter((park) => park.provinces.includes("เชียงใหม่"))
      .map((park) => activityEvidence(park.slug));
    const results = recommendParks(catalog, {
      province: "เชียงใหม่",
      fatigue: "LOW",
      companions: ["FAMILY", "ELDERLY"],
      activities: ["WATERFALL"],
    }, 3, chiangMaiEvidence);

    expect(results.length).toBeGreaterThan(0);
    expect(new Set(results.map((result) => result.park.slug)).size).toBe(results.length);
    const chiangMaiSlugs = new Set(
      catalog.filter((park) => park.provinces.includes("เชียงใหม่")).map((park) => park.slug),
    );
    expect(results.every((result) => chiangMaiSlugs.has(result.park.slug))).toBe(true);
    expect(results.every((result) => result.reasons.length > 0)).toBe(true);
  });

  it("returns no candidates when a hard province constraint has no match", () => {
    expect(recommendParks(getParkCatalog(), { province: "ภูเก็ต" })).toEqual([]);
  });

  it("compares explicit parks without declaring an unsupported winner", () => {
    const catalog = getParkCatalog();
    const parks = catalog.filter((park) =>
      ["doi-inthanon", "doi-suthep-pui"].includes(park.slug),
    );
    const comparison = compareParks(parks);

    expect(comparison.parks).toHaveLength(2);
    expect(comparison.summary).not.toMatch(/ชนะ|ดีที่สุด/);
  });
});

describe("source metadata", () => {
  it("deduplicates registry sources and never invents unknown sources", () => {
    const sources = sourcesForEvidence([
      { parkSlug: "doi-inthanon", sourceIds: ["S01", "S01", "UNKNOWN"] },
    ]);

    expect(sources.length).toBe(1);
    expect(sources[0].id).toBe("doi-inthanon:S01");
    expect(sources[0].url).toMatch(/^https?:\/\//);
  });
});
