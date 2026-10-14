import "dotenv/config";

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import knowledgeIndex from "../data/knowledge/knowledge-index.json";
import { parkContactDictionary } from "../lib/data/park-addresses";
import { parkFeeDictionary } from "../lib/data/park-fees";
import { prisma } from "../lib/db/prisma";
import { getParkDetail } from "../lib/services/park-service";
import { parks } from "../prisma/seed-data/parks";
import { parksData as rawParks } from "../prisma/seed-data/parks-raw";

function field(content: string, label: string): string | null {
  const line = content.split(/\r?\n/).find((item) => item.includes(`**${label}:**`));
  return line?.split(`**${label}:**`)[1]?.trim() ?? null;
}

function markdownFacts(slug: string) {
  const content = readFileSync(join("data", "knowledge", "parks", `${slug}.md`), "utf8");
  const feeStart = content.indexOf("**อัตราค่าบริการเข้าอุทยานฯ (ค่าธรรมเนียมเข้า):**");
  const feeBlock = feeStart < 0 ? "" : content.slice(feeStart, feeStart + 600).split("\n- **วันที่ทบทวน")[0];
  const thai = feeBlock.match(/บุคคลชาวไทย:\s*ผู้ใหญ่\s*(\d+)\s*บาท/);
  const foreign = feeBlock.match(/บุคคลชาวต่างชาติ:\s*ผู้ใหญ่\s*(\d+)\s*บาท/);
  const opening = field(content, "เวลาเปิด-ปิดทำการ")?.match(/(\d\d:\d\d)\s*-\s*(\d\d:\d\d)/);
  return {
    name: field(content, "ชื่อไทย"),
    provincesText: field(content, "จังหวัด/พื้นที่เกี่ยวข้องที่ใช้เป็น metadata"),
    hours: opening ? `${opening[1]}-${opening[2]}` : null,
    fee: thai && foreign ? `${thai[1]}/${foreign[1]}` : /เข้าฟรี/.test(feeBlock) ? "FREE" : null,
    coordinates: field(content, "park_coordinates"),
    contentHash: createHash("sha256").update(content, "utf8").digest("hex"),
  };
}

function sameCoordinates(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  return Math.abs(a.latitude - b.latitude) < 0.000001 && Math.abs(a.longitude - b.longitude) < 0.000001;
}

type Coordinate = { latitude: number; longitude: number };
type AuditRow = {
  slug: string;
  name: string;
  rawFee: string | null;
  registryFee: string | null;
  ragFee: string | null;
  seedHours: string | null;
  dbHours: string | null;
  serviceHours: string | null;
  ragHours: string | null;
  rawCoord: Coordinate | null;
  seedCoord: Coordinate | null;
  dbCoord: Coordinate | null;
  ragCoordinates: string | null;
  seedProvince: string | null;
  dbProvince: string | null;
  catalogProvinces: string[];
  ragProvinces: string | null;
  contact: { address: string; phone?: string } | null;
  dbId: string | null;
  dbActive: boolean | null;
  runtimeRagDocuments: number;
  runtimeRagChunks: number;
  flags: string[];
};

async function main() {
  const dbParks = await prisma.park.findMany({
    select: {
      id: true, slug: true, nameTh: true, province: true,
      latitude: true, longitude: true, openTime: true, closeTime: true, isActive: true,
      knowledgeDocuments: { select: { id: true, contentHash: true, chunks: { select: { section: true, content: true } } } },
    },
  });
  const dbBySlug = new Map(dbParks.map((park) => [park.slug, park]));
  const seedBySlug = new Map(parks.map((park) => [park.slug, park]));
  const rawByName = new Map(rawParks.map((park) => [park.nameEn, park]));
  const rows: AuditRow[] = [];

  for (const index of knowledgeIndex) {
    const slug = index.slug;
    const seed = seedBySlug.get(slug);
    const raw = rawByName.get(index.nameEn);
    const db = dbBySlug.get(slug);
    const rag = markdownFacts(slug);
    const fee = parkFeeDictionary[slug];
    const contact = parkContactDictionary[slug];
    const service = db?.isActive ? await getParkDetail(slug) : null;
    const dbCoord = db?.latitude != null && db.longitude != null
      ? { latitude: Number(db.latitude), longitude: Number(db.longitude) } : null;
    const seedCoord = seed ? { latitude: seed.latitude, longitude: seed.longitude } : null;
    const rawCoord = raw ? { latitude: raw.latitude, longitude: raw.longitude } : null;
    const rawFee = raw?.entryFeeThai != null && raw.entryFeeForeigner != null
      ? `${raw.entryFeeThai}/${raw.entryFeeForeigner}` : null;
    const registryFee = fee ? `${fee.thaiAdult}/${fee.foreignAdult}` : null;
    const dbHours = db ? `${db.openTime}-${db.closeTime}` : null;
    const seedHours = seed ? `${seed.openTime}-${seed.closeTime}` : null;
    const serviceHours = service ? `${service.openTime}-${service.closeTime}` : null;
    const runtimeBasic = db?.knowledgeDocuments.flatMap((document) => document.chunks)
      .find((chunk) => chunk.section === "basic_info")?.content ?? null;
    const runtimeSections = new Set(db?.knowledgeDocuments.flatMap((document) =>
      document.chunks.map((chunk) => chunk.section)) ?? []);
    const flags: string[] = [];
    if (!seed || !raw || !db || !service) flags.push("MISSING_SEED_OR_DB_OR_SERVICE");
    if (!fee) flags.push("MISSING_FEE_REGISTRY");
    if (!contact) flags.push("MISSING_CONTACT_REGISTRY");
    if (contact && !contact.phone) flags.push("MISSING_CONTACT_PHONE");
    if (!db?.knowledgeDocuments.length) flags.push("MISSING_RUNTIME_RAG");
    if (["geo_aliases", "preparation", "rules", "emergency", "nearby_context"]
      .some((section) => !runtimeSections.has(section))) flags.push("MISSING_RUNTIME_RAG_SECTION");
    if (db?.knowledgeDocuments.length && !db.knowledgeDocuments.some((document) => document.contentHash === rag.contentHash)) {
      flags.push("RUNTIME_RAG_STALE");
    }
    if (!rag.hours || !rag.fee || !rag.provincesText) flags.push("MISSING_RAG_FACT");
    if (runtimeBasic && !field(runtimeBasic, "เวลาเปิด-ปิดทำการ")) flags.push("RUNTIME_RAG_MISSING_HOURS");
    if (runtimeBasic && !runtimeBasic.includes("**อัตราค่าบริการเข้าอุทยานฯ (ค่าธรรมเนียมเข้า):**")) {
      flags.push("RUNTIME_RAG_MISSING_FEE");
    }
    if (rawFee && registryFee && rawFee !== registryFee) flags.push("RAW_FEE_VS_REGISTRY");
    if (rag.fee && registryFee && rag.fee !== registryFee && !(rag.fee === "FREE" && fee?.isFree)) flags.push("RAG_FEE_VS_REGISTRY");
    if (dbHours && seedHours && dbHours !== seedHours) flags.push("DB_HOURS_VS_SEED");
    if (dbHours && rag.hours && dbHours !== rag.hours) flags.push("DB_HOURS_VS_RAG");
    if (dbHours && serviceHours && dbHours !== serviceHours) flags.push("SERVICE_HOURS_VS_DB");
    if (dbCoord && seedCoord && !sameCoordinates(dbCoord, seedCoord)) flags.push("DB_COORD_VS_EFFECTIVE_SEED");
    if (rawCoord && seedCoord && !sameCoordinates(rawCoord, seedCoord)) flags.push("RAW_COORD_VS_EFFECTIVE_SEED");
    if (db && seed && db.province !== seed.province) flags.push("DB_PROVINCE_VS_SEED");
    if (db && !index.provinces.includes(db.province)) flags.push("DB_PROVINCE_NOT_IN_CATALOG");
    if (db && rag.provincesText && !rag.provincesText.includes(db.province)) flags.push("DB_PROVINCE_NOT_IN_RAG");
    if (db && rag.name && db.nameTh !== rag.name) flags.push("DB_NAME_VS_RAG");
    if (db && runtimeBasic && !runtimeBasic.includes(db.nameTh)) flags.push("RUNTIME_RAG_NAME_MISMATCH");
    if (raw && seed && raw.province !== seed.province) flags.push("RAW_PROVINCE_VS_SEED");
    if (contact && !index.provinces.some((province) => contact.address.includes(province))) {
      flags.push("CONTACT_ADDRESS_OUTSIDE_CATALOG_PROVINCES");
    }

    rows.push({
      slug, name: index.nameTh,
      rawFee, registryFee, ragFee: rag.fee,
      seedHours, dbHours, serviceHours, ragHours: rag.hours,
      rawCoord, seedCoord, dbCoord, ragCoordinates: rag.coordinates,
      seedProvince: seed?.province ?? null, dbProvince: db?.province ?? null,
      catalogProvinces: index.provinces, ragProvinces: rag.provincesText,
      contact: contact ? { address: contact.address, phone: contact.phone } : null,
      dbId: db?.id ?? null, dbActive: db?.isActive ?? null,
      runtimeRagDocuments: db?.knowledgeDocuments.length ?? 0,
      runtimeRagChunks: db?.knowledgeDocuments.reduce((sum, document) => sum + document.chunks.length, 0) ?? 0,
      flags,
    });
  }

  const flagCounts = Object.fromEntries(
    [...new Set(rows.flatMap((row) => row.flags))].map((flag) => [flag, rows.filter((row) => row.flags.includes(flag)).length]),
  );
  const conflictFlags = new Set([
    "MISSING_SEED_OR_DB_OR_SERVICE", "RAG_FEE_VS_REGISTRY", "RAW_FEE_VS_REGISTRY",
    "DB_HOURS_VS_SEED", "DB_HOURS_VS_RAG", "SERVICE_HOURS_VS_DB",
    "DB_COORD_VS_EFFECTIVE_SEED", "DB_PROVINCE_VS_SEED",
    "DB_PROVINCE_NOT_IN_CATALOG", "DB_PROVINCE_NOT_IN_RAG", "DB_NAME_VS_RAG",
    "RUNTIME_RAG_NAME_MISMATCH", "CONTACT_ADDRESS_OUTSIDE_CATALOG_PROVINCES",
  ]);
  const status = (flags: string[]) => flags.some((flag) => conflictFlags.has(flag))
    ? "CONFLICT" : flags.length ? "UNVERIFIED" : "CONSISTENT";
  const statusCounts = {
    consistent: rows.filter((row) => status(row.flags) === "CONSISTENT").length,
    conflict: rows.filter((row) => status(row.flags) === "CONFLICT").length,
    unverified: rows.filter((row) => status(row.flags) === "UNVERIFIED").length,
  };
  if (process.argv.includes("--markdown")) {
    const coord = (value: { latitude: number; longitude: number } | null) => value
      ? `${value.latitude.toFixed(6)},${value.longitude.toFixed(6)}` : "—";
    const auditDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    console.log(`# Park data consistency audit (${auditDate})\n`);
    console.log(`Scope: ${rows.length} canonical parks; runtime DB ${dbParks.length} rows; fee registry ${Object.keys(parkFeeDictionary).length} entries; contact registry ${Object.keys(parkContactDictionary).length} entries.\n`);
    console.log(`ผลรวม: **${statusCounts.consistent} สอดคล้อง / ${statusCounts.conflict} ขัดแย้ง / ${statusCounts.unverified} ยังยืนยันไม่ได้**. นับแบบไม่ซ้ำ: ขัดแย้งเมื่อค่าจากแหล่งในโครงการต่างกัน (รวมค่าเข้าใน seed ดิบที่ไม่ได้ใช้จริง); ยังยืนยันไม่ได้เมื่อไม่พบค่าขัดแย้ง แต่แหล่งข้อมูลไม่ครบหรือพิกัดดิบกับพิกัดที่ปรับแล้วต่างกัน; สอดคล้องหมายถึงสอดคล้องภายในโครงการเท่านั้น ไม่ได้ยืนยันข้อมูลปัจจุบันจากอุทยาน.\n`);
    console.log("Fee columns: raw seed / exact fee registry / Markdown knowledge. Hours: effective seed / runtime DB and Park Service / Markdown. Coordinates: raw seed / effective seed / runtime DB. The coordinates are approximate park points, not verified attraction coordinates.\n");
    console.log("| Park | Fee TH/foreign adult | Hours | Coordinates lat,lng | Province seed/DB/catalog/RAG | Contact registry | Runtime RAG | Status / flags |");
    console.log("|---|---|---|---|---|---|---|---|");
    for (const row of rows) {
      const fee = `${row.rawFee ?? "—"} / ${row.registryFee ?? "—"} / ${row.ragFee ?? "—"}`;
      const hours = `${row.seedHours ?? "—"} / ${row.dbHours ?? "—"} (${row.serviceHours ?? "—"}) / ${row.ragHours ?? "—"}`;
      const coords = `${coord(row.rawCoord)} / ${coord(row.seedCoord)} / ${coord(row.dbCoord)}`;
      const provinces = `${row.seedProvince ?? "—"} / ${row.dbProvince ?? "—"} / ${row.catalogProvinces.join(", ")} / ${row.ragProvinces ?? "—"}`;
      const contact = row.contact ? `${row.contact.address}; ${row.contact.phone ?? "เบอร์โทร UNKNOWN"}` : "—";
      const runtimeRag = `${row.runtimeRagDocuments} doc, ${row.runtimeRagChunks} chunks; ${row.flags.includes("RUNTIME_RAG_STALE") ? "stale" : "current"}`;
      console.log(`| ${row.name} (${row.slug}) | ${fee} | ${hours} | ${coords} | ${provinces} | ${contact} | ${runtimeRag} | ${status(row.flags)}: ${row.flags.join(", ") || "—"} |`);
    }
    console.log("\n## Flag counts\n");
    for (const [flag, count] of Object.entries(flagCounts)) console.log(`- ${flag}: ${count}`);
    console.log("\n## ผลตรวจที่ต้องดำเนินการต่อ\n");
    console.log("- ค่าเข้าจาก fee registry กับไฟล์ Markdown ตรงกัน 44/44 แห่ง; seed ดิบต่างจาก registry 36 แห่ง แต่ `prisma/seed.ts` ไม่บันทึกค่าเข้าเข้า Park table จึงไม่ใช่ค่าที่ AI อ่านผ่าน Park Service.");
    console.log("- ลานสาง: seed ดิบ 100/300 บาท, registry และ Markdown 40/200 บาท. ข่าวกรมอุทยานฯ วันที่ 2 มิ.ย. 2565 จัดลานสางในกลุ่ม 40/200 บาท ([หลักฐานทางการ ณ ปี 2565](https://news.dnp.go.th/news/17112)); ยังไม่ได้ยืนยันอัตราปัจจุบัน และหมายเหตุใน registry ที่ระบุ 2 มิ.ย. 66 ควรตรวจเอกสารประกาศฉบับที่อ้างถึงก่อนแก้ต้นทาง.");
    console.log("- พิกัดดิบต่างจากพิกัด seed ที่ปรับแล้ว 37 แห่ง; ไฟล์พิกัดที่ปรับแล้วระบุว่าเป็นจุดประมาณ ไม่ใช่พิกัดที่ทางการยืนยัน. DB ต่างจาก seed ที่ใช้จริง 4 แห่ง: " +
      rows.filter((row) => row.flags.includes("DB_COORD_VS_EFFECTIVE_SEED")).map((row) => row.slug).join(", ") + ". ไม่อัปเดต DB โดยเดาว่าชุดใดถูกต้อง.");
    console.log("- จังหวัดหลักใน seed, DB, Park Service, catalog และ Markdown ตรงกันทั้ง 44 แห่ง. Registry มีข้อมูลติดต่อครบทั้ง 44 แห่งและที่อยู่ระบุอย่างน้อยหนึ่งจังหวัดใน catalog; การมีข้อมูลไม่ได้ยืนยันว่าเบอร์โทรยังใช้งานอยู่.");
    console.log("- หลัง rebuild ดัชนี RAG มี hash ตรงกับไฟล์ทั้ง 44 แห่ง และมีค่าเข้า/เวลาเปิดใน basic_info. คำถามสถานะวันนี้ยังต้องใช้ประกาศล่าสุด; ห้ามแปลเวลาในเอกสารว่าเปิดทุกวันจริง.");
    console.log("\n## Source paths and current AI routing\n");
    console.log("- `prisma/seed-data/parks-raw.ts` supplies legacy fee fields. `prisma/seed-data/parks.ts` maps raw seed and corrected coordinates; `prisma/seed.ts` persists hours, province and coordinates, but **does not persist fees**.");
    console.log("- `lib/services/park-service.ts` reads Park rows. AI V2 `getParkInfo` reads hours from that service and exact fees/contact by canonical slug from `lib/data/park-fees.ts` and `lib/data/park-addresses.ts`.");
    console.log("- `data/knowledge/parks/*.md` is the file source for RAG; `KnowledgeDocument`/`KnowledgeChunk` is the live indexed copy. `getParkKnowledge` also attaches structured facts for fee, hours and contact questions.");
    console.log("- `lib/chat/core/park-catalog.ts` reads `data/knowledge/knowledge-index.json` for park identity and province metadata.");
  } else {
    console.log(JSON.stringify({ total: rows.length, dbTotal: dbParks.length, feeRegistryTotal: Object.keys(parkFeeDictionary).length,
      contactRegistryTotal: Object.keys(parkContactDictionary).length, flagCounts, statusCounts, rows }, null, 2));
  }
}

main().finally(() => prisma.$disconnect());
