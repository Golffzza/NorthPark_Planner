import fs from "node:fs/promises";
import path from "node:path";

import { parkFeeDictionary, getParkFeeInfo } from "../lib/data/park-fees";
import { parksData } from "../prisma/seed-data/parks-raw";

const KNOWLEDGE_PARKS_DIR = path.resolve(process.cwd(), "data/knowledge/parks");

async function updateKnowledgeMarkdownFiles() {
  const files = await fs.readdir(KNOWLEDGE_PARKS_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  console.log(`Found ${mdFiles.length} park markdown files.`);

  let updatedCount = 0;

  for (const filename of mdFiles) {
    const slug = filename.replace(/\.md$/, "");
    const filePath = path.join(KNOWLEDGE_PARKS_DIR, filename);
    let content = await fs.readFile(filePath, "utf-8");

    // Find raw park data for opening hours
    const rawPark = parksData.find(
      (p) =>
        p.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").includes(slug) ||
        slug.includes(p.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) ||
        p.name === content.match(/name_th:\s*"([^"]+)"/)?.[1]
    );

    const openingHours = rawPark?.openingHours || "08:00 - 16:30";
    const feeInfo = getParkFeeInfo(slug, rawPark?.name);

    let feeText = "";
    if (feeInfo.isFree || (feeInfo.thaiAdult === 0 && feeInfo.foreignAdult === 0)) {
      feeText = "- **อัตราค่าบริการเข้าอุทยานฯ (ค่าธรรมเนียมเข้า):** เข้าฟรี ไม่มีค่าธรรมเนียมเข้าสำหรับบุคคลทั่วไป (พื้นที่เตรียมการจัดตั้งหรือยกเว้นค่าบริการ)";
    } else {
      feeText = `- **อัตราค่าบริการเข้าอุทยานฯ (ค่าธรรมเนียมเข้า):**
  - บุคคลชาวไทย: ผู้ใหญ่ ${feeInfo.thaiAdult} บาท / เด็ก ${feeInfo.thaiChild} บาท (${feeInfo.freeExemptions.join(", ")} เข้าฟรี)
  - บุคคลชาวต่างชาติ: ผู้ใหญ่ ${feeInfo.foreignAdult} บาท / เด็ก ${feeInfo.foreignChild} บาท
  - ยานพาหนะ: รถยนต์ 4 ล้อ ${feeInfo.vehicles.car} บาท / รถจักรยานยนต์ ${feeInfo.vehicles.motorcycle} บาท`;
    }

    const basicInfoInsertion = `- **เวลาเปิด-ปิดทำการ:** ${openingHours} น. (เปิดทำการทุกวันตามเวลามาตรฐานอุทยานแห่งชาติ)
${feeText}`;

    // Insert into Section 2 if not already present
    if (!content.includes("**เวลาเปิด-ปิดทำการ:**")) {
      content = content.replace(
        /(## 2\. ข้อมูลพื้นฐานสำหรับ RAG[\s\S]*?- \*\*สถานะทางกฎหมายในฐานความรู้:\*\* `[A-Z]+`)/,
        `$1\n${basicInfoInsertion}`
      );
      updatedCount++;
      await fs.writeFile(filePath, content, "utf-8");
    }
  }

  console.log(`Updated ${updatedCount} markdown files with fee & opening hours.`);
}

updateKnowledgeMarkdownFiles().catch(console.error);
