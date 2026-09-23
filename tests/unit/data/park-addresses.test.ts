import { describe, expect, it } from "vitest";

import { formatPhoneString, getParkContactInfo, getPrimaryPhone } from "@/lib/data/park-addresses";

describe("park contact info", () => {
  it("returns curated contact info for Khun Chae National Park with formatted phone numbers and Facebook URL", () => {
    const info = getParkContactInfo("khun-chae", "อุทยานแห่งชาติขุนแจ", "เชียงราย");
    expect(info.address).toContain("เวียงป่าเป้า");
    expect(info.address).toContain("เชียงราย");
    expect(info.phone).toBe("053-711-402, 084-366-6210");
    expect(info.facebookUrl).toBe("https://www.facebook.com/KhunChaeNationalPark");
    expect(info.facebookName).toContain("ขุนแจ");
  });

  it("returns curated contact info for Namtok Pha Charoen National Park", () => {
    const info = getParkContactInfo("namtok-pha-charoen", "อุทยานแห่งชาติน้ำตกพาเจริญ", "ตาก");
    expect(info.address).toContain("พบพระ");
    expect(info.address).toContain("ตาก");
    expect(info.phone).toBe("055-508-922");
    expect(info.facebookUrl).toBe("https://www.facebook.com/pacharoenwaterfall/?locale=th_TH");
  });

  it("returns curated contact info for Doi Inthanon and Nam Nao", () => {
    const doiInthanon = getParkContactInfo("doi-inthanon", "อุทยานแห่งชาติดอยอินทนนท์", "เชียงใหม่");
    expect(doiInthanon.address).toContain("จอมทอง");
    expect(doiInthanon.phone).toContain("053-286-729");
    expect(doiInthanon.facebookUrl).toBe("https://www.facebook.com/DoiInthanonNationalPark");

    const namNao = getParkContactInfo("nam-nao", "อุทยานแห่งชาติน้ำหนาว", "เพชรบูรณ์");
    expect(namNao.address).toContain("น้ำหนาว");
    expect(namNao.phone).toContain("056-810-724");
    expect(namNao.facebookUrl).toBe("https://www.facebook.com/NamnaoNP5/?locale=th_TH");
  });

  it("returns empty facebookUrl and informative description for Doi Pha Klong", () => {
    const doiPhaKlong = getParkContactInfo("doi-pha-klong", "อุทยานแห่งชาติดอยผากลอง", "แพร่");
    expect(doiPhaKlong.address).toContain("ลอง");
    expect(doiPhaKlong.phone).toContain("097-923-0491");
    expect(doiPhaKlong.facebookUrl).toBe("");
    expect(doiPhaKlong.facebookName).toContain("ยังไม่มี Facebook แฟนเพจอย่างเป็นทางการ");
  });

  it("extracts primary phone number correctly for mobile dialing", () => {
    expect(getPrimaryPhone("053-286-729, 053-286-730")).toBe("053286729");
    expect(getPrimaryPhone(undefined)).toBeUndefined();
  });

  it("formats 9 and 10 digit phone strings accurately", () => {
    expect(formatPhoneString("055766002")).toBe("055-766-002");
    expect(formatPhoneString("0843666210")).toBe("084-366-6210");
  });

  it("returns fallback contact info and Facebook search URL for unknown park slug", () => {
    const info = getParkContactInfo("unknown-slug", "อุทยานแห่งชาติทดสอบ", "เชียงใหม่");
    expect(info.address).toBe("อุทยานแห่งชาติทดสอบ จังหวัดเชียงใหม่");
    expect(info.phone).toContain("053-000-000");
    expect(info.facebookUrl).toContain("facebook.com/search");
  });
});
