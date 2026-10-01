import { describe, expect, it } from "vitest";
import { getCleanParkName } from "@/components/parks/park-official-channel-banner";
import { getParkContactInfo } from "@/lib/data/park-addresses";

describe("ParkOfficialChannelBanner helpers", () => {
  it("formats park name with อุทยานแห่งชาติ prefix properly", () => {
    expect(getCleanParkName("ดอยอินทนนท์")).toBe("อุทยานแห่งชาติดอยอินทนนท์");
    expect(getCleanParkName("อุทยานแห่งชาติคลองวังเจ้า")).toBe("อุทยานแห่งชาติคลองวังเจ้า");
  });

  it("retrieves the direct official Facebook URL for known parks", () => {
    const contactInfo = getParkContactInfo("khlong-wang-chao", "คลองวังเจ้า", "กำแพงเพชร");
    expect(contactInfo.facebookUrl).toBe("https://www.facebook.com/Khlongwangchao");
    expect(contactInfo.facebookName).toBe("อุทยานแห่งชาติคลองวังเจ้า - Khlong Wang Chao National Park");
  });

  it("retrieves direct official Facebook URL for Doi Inthanon", () => {
    const contactInfo = getParkContactInfo("doi-inthanon", "ดอยอินทนนท์", "เชียงใหม่");
    expect(contactInfo.facebookUrl).toBe("https://www.facebook.com/DoiInthanonNationalPark");
  });
});
