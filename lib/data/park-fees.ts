export type ParkVehicleFees = {
  car: number;
  motorcycle: number;
  bicycle: number;
  truck6Wheel: number;
  bus: number;
};

export type ParkFeeInfo = {
  pdfOrderNumber?: number;
  isFree?: boolean;
  thaiAdult: number;
  thaiChild: number;
  foreignAdult: number;
  foreignChild: number;
  vehicles: ParkVehicleFees;
  freeExemptions: string[];
  notes?: string;
};

export const defaultVehicleFees: ParkVehicleFees = {
  car: 30,
  motorcycle: 20,
  bicycle: 0,
  truck6Wheel: 100,
  bus: 200,
};

export const standardFreeExemptions = [
  "ผู้สูงอายุสัญชาติไทย (อายุ 60 ปีขึ้นไป)",
  "เด็กเล็ก (อายุต่ำกว่า 3 ปี)",
  "ผู้พิการ และพระภิกษุสงฆ์ / สามเณร",
];

/**
 * ข้อมูลอัตราค่าบริการสำหรับบุคคลในการเข้าไปในอุทยานแห่งชาติ
 * อ้างอิงตามประกาศกรมอุทยานแห่งชาติ สัตว์ป่า และพันธุ์พืช (ปรับปรุงข้อมูล ณ วันที่ 2 มิ.ย. 66)
 */
export const parkFeeDictionary: Record<string, ParkFeeInfo> = {
  // === ภาคเหนือ / ตาก / กำแพงเพชร ===
  "khlong-lan": {
    pdfOrderNumber: 102,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 102 (2 มิ.ย. 66)",
  },
  "khlong-wang-chao": {
    pdfOrderNumber: 103,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 103 (2 มิ.ย. 66)",
  },
  "mae-wong": {
    pdfOrderNumber: 104,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 104 (2 มิ.ย. 66)",
  },
  "lan-sang": {
    pdfOrderNumber: 126,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 126 (2 มิ.ย. 66)",
  },
  "namtok-pha-charoen": {
    pdfOrderNumber: 123,
    isFree: true,
    thaiAdult: 0,
    thaiChild: 0,
    foreignAdult: 0,
    foreignChild: 0,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "พื้นที่เตรียมการจัดตั้งอุทยานแห่งชาติ — ยังไม่เสียค่าบริการ (ลำดับที่ 123)",
  },
  "taksin-maharat": {
    pdfOrderNumber: 122,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 122 (2 มิ.ย. 66)",
  },
  "doi-soi-malai": {
    pdfOrderNumber: 128,
    isFree: true,
    thaiAdult: 0,
    thaiChild: 0,
    foreignAdult: 0,
    foreignChild: 0,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "พื้นที่เตรียมการจัดตั้งอุทยานแห่งชาติ — ยังไม่เสียค่าบริการ (ลำดับที่ 128)",
  },
  "mae-moei": {
    pdfOrderNumber: 124,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 124 (2 มิ.ย. 66)",
  },

  // === เชียงใหม่ ===
  "doi-inthanon": {
    pdfOrderNumber: 137,
    thaiAdult: 60,
    thaiChild: 30,
    foreignAdult: 300,
    foreignChild: 150,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 137 (2 มิ.ย. 66)",
  },
  "doi-suthep-pui": {
    pdfOrderNumber: 139,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 139 (2 มิ.ย. 66)",
  },
  "doi-pha-hom-pok": {
    pdfOrderNumber: 138,
    thaiAdult: 60,
    thaiChild: 30,
    foreignAdult: 300,
    foreignChild: 150,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 138 (2 มิ.ย. 66)",
  },
  "huai-nam-dang": {
    pdfOrderNumber: 141,
    thaiAdult: 60,
    thaiChild: 30,
    foreignAdult: 300,
    foreignChild: 150,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 141 (2 มิ.ย. 66)",
  },
  "si-lanna": {
    pdfOrderNumber: 142,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 142 (2 มิ.ย. 66)",
  },
  "sri-lanna": {
    pdfOrderNumber: 142,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 142 (2 มิ.ย. 66)",
  },
  "khun-khan": {
    pdfOrderNumber: 143,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 143 (2 มิ.ย. 66)",
  },
  "mae-wang": {
    pdfOrderNumber: 149,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 149 (2 มิ.ย. 66)",
  },
  "mae-takhrai": {
    pdfOrderNumber: 146,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 146 (2 มิ.ย. 66)",
  },
  "ob-luang": {
    pdfOrderNumber: 140,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 140 (2 มิ.ย. 66)",
  },

  // === เชียงราย ===
  "khun-chae": {
    pdfOrderNumber: 129,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 129 (2 มิ.ย. 66)",
  },
  "doi-luang": {
    pdfOrderNumber: 131,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 131 (2 มิ.ย. 66)",
  },

  // === ลำปาง / ลำพูน ===
  "chae-son": {
    pdfOrderNumber: 115,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 115 (2 มิ.ย. 66)",
  },
  "doi-jong": {
    pdfOrderNumber: 117,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 117 (2 มิ.ย. 66)",
  },
  "tham-pha-thai": {
    pdfOrderNumber: 118,
    isFree: true,
    thaiAdult: 0,
    thaiChild: 0,
    foreignAdult: 0,
    foreignChild: 0,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "พื้นที่เตรียมการจัดตั้งอุทยานแห่งชาติ — ยังไม่เสียค่าบริการ (ลำดับที่ 118)",
  },
  "doi-khun-tan": {
    pdfOrderNumber: 116,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 116 (2 มิ.ย. 66)",
  },
  "mae-ping": {
    pdfOrderNumber: 148,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 148 (2 มิ.ย. 66)",
  },

  // === แพร่ ===
  "mae-yom": {
    pdfOrderNumber: 106,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 106 (2 มิ.ย. 66)",
  },
  "wiang-kosai": {
    pdfOrderNumber: 107,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 107 (2 มิ.ย. 66)",
  },
  "doi-pha-klong": {
    pdfOrderNumber: 108,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 108 (2 มิ.ย. 66)",
  },

  // === น่าน ===
  "doi-phu-kha": {
    pdfOrderNumber: 105,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 105 (2 มิ.ย. 66)",
  },
  "khun-nan": {
    pdfOrderNumber: 109,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 109 (2 มิ.ย. 66)",
  },
  "mae-charim": {
    pdfOrderNumber: 113,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 113 (2 มิ.ย. 66)",
  },
  "nanthaburi": {
    pdfOrderNumber: 112,
    isFree: true,
    thaiAdult: 0,
    thaiChild: 0,
    foreignAdult: 0,
    foreignChild: 0,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "พื้นที่เตรียมการจัดตั้งอุทยานแห่งชาติ — ยังไม่เสียค่าบริการ (ลำดับที่ 112)",
  },
  "sri-nan": {
    pdfOrderNumber: 114,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 114 (2 มิ.ย. 66)",
  },

  // === พะเยา / แม่ฮ่องสอน ===
  "doi-phu-nang": {
    pdfOrderNumber: 130,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 130 (2 มิ.ย. 66)",
  },
  "namtok-mae-surin": {
    pdfOrderNumber: 155,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 155 (2 มิ.ย. 66)",
  },
  "salawin": {
    pdfOrderNumber: 152,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 152 (2 มิ.ย. 66)",
  },

  // === อุตรดิตถ์ / สุโขทัย ===
  "ton-sak-yai": {
    pdfOrderNumber: 98,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 98 (2 มิ.ย. 66)",
  },
  "lam-nam-nan": {
    pdfOrderNumber: 101,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 101 (2 มิ.ย. 66)",
  },
  "phu-soi-dao": {
    pdfOrderNumber: 95,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 95 (2 มิ.ย. 66)",
  },
  "ramkhamhaeng": {
    pdfOrderNumber: 125,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 125 (2 มิ.ย. 66)",
  },
  "si-satchanalai": {
    pdfOrderNumber: 127,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 127 (2 มิ.ย. 66)",
  },

  // === พิษณุโลก / เพชรบูรณ์ ===
  "phu-hin-rong-kla": {
    pdfOrderNumber: 94,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 94 (2 มิ.ย. 66)",
  },
  "thung-salaeng-luang": {
    pdfOrderNumber: 92,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 92 (2 มิ.ย. 66)",
  },
  "namtok-chat-trakan": {
    pdfOrderNumber: 100,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 100 (2 มิ.ย. 66)",
  },
  "nam-nao": {
    pdfOrderNumber: 93,
    thaiAdult: 40,
    thaiChild: 20,
    foreignAdult: 200,
    foreignChild: 100,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 93 (2 มิ.ย. 66)",
  },
  "tat-mok": {
    pdfOrderNumber: 99,
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อ้างอิงประกาศกรมอุทยานฯ ลำดับที่ 99 (2 มิ.ย. 66)",
  },
};

export function getParkFeeInfo(slug: string, nameTh?: string): ParkFeeInfo {
  // 1. Direct match by slug
  if (parkFeeDictionary[slug]) {
    return parkFeeDictionary[slug];
  }

  // 2. Keyword fallback matching from nameTh
  if (nameTh) {
    for (const [key, value] of Object.entries(parkFeeDictionary)) {
      if (nameTh.includes(key)) {
        return value;
      }
    }
  }

  // 3. General default (Thai: 20/10, Foreigner: 100/50, standard DNP tier)
  return {
    thaiAdult: 20,
    thaiChild: 10,
    foreignAdult: 100,
    foreignChild: 50,
    vehicles: defaultVehicleFees,
    freeExemptions: standardFreeExemptions,
    notes: "อัตราค่าบริการมาตรฐานตามประกาศกรมอุทยานแห่งชาติ สัตว์ป่า และพันธุ์พืช (DNP)",
  };
}
