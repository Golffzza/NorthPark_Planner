import { describe, expect, it } from "vitest";

import { defaultVehicleFees, getParkFeeInfo, standardFreeExemptions } from "@/lib/data/park-fees";

describe("park fee info", () => {
  it("returns exact PDF rates for Doi Inthanon National Park (Order 137)", () => {
    const fee = getParkFeeInfo("doi-inthanon", "อุทยานแห่งชาติดอยอินทนนท์");
    expect(fee.pdfOrderNumber).toBe(137);
    expect(fee.thaiAdult).toBe(60);
    expect(fee.thaiChild).toBe(30);
    expect(fee.foreignAdult).toBe(300);
    expect(fee.foreignChild).toBe(150);
    expect(fee.vehicles.car).toBe(30);
    expect(fee.vehicles.motorcycle).toBe(20);
    expect(fee.vehicles.bicycle).toBe(0);
    expect(fee.vehicles.truck6Wheel).toBe(100);
    expect(fee.vehicles.bus).toBe(200);
    expect(fee.freeExemptions).toEqual(standardFreeExemptions);
  });

  it("returns exact PDF rates for Doi Suthep-Pui National Park (Order 139)", () => {
    const fee = getParkFeeInfo("doi-suthep-pui", "อุทยานแห่งชาติดอยสุเทพ-ปุย");
    expect(fee.pdfOrderNumber).toBe(139);
    expect(fee.thaiAdult).toBe(20);
    expect(fee.thaiChild).toBe(10);
    expect(fee.foreignAdult).toBe(100);
    expect(fee.foreignChild).toBe(50);
    expect(fee.vehicles).toEqual(defaultVehicleFees);
  });

  it("returns exact PDF rates for Khlong Lan National Park (Order 102)", () => {
    const fee = getParkFeeInfo("khlong-lan", "อุทยานแห่งชาติคลองลาน");
    expect(fee.pdfOrderNumber).toBe(102);
    expect(fee.thaiAdult).toBe(40);
    expect(fee.thaiChild).toBe(20);
    expect(fee.foreignAdult).toBe(200);
    expect(fee.foreignChild).toBe(100);
  });

  it("returns free status for Doi Soi Malai National Park (Order 128 - เตรียมการฯ)", () => {
    const fee = getParkFeeInfo("doi-soi-malai", "อุทยานแห่งชาติดอยสอยมาลัย-ไม้กลายเป็นหิน");
    expect(fee.pdfOrderNumber).toBe(128);
    expect(fee.isFree).toBe(true);
    expect(fee.thaiAdult).toBe(0);
    expect(fee.foreignAdult).toBe(0);
  });

  it("returns fallback park fee info for any unknown park slug", () => {
    const fee = getParkFeeInfo("unknown-slug");
    expect(fee.thaiAdult).toBeGreaterThan(0);
    expect(fee.foreignAdult).toBeGreaterThan(0);
    expect(fee.vehicles.car).toBe(30);
    expect(fee.freeExemptions.length).toBeGreaterThan(0);
  });
});
