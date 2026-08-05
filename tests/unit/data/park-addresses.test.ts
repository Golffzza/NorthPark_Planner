import { describe, expect, it } from "vitest";

import { formatPhoneString, getParkContactInfo } from "@/lib/data/park-addresses";

describe("park contact info", () => {
  it("returns curated contact info for Khun Chae National Park with formatted phone numbers", () => {
    const info = getParkContactInfo("khun-chae", "อุทยานแห่งชาติขุนแจ", "เชียงราย");
    expect(info.address).toContain("เวียงป่าเป้า");
    expect(info.address).toContain("เชียงราย");
    expect(info.phone).toBe("053-711-402, 084-366-6210");
  });

  it("formats 9 and 10 digit phone strings accurately", () => {
    expect(formatPhoneString("055766002")).toBe("055-766-002");
    expect(formatPhoneString("0843666210")).toBe("084-366-6210");
  });

  it("returns fallback contact info for unknown park slug", () => {
    const info = getParkContactInfo("unknown-slug", "อุทยานแห่งชาติทดสอบ", "เชียงใหม่");
    expect(info.address).toBe("อุทยานแห่งชาติทดสอบ จังหวัดเชียงใหม่");
    expect(info.phone).toContain("053-000-000");
  });
});
