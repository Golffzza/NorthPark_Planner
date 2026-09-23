import { describe, expect, it } from "vitest";

import {
  formatMonthYear,
  formatThaiDate,
  fromYMD,
  getCalendarDays,
  normalizeYMD,
  toYMD,
} from "@/lib/date";

describe("Thai Date Utilities (lib/date.ts)", () => {
  it("normalizes Buddhist era year to CE year", () => {
    expect(normalizeYMD("2569-09-23")).toBe("2026-09-23");
    expect(normalizeYMD("2026-09-23")).toBe("2026-09-23");
  });

  it("converts between YMD string and Date correctly", () => {
    const d = fromYMD("2026-09-23");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8); // 0-indexed Sept
    expect(d.getDate()).toBe(23);
    expect(toYMD(d)).toBe("2026-09-23");
  });

  it("formats Thai Month and Year in Buddhist Era", () => {
    const d = new Date(2026, 8, 23);
    expect(formatMonthYear(d)).toBe("กันยายน 2569");
    expect(formatMonthYear(d, true)).toBe("ก.ย. 2569");
  });

  it("formats Thai Date full string with day of week", () => {
    const str = formatThaiDate("2026-09-23", { includeDay: true, includeYear: true });
    expect(str).toContain("23 กันยายน 2569");
    expect(str).toContain("วันพุธ");
  });

  it("generates calendar days grid with 42 cells", () => {
    const d = new Date(2026, 8, 1);
    const grid = getCalendarDays(d);
    expect(grid.length).toBe(42);
  });
});
