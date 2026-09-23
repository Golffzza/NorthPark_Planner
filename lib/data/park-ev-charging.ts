export type ParkEvChargingStatus = "NEARBY" | "NONE";

export type ParkEvChargingInfo = {
  hasEvCharger: boolean;
  status: ParkEvChargingStatus;
  badgeLabel: string;
  badgeIcon: string;
  title: string;
  description: string;
  chargerType?: string;
  locationHint?: string;
  provider?: string;
};

export const DEFAULT_NO_EV_CHARGING: ParkEvChargingInfo = {
  hasEvCharger: false,
  status: "NONE",
  badgeLabel: "ยังไม่มีจุดชาร์จ",
  badgeIcon: "⚡",
  title: "ยังไม่มีจุดชาร์จ EV บริเวณใกล้เคียง",
  description: "แนะนำชาร์จแบตเตอรี่ให้เต็มจากตัวเมืองหรืออำเภอหลักก่อนเริ่มเดินทางขึ้นเขา",
};

export const PARK_EV_CHARGING_REGISTRY: Record<string, ParkEvChargingInfo> = {
  // 1. ดอยอินทนนท์ - จุดชาร์จหลักอยู่ที่ อ.จอมทอง ก่อนขึ้นดอย
  "doi-inthanon": {
    hasEvCharger: true,
    status: "NEARBY",
    badgeLabel: "มีจุดชาร์จ EV บริเวณใกล้เคียง",
    badgeIcon: "⚡",
    title: "มีจุดชาร์จ EV บริเวณใกล้เคียง (อ.จอมทอง / เชิงดอย)",
    description: "มีสถานีชาร์จเร็ว PEA VOLTA และ EV Station ปตท. จอมทอง (ก่อนขึ้นดอยอินทนนท์) แนะนำชาร์จให้เต็มก่อนขึ้นเขา",
    chargerType: "DC Fast Charge (CCS2 120kW)",
    locationHint: "ปั๊ม ปตท. จอมทอง / เชิงทางขึ้นดอยอินทนนท์",
    provider: "PEA VOLTA / EV Station Plz",
  },
  // 2. ดอยสุเทพ-ปุย - จุดชาร์จอยู่ที่เชิงดอย สวนสัตว์ และถนนห้วยแก้ว
  "doi-suthep-pui": {
    hasEvCharger: true,
    status: "NEARBY",
    badgeLabel: "มีจุดชาร์จ EV บริเวณใกล้เคียง",
    badgeIcon: "⚡",
    title: "มีจุดชาร์จ EV บริเวณใกล้เคียง (เชิงดอยสุเทพ / สวนสัตว์)",
    description: "มีสถานีชาร์จเร็วรองรับบริเวณเชิงดอยสุเทพ ลานจอดสวนสัตว์เชียงใหม่ และถนนห้วยแก้วก่อนขึ้นดอย",
    chargerType: "DC Fast Charge (CCS2) & AC Type 2",
    locationHint: "เชิงดอยสุเทพ / สวนสัตว์เชียงใหม่ / ปตท. ห้วยแก้ว",
    provider: "PEA VOLTA / EA Anywhere / EV Station",
  },
  // 3. แจ้ซ้อน - จุดชาร์จอยู่ที่ตัว อ.เมืองปาน / แจ้ห่ม
  "chae-son": {
    hasEvCharger: true,
    status: "NEARBY",
    badgeLabel: "มีจุดชาร์จ EV บริเวณใกล้เคียง",
    badgeIcon: "⚡",
    title: "มีจุดชาร์จ EV บริเวณใกล้เคียง (อ.เมืองปาน / แจ้ห่ม)",
    description: "มีสถานีชาร์จเร็ว PEA VOLTA ในพื้นที่ อ.เมืองปาน และ อ.แจ้ห่ม ก่อนเลี้ยวเข้าสู่อุทยานฯ",
    chargerType: "DC Fast Charge (CCS2 50kW) & AC Type 2",
    locationHint: "ตัวอำเภอเมืองปาน / อ.แจ้ห่ม (ลำปาง)",
    provider: "PEA VOLTA",
  },
  // 4. คลองลาน - จุดชาร์จใกล้เคียง อ.คลองลาน
  "khlong-lan": {
    hasEvCharger: true,
    status: "NEARBY",
    badgeLabel: "มีจุดชาร์จ EV บริเวณใกล้เคียง",
    badgeIcon: "⚡",
    title: "มีจุดชาร์จ EV บริเวณใกล้เคียง (อ.คลองลาน)",
    description: "มีสถานีชาร์จเร็วบริเวณปั๊ม ปตท. คลองลานพัฒนา (ห่างจากที่ทำการอุทยานฯ ~7 กม.)",
    chargerType: "DC Fast Charge (CCS2 120kW)",
    locationHint: "ปั๊ม ปตท. คลองลานพัฒนา (~7 กม.)",
    provider: "EV Station Plz / PEA VOLTA",
  },
  // 5. ดอยผ้าห่มปก - จุดชาร์จใกล้เคียง อ.ฝาง
  "doi-pha-hom-pok": {
    hasEvCharger: true,
    status: "NEARBY",
    badgeLabel: "มีจุดชาร์จ EV บริเวณใกล้เคียง",
    badgeIcon: "⚡",
    title: "มีจุดชาร์จ EV บริเวณใกล้เคียง (อ.ฝาง)",
    description: "มีสถานีชาร์จ DC Fast Charge บริเวณตัวอำเภอฝาง (ห่างจากศูนย์บริการบ่อน้ำร้อน ~8 กม.)",
    chargerType: "DC Fast Charge (CCS2 120kW)",
    locationHint: "ปั๊ม ปตท. ฝาง / ตัวอำเภอฝาง (~8 กม.)",
    provider: "PEA VOLTA / EV Station Plz",
  },
  // 6. ออบหลวง - จุดชาร์จใกล้เคียง อ.ฮอด
  "ob-luang": {
    hasEvCharger: true,
    status: "NEARBY",
    badgeLabel: "มีจุดชาร์จ EV บริเวณใกล้เคียง",
    badgeIcon: "⚡",
    title: "มีจุดชาร์จ EV บริเวณใกล้เคียง (อ.ฮอด)",
    description: "มีสถานีชาร์จเร็ว PEA VOLTA บริเวณวงเวียนหอนาฬิกาฮอด / ปั๊ม ปตท. ฮอด (ห่าง ~14 กม.)",
    chargerType: "DC Fast Charge (CCS2)",
    locationHint: "ปั๊ม ปตท. ฮอด / วงเวียนฮอด (~14 กม.)",
    provider: "PEA VOLTA",
  },
  // 7. ศรีลานนา - จุดชาร์จใกล้เคียง อ.แม่แตง
  "sri-lanna": {
    hasEvCharger: true,
    status: "NEARBY",
    badgeLabel: "มีจุดชาร์จ EV บริเวณใกล้เคียง",
    badgeIcon: "⚡",
    title: "มีจุดชาร์จ EV บริเวณใกล้เคียง (อ.แม่แตง)",
    description: "มีสถานีชาร์จเร็ว PEA VOLTA ปั๊ม ปตท. แม่แตง (ห่างจากที่ทำการเขื่อนแม่งัด ~10 กม.)",
    chargerType: "DC Fast Charge (CCS2 120kW)",
    locationHint: "ปั๊ม ปตท. แม่แตง ก่อนเลี้ยวเข้าเขื่อนแม่งัด (~10 กม.)",
    provider: "EV Station Plz / PEA VOLTA",
  },
  // 8. ดอยหลวง - จุดชาร์จใกล้เคียง อ.เวียงป่าเป้า / แม่ขะจาน
  "doi-luang": {
    hasEvCharger: true,
    status: "NEARBY",
    badgeLabel: "มีจุดชาร์จ EV บริเวณใกล้เคียง",
    badgeIcon: "⚡",
    title: "มีจุดชาร์จ EV บริเวณใกล้เคียง (อ.เวียงป่าเป้า/แม่ขะจาน)",
    description: "มีสถานีชาร์จเร็ว ปั๊ม ปตท. แม่ขะจาน และ ปตท. เวียงป่าเป้า (ห่างทางขึ้นอุทยาน ~15-20 กม.)",
    chargerType: "DC Fast Charge (CCS2)",
    locationHint: "ปั๊ม ปตท. แม่ขะจาน และ ปตท. เวียงป่าเป้า",
    provider: "EV Station Plz",
  },
  // 9. ทุ่งแสลงหลวง - จุดชาร์จใกล้เคียง เขาค้อ / ทรัพย์พุทรา
  "thung-salaeng-luang": {
    hasEvCharger: true,
    status: "NEARBY",
    badgeLabel: "มีจุดชาร์จ EV บริเวณใกล้เคียง",
    badgeIcon: "⚡",
    title: "มีจุดชาร์จ EV บริเวณใกล้เคียง (เขาค้อ / วังทอง)",
    description: "มีสถานีชาร์จ DC Fast Charge ปั๊ม ปตท. แคมป์สน เขาค้อ และ ปตท. วังทอง",
    chargerType: "DC Fast Charge (CCS2 120kW)",
    locationHint: "ปั๊ม ปตท. แคมป์สน เขาค้อ / ปตท. วังทอง",
    provider: "EV Station Plz / PEA VOLTA",
  },
  // 10. ภูหินร่องกล้า - จุดชาร์จใกล้เคียง อ.นครไทย / เขาค้อ
  "phu-hin-rong-kla": {
    hasEvCharger: true,
    status: "NEARBY",
    badgeLabel: "มีจุดชาร์จ EV บริเวณใกล้เคียง",
    badgeIcon: "⚡",
    title: "มีจุดชาร์จ EV บริเวณใกล้เคียง (อ.นครไทย)",
    description: "มีสถานีชาร์จเร็วบริเวณ อ.นครไทย ก่อนขึ้นเขาภูหินร่องกล้า (~25 กม.)",
    chargerType: "DC Fast Charge (CCS2)",
    locationHint: "ปั๊ม ปตท. นครไทย ก่อนขึ้นอุทยานฯ",
    provider: "PEA VOLTA",
  },
  // 11. ดอยขุนตาล - จุดชาร์จใกล้เคียง อ.แม่ทา / ห้างฉัตร
  "doi-khun-tan": {
    hasEvCharger: true,
    status: "NEARBY",
    badgeLabel: "มีจุดชาร์จ EV บริเวณใกล้เคียง",
    badgeIcon: "⚡",
    title: "มีจุดชาร์จ EV บริเวณใกล้เคียง (อ.แม่ทา / ห้างฉัตร)",
    description: "มีสถานีชาร์จเร็วบนถนนสายเอเชีย ปั๊ม ปตท. แม่ทา ลำพูน และ ปตท. ห้างฉัตร ลำปาง",
    chargerType: "DC Fast Charge (CCS2)",
    locationHint: "ปั๊ม ปตท. แม่ทา (ลำพูน) / ปตท. ห้างฉัตร (ลำปาง)",
    provider: "PEA VOLTA / EV Station Plz",
  },
};

export function getParkEvCharging(slugOrName: string, nameTh?: string): ParkEvChargingInfo {
  if (!slugOrName) return DEFAULT_NO_EV_CHARGING;

  const key = slugOrName.toLowerCase().trim();
  if (PARK_EV_CHARGING_REGISTRY[key]) {
    return PARK_EV_CHARGING_REGISTRY[key];
  }

  // Check matching by Thai name
  for (const [k, value] of Object.entries(PARK_EV_CHARGING_REGISTRY)) {
    if (nameTh && (nameTh.includes(k) || k.includes(nameTh))) {
      return value;
    }
  }

  return DEFAULT_NO_EV_CHARGING;
}
