import { describe, expect, it } from "vitest";
import {
  provinceCoordinates,
  getProvinceCoordinate,
  calculateHaversineDistanceKm,
} from "@/lib/data/province-coordinates";
import { findNearbyParksFromOrigin } from "@/lib/services/province-route-service";

describe("province-coordinates", () => {
  it("contains all 77 provinces with valid lat/lon and zoom", () => {
    expect(provinceCoordinates.length).toBe(77);
    provinceCoordinates.forEach((prov) => {
      expect(prov.id).toBeGreaterThan(0);
      expect(prov.name.length).toBeGreaterThan(0);
      expect(prov.lat).toBeGreaterThan(5);
      expect(prov.lat).toBeLessThan(21);
      expect(prov.lng).toBeGreaterThan(97);
      expect(prov.lng).toBeLessThan(106);
    });
  });

  it("finds province by full and partial name matching", () => {
    const bkk = getProvinceCoordinate("กรุงเทพมหานคร");
    expect(bkk?.name).toBe("กรุงเทพมหานคร");
    expect(bkk?.lat).toBeCloseTo(13.727, 2);

    const kpp = getProvinceCoordinate("กำแพงเพชร");
    expect(kpp?.name).toBe("กำแพงเพชร");

    const cm = getProvinceCoordinate("เชียงใหม่");
    expect(cm?.name).toBe("เชียงใหม่");

    // Partial lookup
    const foundKpp = getProvinceCoordinate("เดินทางจาก กำแพงเพชร");
    expect(foundKpp?.name).toBe("กำแพงเพชร");
  });

  it("calculates haversine distance correctly between Chiang Mai and Chiang Rai", () => {
    const cm = getProvinceCoordinate("เชียงใหม่")!;
    const cr = getProvinceCoordinate("เชียงราย")!;
    const dist = calculateHaversineDistanceKm(cm.lat, cm.lng, cr.lat, cr.lng);
    // Straight line distance CM to CR is around 150-160 km
    expect(dist).toBeGreaterThan(140);
    expect(dist).toBeLessThan(180);
  });
});

describe("province-route-service", () => {
  it("finds nearby parks from origin province and estimates travel times", () => {
    const result = findNearbyParksFromOrigin("กำแพงเพชร", 5);
    expect(result).not.toBeNull();
    expect(result?.originName).toContain("กำแพงเพชร");
    expect(result!.parks.length).toBeGreaterThan(0);
    expect(result!.parks[0].distanceKm).toBeGreaterThan(0);
    expect(result!.parks[0].estimatedDrivingMinutes).toBeGreaterThan(0);
    expect(result!.parks[0].nameTh).toBeDefined();
  });

  it("returns closest parks when origin is Chiang Mai", () => {
    const result = findNearbyParksFromOrigin("เชียงใหม่", 3);
    expect(result).not.toBeNull();
    expect(result!.parks.length).toBe(3);
    // Closest parks to Chiang Mai center (e.g. Doi Suthep) should be close
    expect(result!.parks[0].distanceKm).toBeLessThan(100);
  });
});
