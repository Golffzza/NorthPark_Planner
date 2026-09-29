// ./lib/chat-v2/tools/search-parks.ts

import { tool } from "ai";
import { z } from "zod";

import { getParkCatalog } from "@/lib/chat/core/park-catalog";
import type { SearchParksResult } from "@/lib/chat-v2/shared/contracts";
import { toParkSummary } from "@/lib/chat-v2/tools/park-resolution";

export const searchParksInputSchema = z.object({
  province: z.string().trim().optional()
    .describe("จังหวัดที่ผู้ใช้ระบุ หรือเว้นว่างเมื่อต้องการทั้งฐานข้อมูล"),
});

export type SearchParksInput = z.infer<typeof searchParksInputSchema>;

type SearchParksDependencies = {
  getParkCatalog: typeof getParkCatalog;
};

export function executeSearchParks(
  input: SearchParksInput,
  dependencies: SearchParksDependencies = { getParkCatalog },
): SearchParksResult {
  const catalog = dependencies.getParkCatalog();
  const province = input.province?.trim() || undefined;
  const matchingParks = province
    ? catalog.filter((park) => park.provinces.includes(province))
    : catalog;

  return {
    scope: province ? "PROVINCE" : "ALL",
    coverage: "NORTHPARK_CATALOG",
    coverageNote: province
      ? "ผลลัพธ์นี้แสดงเฉพาะข้อมูลที่มีในฐานข้อมูล NorthPark"
      : "จำนวนนี้เป็นจำนวนรายการในฐานข้อมูล NorthPark ไม่ใช่จำนวนอุทยานทั้งประเทศไทย",
    ...(province ? { province } : {}),
    count: matchingParks.length,
    parks: matchingParks.map(toParkSummary),
  };
}

export function createSearchParksTool() {
  return tool({
    description:
      "ต้องใช้เฉพาะเมื่อนับหรือแสดงรายชื่ออุทยาน NorthPark ทั้งหมดหรือตามจังหวัด ห้ามใช้เมื่อผู้ใช้ถามจังหวัดของอุทยานที่ระบุชื่อ และไม่ใช้สำหรับขอคำแนะนำ",
    inputSchema: searchParksInputSchema,
    execute: async (input) => executeSearchParks(input),
  });
}
