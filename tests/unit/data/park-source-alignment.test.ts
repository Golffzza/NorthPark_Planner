import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import knowledgeIndex from "@/data/knowledge/knowledge-index.json";
import { parkContactDictionary } from "@/lib/data/park-addresses";
import { parkFeeDictionary } from "@/lib/data/park-fees";
import { parks } from "@/prisma/seed-data/parks";

describe("canonical park source alignment", () => {
  it("maps every one of the 44 parks to exact fee, contact, and knowledge records", () => {
    expect(knowledgeIndex).toHaveLength(44);
    expect(parks).toHaveLength(44);
    const seedBySlug = new Map(parks.map((park) => [park.slug, park]));

    for (const index of knowledgeIndex) {
      const seed = seedBySlug.get(index.slug);
      const fee = parkFeeDictionary[index.slug];
      const contact = parkContactDictionary[index.slug];
      const markdown = readFileSync(
        join(process.cwd(), "data", "knowledge", "parks", `${index.slug}.md`),
        "utf8",
      );

      expect(seed, `${index.slug}: effective seed`).toBeDefined();
      expect(fee, `${index.slug}: exact fee registry entry`).toBeDefined();
      expect(contact, `${index.slug}: exact contact registry entry`).toBeDefined();
      expect(index.provinces, `${index.slug}: primary province`).toContain(seed!.province);
      expect(
        index.provinces.some((province) => contact!.address.includes(province)),
        `${index.slug}: contact province`,
      ).toBe(true);
      expect(markdown, `${index.slug}: opening hours`).toContain(
        `**เวลาเปิด-ปิดทำการ:** ${seed!.openTime} - ${seed!.closeTime}`,
      );
      expect(markdown, `${index.slug}: fee section`).toContain("**อัตราค่าบริการเข้าอุทยานฯ (ค่าธรรมเนียมเข้า):**");
      if (fee!.isFree || (fee!.thaiAdult === 0 && fee!.foreignAdult === 0)) {
        expect(markdown, `${index.slug}: free entry`).toContain("เข้าฟรี");
      } else {
        expect(markdown, `${index.slug}: Thai adult fee`).toContain(`บุคคลชาวไทย: ผู้ใหญ่ ${fee!.thaiAdult} บาท`);
        expect(markdown, `${index.slug}: foreign adult fee`).toContain(`บุคคลชาวต่างชาติ: ผู้ใหญ่ ${fee!.foreignAdult} บาท`);
      }
    }
  });
});
