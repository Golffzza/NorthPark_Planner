import { describe, expect, it } from "vitest";

import { chunkParkKnowledge } from "@/lib/chat/rag/knowledge-chunker";
import { loadParkKnowledge } from "@/lib/chat/rag/knowledge-loader";

describe("park knowledge chunk coverage", () => {
  it("keeps the five supplemental sections for all 44 parks during a rebuild", async () => {
    const documents = await loadParkKnowledge();
    expect(documents).toHaveLength(44);

    const required = ["geo_aliases", "preparation", "rules", "emergency", "nearby_context"];
    for (const document of documents) {
      const sections = new Set(chunkParkKnowledge(document).map((chunk) => chunk.section));
      for (const section of required) {
        expect(sections.has(section), `${document.metadata.slug} lost ${section}`).toBe(true);
      }
      expect([...sections].some((section) => section.includes("DO_NOT_EMBED"))).toBe(false);
    }
  });

  it("indexes recorded fee and hours from the current Lan Sang file", async () => {
    const documents = await loadParkKnowledge();
    const lanSang = documents.find((document) => document.metadata.slug === "lan-sang");
    expect(lanSang).toBeDefined();
    const basicInfo = chunkParkKnowledge(lanSang!).find((chunk) => chunk.section === "basic_info");
    expect(basicInfo?.content).toContain("เวลาเปิด-ปิดทำการ");
    expect(basicInfo?.content).toContain("อัตราค่าบริการเข้าอุทยาน");
  });
});
