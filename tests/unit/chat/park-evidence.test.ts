import { describe, expect, it } from "vitest";
import { recommendParks } from "@/lib/chat/core/recommendation-engine";
import { getParkCatalog } from "@/lib/chat/core/park-catalog";
import type { RetrievedKnowledgeChunk } from "@/lib/chat/rag/knowledge-retriever";
import { compareParks } from "@/lib/chat/core/comparison-service";

export function evidence(
  slug: string,
  type = "WATERFALL",
  difficulty = "LOW",
  options: { name?: string; walking?: string; rankScore?: number } = {},
): RetrievedKnowledgeChunk {
  const name = options.name ?? "จุดทดสอบ";
  return { id: `${slug}:${type}:${name}`, documentId: slug, slug, parkTitle: slug, title: `${slug}: ${name}`, section: `attraction:${type}:A01`,
    content: `สถานที่: ${name}\n- **summary:** จุดพักผ่อนตามธรรมชาติ\n- **difficulty:** ${difficulty}\n- **walking:** ${options.walking ?? "200 เมตร"}\n- **risks:** หินลื่น\n- **source_ids:** S01`, similarity: 1, rankScore: options.rankScore ?? 1 };
}

describe("recommendations require activity-level evidence", () => {
  const parks = getParkCatalog().filter((p) => ["doi-inthanon", "mae-wang"].includes(p.slug));
  it("does not recommend a province-only match for a missing requested activity", () => {
    expect(recommendParks(parks, { province: "เชียงใหม่", activities: ["CAMPSITE"] }, 3, [evidence("doi-inthanon")])).toEqual([]);
  });
  it("does not equate day-trip tags to low effort", () => {
    expect(recommendParks(parks, { province: "เชียงใหม่", fatigue: "LOW" }, 3, [evidence("mae-wang", "TRAIL", "HIGH")])).toEqual([]);
  });
  it("requires evidence and includes walking and risks in recommendation reasons", () => {
    const result = recommendParks(parks, { activities: ["WATERFALL"], fatigue: "LOW" }, 3, [evidence("doi-inthanon")]);
    expect(result).toHaveLength(1);
    expect(result[0].reasons.join(" ")).toContain("200 เมตร");
    expect(result[0].reasons.join(" ")).toContain("หินลื่น");
    expect(recommendParks(parks, { province: "เชียงใหม่" })).toEqual([]);
  });
  it("respects exclusions and does not certify elderly accessibility", () => {
    expect(recommendParks(parks, { excludedActivities: ["WATERFALL"] }, 3, [evidence("doi-inthanon")])).toEqual([]);
    const result = recommendParks(parks, { companions: ["ELDERLY"] }, 3, [evidence("doi-inthanon")]);
    expect(result[0].reasons.join(" ")).toContain("ยังไม่ยืนยัน");
  });

  it("does not recommend a park whose latest authoritative status is closed indefinitely", () => {
    const catalogPark = getParkCatalog().find((item) => item.slug === "doi-phu-nang")!;
    const park = {
      ...catalogPark,
      tags: catalogPark.tags.filter((tag) => tag !== "closed-last-known"),
    };
    const closedStatus: RetrievedKnowledgeChunk = {
      id: "doi-phu-nang:dynamic",
      documentId: "doi-phu-nang",
      slug: "doi-phu-nang",
      parkTitle: park.name,
      title: "ข้อมูลที่เปลี่ยนแปลงได้",
      section: "dynamic",
      content: "- **last_known_status_note:** Last known authoritative tourism status: CLOSED INDEFINITELY from 25 March 2025; current status requires live verification before any visit recommendation.",
      similarity: 1,
      rankScore: 1,
    };

    expect(recommendParks(
      [park],
      { province: "พะเยา", activities: ["WATERFALL"] },
      3,
      [evidence("doi-phu-nang"), closedStatus],
    )).toEqual([]);
  });

  it("ranks a shorter low-effort match ahead of an alphabetical tie", () => {
    const results = recommendParks(
      parks,
      { activities: ["WATERFALL"], fatigue: "LOW" },
      3,
      [
        evidence("doi-inthanon", "WATERFALL", "LOW", { walking: "1.2 กม." }),
        evidence("mae-wang", "WATERFALL", "LOW", { walking: "100 เมตร" }),
      ],
    );

    expect(results.map((result) => result.park.slug)).toEqual([
      "mae-wang",
      "doi-inthanon",
    ]);
  });

  it("grounds every requested activity instead of explaining only the first one", () => {
    const park = getParkCatalog().find((item) => item.slug === "doi-inthanon")!;
    const results = recommendParks(
      [park],
      { activities: ["WATERFALL", "TRAIL"] },
      3,
      [
        evidence("doi-inthanon", "WATERFALL", "LOW", { name: "น้ำตกตัวอย่าง" }),
        evidence("doi-inthanon", "TRAIL", "MODERATE", { name: "เส้นทางตัวอย่าง" }),
      ],
    );

    expect(results[0].reasons.join(" ")).toContain("น้ำตกตัวอย่าง");
    expect(results[0].reasons.join(" ")).toContain("เส้นทางตัวอย่าง");
  });
});

describe("comparison uses attraction evidence", () => {
  it("preserves requested order and exposes walking/difficulty instead of catalog tags", () => {
    const parks = getParkCatalog().filter((p) => ["mae-wang", "doi-inthanon"].includes(p.slug));
    const ordered = [parks.find((p) => p.slug === "mae-wang")!, parks.find((p) => p.slug === "doi-inthanon")!];
    const comparison = compareParks(ordered, [evidence("mae-wang", "TRAIL", "HIGH"), evidence("doi-inthanon")]);
    expect(comparison.parks.map((item) => item.park.slug)).toEqual(["mae-wang", "doi-inthanon"]);
    expect(comparison.parks[0].highlights.join(" ")).toContain("200 เมตร");
    expect(comparison.parks[0].highlights.join(" ")).toContain("HIGH");
    expect(comparison.parks[0].highlights).not.toContain("geology");
  });

  it("keeps only the activity evidence requested by the comparison question", () => {
    const parks = getParkCatalog().filter((p) => ["mae-wang", "doi-inthanon"].includes(p.slug));
    const comparison = compareParks(parks, [
      evidence("mae-wang", "WATERFALL", "LOW", { name: "น้ำตกแม่วาง" }),
      evidence("mae-wang", "CAVE", "LOW", { name: "ถ้ำแม่วาง" }),
      evidence("doi-inthanon", "WATERFALL", "LOW", { name: "น้ำตกอินทนนท์" }),
      evidence("doi-inthanon", "TRAIL", "LOW", { name: "ทางเดินอินทนนท์" }),
    ], "เปรียบเทียบน้ำตกของสองอุทยาน");

    expect(comparison.parks.flatMap((item) => item.highlights).join(" "))
      .not.toMatch(/ถ้ำแม่วาง|ทางเดินอินทนนท์/);
    expect(comparison.parks.every((item) => item.highlights.some((value) => value.includes("น้ำตก"))))
      .toBe(true);
  });

  it("orders low-effort comparison highlights by difficulty and walking distance", () => {
    const park = getParkCatalog().find((item) => item.slug === "doi-inthanon")!;
    const comparison = compareParks([park], [
      evidence("doi-inthanon", "TRAIL", "LOW-MODERATE", { name: "ทางไกล", walking: "1 กม." }),
      evidence("doi-inthanon", "TRAIL", "LOW", { name: "ทางสั้น", walking: "100 เมตร" }),
    ], "จุดไหนเดินน้อยกว่า");

    expect(comparison.parks[0].highlights[0]).toContain("ทางสั้น");
  });

  it("keeps evidence for every requested comparison activity within the result limit", () => {
    const park = getParkCatalog().find((item) => item.slug === "doi-inthanon")!;
    const waterfalls = [1, 2, 3, 4].map((index) => evidence(
      "doi-inthanon",
      "WATERFALL",
      "LOW",
      { name: `น้ำตก ${index}`, rankScore: 10 - index },
    ));
    const comparison = compareParks(
      [park],
      [
        ...waterfalls,
        evidence("doi-inthanon", "TRAIL", "LOW", {
          name: "เส้นทางที่ต้องไม่หาย",
          rankScore: 1,
        }),
      ],
      "เปรียบเทียบน้ำตกและเดินป่า",
    );

    expect(comparison.parks[0].highlights.join(" ")).toContain("เส้นทางที่ต้องไม่หาย");
  });
});
