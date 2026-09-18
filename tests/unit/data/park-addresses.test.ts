import { describe, expect, it } from "vitest";

import { formatPhoneString, getParkContactInfo } from "@/lib/data/park-addresses";

describe("park contact info", () => {
  it("returns curated contact info for Khun Chae National Park with formatted phone numbers", () => {
    const info = getParkContactInfo("khun-chae", "อุทยานแห่งชาติขุนแจ", "เชียงราย");
    expect(info.address).toContain("เวียงป่าเป้า");
    expect(info.address).toContain("เชียงราย");
    expect(info.phone).toBe("053-711-402, 084-366-6210");
  });

  it("returns curated contact info for Namtok Pha Charoen National Park", () => {
    const info = getParkContactInfo("namtok-pha-charoen", "อุทยานแห่งชาติน้ำตกพาเจริญ", "ตาก");
    expect(info.address).toContain("พบพระ");
    expect(info.address).toContain("ตาก");
    expect(info.phone).toBe("055-508-922");
  });

  it("returns curated contact info for Doi Inthanon and Nam Nao", () => {
    const doiInthanon = getParkContactInfo("doi-inthanon", "อุทยานแห่งชาติดอยอินทนนท์", "เชียงใหม่");
    expect(doiInthanon.address).toContain("จอมทอง");
    expect(doiInthanon.phone).toContain("053-286-729");

    const namNao = getParkContactInfo("nam-nao", "อุทยานแห่งชาติน้ำหนาว", "เพชรบูรณ์");
    expect(namNao.address).toContain("น้ำหนาว");
    expect(namNao.phone).toContain("056-810-724");
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
