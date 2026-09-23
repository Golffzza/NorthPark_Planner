import { describe, expect, it } from "vitest";

import { getParkEvCharging } from "@/lib/data/park-ev-charging";

describe("Park EV Charging Service & Registry", () => {
  it("should return NEARBY EV charging for Doi Inthanon", () => {
    const info = getParkEvCharging("doi-inthanon", "อุทยานแห่งชาติดอยอินทนนท์");
    expect(info.hasEvCharger).toBe(true);
    expect(info.status).toBe("NEARBY");
    expect(info.badgeLabel).toContain("บริเวณใกล้เคียง");
    expect(info.provider).toContain("PEA VOLTA");
  });

  it("should return NEARBY EV charging for Chae Son", () => {
    const info = getParkEvCharging("chae-son", "อุทยานแห่งชาติแจ้ซ้อน");
    expect(info.hasEvCharger).toBe(true);
    expect(info.status).toBe("NEARBY");
    expect(info.badgeLabel).toContain("บริเวณใกล้เคียง");
  });

  it("should return NEARBY EV charging for Khlong Lan", () => {
    const info = getParkEvCharging("khlong-lan", "อุทยานแห่งชาติคลองลาน");
    expect(info.hasEvCharger).toBe(true);
    expect(info.status).toBe("NEARBY");
    expect(info.badgeLabel).toContain("บริเวณใกล้เคียง");
  });

  it("should return DEFAULT_NO_EV_CHARGING for parks without verified EV chargers", () => {
    const info = getParkEvCharging("unknown-park", "อุทยานแห่งชาติที่ไม่ระบุ");
    expect(info.hasEvCharger).toBe(false);
    expect(info.status).toBe("NONE");
  });
});
