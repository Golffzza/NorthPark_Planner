import { describe, expect, it } from "vitest";

import { getParkCatalog } from "@/lib/chat/core/park-catalog";
import type { RetrievedKnowledgeChunk } from "@/lib/chat/rag/knowledge-retriever";
import { executePlanTrip } from "@/lib/chat-v2/tools/plan-trip";

const park = getParkCatalog().find((entry) => entry.slug === "doi-inthanon")!;
const chunk: RetrievedKnowledgeChunk = {
  id: "chunk-1", documentId: "document-1", slug: park.slug,
  parkTitle: park.name, title: "น้ำตกตัวอย่าง", section: "attraction:WATERFALL:1",
  content: "สถานที่: น้ำตกตัวอย่าง\n- **summary:** ตัวอย่างจากเอกสารทดสอบ\n- **difficulty:** LOW",
  similarity: 0.9, rankScore: 1,
};

describe("AI plan draft generation", () => {
  it("uses verified RAG activities and preserves source references", async () => {
    const result = await executePlanTrip(
      { parkName: park.name, durationDays: 2 },
      { durationDays: 2 },
      { findByParkSlugs: async () => [chunk] },
    );
    expect(result.status).toBe("OK");
    if (result.status !== "OK") return;
    expect(result.draftTrip.days).toHaveLength(2);
    expect(result.draftTrip.days[0].items).toEqual(["น้ำตกตัวอย่าง"]);
    expect(result.evidence[0]).toMatchObject({ name: "น้ำตกตัวอย่าง", sourceReference: "document-1:chunk-1" });
  });

  it("does not invent activities when retrieval has no evidence", async () => {
    const result = await executePlanTrip(
      { parkName: park.name, durationDays: 1 },
      { durationDays: 1 },
      { findByParkSlugs: async () => [] },
    );
    expect(result).toMatchObject({ status: "INSUFFICIENT_EVIDENCE" });
  });

  it("keeps other evidenced park activities available to add without changing initial ranking", async () => {
    const parkChunks = ["A", "B", "C", "D"].map((name, index) => ({
      ...chunk, id: `chunk-${index}`, content: `สถานที่: จุด ${name}\n- **summary:** ข้อมูลทดสอบ`,
    }));
    const result = await executePlanTrip(
      { parkName: park.name, durationDays: 1 },
      { durationDays: 1 },
      { findByParkSlugs: async () => [...parkChunks, { ...chunk, slug: "other-park", id: "foreign" }] },
    );
    expect(result.status).toBe("OK");
    if (result.status !== "OK") return;
    expect(result.draftTrip.days[0].items).toHaveLength(3);
    expect(result.verifiedActivities).toHaveLength(4);
    expect(result.verifiedActivities.map((item) => item.name)).toContain("จุด D");
  });
});
