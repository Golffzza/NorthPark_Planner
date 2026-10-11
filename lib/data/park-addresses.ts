export type ParkContactInfo = {
  address: string;
  phone?: string;
  facebookUrl?: string;
  facebookName?: string;
  websiteUrl?: string;
  googleMapsUrl?: string;
};

export function formatPhoneString(phoneStr?: string): string {
  if (!phoneStr) return "";

  // Split multiple phone numbers by comma or slash
  const parts = phoneStr.split(/[,/]/);

  const formattedParts = parts.map((part) => {
    // Extract digits only
    const digits = part.replace(/\D/g, "");

    // 10-digit phone number (mobile or 10-digit format): 084-366-6210 (3-3-4)
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // 9-digit landline number: 053-711-402 (3-3-3)
    if (digits.length === 9) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // Default cleanup
    return part.trim().replace(/\s+/g, "-");
  });

  return formattedParts.join(", ");
}

export function getPrimaryPhone(phoneStr?: string): string | undefined {
  if (!phoneStr) return undefined;
  const parts = phoneStr.split(/[,/]/);
  if (parts.length === 0) return undefined;
  const digits = parts[0].replace(/\D/g, "");
  return digits.length > 0 ? digits : undefined;
}

export const parkContactDictionary: Record<string, ParkContactInfo> = {
  // === กำแพงเพชร ===
  "khlong-lan": {
    address: "หมู่ 2 ตำบลคลองลานพัฒนา อำเภอคลองลาน จังหวัดกำแพงเพชร 62180",
    phone: "088-407-9915",
    facebookUrl: "https://www.facebook.com/KhlongLanNationalPark",
    facebookName: "อุทยานแห่งชาติคลองลาน - Khlong Lan National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "khlong-wang-chao": {
    address: "หมู่ 3 ตำบลโป่งน้ำร้อน อำเภอคลองลาน จังหวัดกำแพงเพชร 62180",
    phone: "093-790-0935",
    facebookUrl: "https://www.facebook.com/Khlongwangchao",
    facebookName: "อุทยานแห่งชาติคลองวังเจ้า - Khlong Wang Chao National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "mae-wong": {
    address: "กม. 65 ถนนคลองลาน-อุ้มผาง ตำบลปางตาไว อำเภอปางศิลาทอง จังหวัดกำแพงเพชร 62120",
    phone: "090-457-9291, 098-797-3197",
    facebookUrl: "https://www.facebook.com/maewong.np",
    facebookName: "อุทยานแห่งชาติแม่วงก์ Mae Wong National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },

  // === ตาก ===
  "lan-sang": {
    address: "หมู่ 10 ตำบลแม่ท้อ อำเภอเมืองตาก จังหวัดตาก 63000",
    phone: "055-894-640, 086-443-3010, 082-890-1778",
    facebookUrl: "https://www.facebook.com/lansangnationalpark",
    facebookName: "อุทยานแห่งชาติลานสาง - Lan Sang National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "namtok-pha-charoen": {
    address: "หมู่ 6 ตำบลช่องแคบ อำเภอพบพระ จังหวัดตาก 63160",
    phone: "055-508-922, 055-030-178",
    facebookUrl: "https://www.facebook.com/pacharoenwaterfall/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติน้ำตกพาเจริญ - Namtok Pha Charoen National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "taksin-maharat": {
    address: "หมู่ 9 ถนนสายตาก-แม่สอด (กม. 26) ตำบลแม่ท้อ อำเภอเมืองตาก จังหวัดตาก 63000",
    phone: "055-511-429",
    facebookUrl: "https://www.facebook.com/NationalPark.taksin/",
    facebookName: "อุทยานแห่งชาติตากสินมหาราช - Taksin Maharat National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "doi-soi-malai": {
    address: "ตำบลตากตก อำเภอบ้านตาก จังหวัดตาก 63120",
    phone: "091-837-2930",
    facebookUrl: "https://www.facebook.com/p/%E0%B8%AD%E0%B8%B8%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%99%E0%B9%81%E0%B8%AB%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4%E0%B8%94%E0%B8%AD%E0%B8%A2%E0%B8%AA%E0%B8%AD%E0%B8%A2%E0%B8%A1%E0%B8%B2%E0%B8%A5%E0%B8%B1%E0%B8%A2-%E0%B9%84%E0%B8%A1%E0%B9%89%E0%B8%81%E0%B8%A5%E0%B8%B2%E0%B8%A2%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B8%AB%E0%B8%B4%E0%B8%99-Doi-Soi-Malai-National-Park-61557645725353/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติดอยสอยมาลัย - ไม้กลายเป็นหิน - Doi Soi Malai National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "mae-moei": {
    address: "หมู่ 2 ตำบลแม่สอง อำเภอท่าสองยาง จังหวัดตาก 63150",
    phone: "061-352-3703",
    facebookUrl: "https://www.facebook.com/MaeMoeiNationalPark/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติแม่เมย - Mae Moei National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "khun-pha-wo": {
    address: "ตำบลพระธาตุ อำเภอแม่ระมาด จังหวัดตาก 63140",
    phone: "055-577-447, 069-754-2841",
    facebookUrl: "https://www.facebook.com/KhunPhawoNationalPark",
    facebookName: "อุทยานแห่งชาติขุนพะวอ - Khun Phawo National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },

  // === เชียงใหม่ ===
  "doi-inthanon": {
    address: "119 หมู่ 7 ตำบลบ้านหลวง อำเภอจอมทอง จังหวัดเชียงใหม่ 50160",
    phone: "053-286-729",
    facebookUrl: "https://www.facebook.com/DoiInthanonNationalPark",
    facebookName: "อุทยานแห่งชาติดอยอินทนนท์ - Doi Inthanon National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "doi-suthep-pui": {
    address: "ถนนศรีวิชัย ตำบลสุเทพ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50200",
    phone: "053-210-246, 053-210-244, 053-212-065",
    facebookUrl: "https://www.facebook.com/Doisutheppui/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติดอยสุเทพ-ปุย - Doi Suthep-Pui National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "doi-pha-hom-pok": {
    address: "224 หมู่ 6 ตำบลโป่งน้ำร้อน อำเภอฝาง จังหวัดเชียงใหม่ 50110",
    phone: "052-080-801, 084-483-4689",
    facebookUrl: "https://www.facebook.com/p/%E0%B8%AD%E0%B8%B8%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%99%E0%B9%81%E0%B8%AB%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4%E0%B8%94%E0%B8%AD%E0%B8%A2%E0%B8%9C%E0%B9%89%E0%B8%B2%E0%B8%AB%E0%B9%88%E0%B8%A1%E0%B8%9B%E0%B8%81-Doi-Pha-Hom-Pok-National-Park-61555498397502/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติดอยผ้าห่มปก - Doi Pha Hom Pok National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "huai-nam-dang": {
    address: "หมู่ 5 ตำบลกึ้ดช้าง อำเภอแม่แตง จังหวัดเชียงใหม่ 50150",
    phone: "053-248-491, 084-908-1531, 082-187-7834",
    facebookUrl: "https://www.facebook.com/huainamdang.np",
    facebookName: "อุทยานแห่งชาติห้วยน้ำดัง - Huai Nam Dang National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "si-lanna": {
    address: "หมู่ 3 ตำบลบ้านป่า อำเภอแม่แตง จังหวัดเชียงใหม่ 50150",
    phone: "053-317-495, 053-479-079, 053-479-090",
    facebookUrl: "https://www.facebook.com/Srilanna888/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติศรีลานนา - Sri Lanna National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "sri-lanna": {
    address: "หมู่ 3 ตำบลบ้านป่า อำเภอแม่แตง จังหวัดเชียงใหม่ 50150",
    phone: "053-317-495, 053-479-079, 053-479-090",
    facebookUrl: "https://www.facebook.com/Srilanna888/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติศรีลานนา - Sri Lanna National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "khun-khan": {
    address: "ตำบลแม่สาบ อำเภอสะเมิง จังหวัดเชียงใหม่ 50250",
    phone: "052-000-410",
    facebookUrl: "https://www.facebook.com/p/%E0%B8%AD%E0%B8%B8%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%99%E0%B9%81%E0%B8%AB%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4%E0%B8%82%E0%B8%B8%E0%B8%99%E0%B8%82%E0%B8%B2%E0%B8%99-Khun-Khan-National-Park-100083556910449/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติขุนขาน - Khun Khan National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "mae-wang": {
    address: "ตำบลบ้านกาด อำเภอแม่วาง จังหวัดเชียงใหม่ 50360",
    phone: "081-881-4729, 063-523-9518, 053-106-759",
    facebookUrl: "https://www.facebook.com/maewangnationalpark",
    facebookName: "อุทยานแห่งชาติแม่วาง - Mae Wang National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "mae-takhrai": {
    address: "หมู่ 3 ตำบลทาเหนือ อำเภอแม่ออน จังหวัดเชียงใหม่ 50130",
    phone: "052-000-832, 096-680-2727",
    facebookUrl: "https://www.facebook.com/p/%E0%B8%AD%E0%B8%B8%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%99%E0%B9%81%E0%B8%AB%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4%E0%B8%94%E0%B8%A1%E0%B9%88%E0%B8%95%E0%B8%B0%E0%B9%84%E0%B8%84%E0%B8%A3%E0%B9%89-Mae-Takhrai-National-Park-Thailand-100068071938224/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติแม่ตะไคร้ - Mae Takhrai National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "ob-luang": {
    address: "ตำบลหางดง อำเภอฮอด จังหวัดเชียงใหม่ 50240",
    phone: "081-602-1290",
    facebookUrl: "https://www.facebook.com/obluangnp",
    facebookName: "อุทยานแห่งชาติออบหลวง - Op Luang National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "op-khan": {
    address: "ตำบลน้ำแพร่ อำเภอหางดง จังหวัดเชียงใหม่ 50230",
    phone: "086-181-1068",
    facebookUrl: "https://www.facebook.com/OpkhanNationalPark",
    facebookName: "อุทยานแห่งชาติออบขาน - Op Khan National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "pha-daeng": {
    address: "หมู่ 3 ตำบลเมืองนะ อำเภอเชียงดาว จังหวัดเชียงใหม่ 50170",
    phone: "053-046-370, 084-806-6021, 093-170-5231",
    facebookUrl: "https://www.facebook.com/PhadaengNationalPark",
    facebookName: "อุทยานแห่งชาติผาแดง - Pha Daeng National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "doi-wiang-pha": {
    address: "หมู่ 8 ตำบลศรีดงเย็น อำเภอไชยปราการ จังหวัดเชียงใหม่ 50320",
    phone: "087-186-2118, 053-317-535",
    facebookUrl: "https://www.facebook.com/DoiWiangPhaNationalPark",
    facebookName: "อุทยานแห่งชาติดอยเวียงผา - Doi Wiang Pha National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "mae-tho": {
    address: "ตำบลบ้านทับ อำเภอแม่แจ่ม จังหวัดเชียงใหม่ 50270",
    phone: "063-378-6599",
    facebookUrl: "https://www.facebook.com/MaeThoNationalPark",
    facebookName: "อุทยานแห่งชาติแม่โถ - Mae Tho National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "namtok-bua-tong": {
    address: "ตำบลแม่หอพระ อำเภอแม่แตง จังหวัดเชียงใหม่ 50150",
    phone: "087-173-5860",
    facebookUrl: "https://www.facebook.com/BuaTongWaterfalls",
    facebookName: "อุทยานแห่งชาติน้ำตกบัวตอง-น้ำพุเจ็ดสี",
    websiteUrl: "https://nps.dnp.go.th",
  },

  // === เชียงราย ===
  "khun-chae": {
    address: "192 หมู่ 7 ถนนสายเชียงใหม่-เชียงราย ตำบลแม่เจดีย์ใหม่ อำเภอเวียงป่าเป้า จังหวัดเชียงราย 57260",
    phone: "053-727-569, 084-366-5213",
    facebookUrl: "https://www.facebook.com/KhunChaeNationalPark",
    facebookName: "อุทยานแห่งชาติขุนแจ - Khun Chae National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "doi-luang": {
    address: "หมู่ 6 ตำบลแม่เย็น อำเภอพาน จังหวัดเชียงราย 57120",
    phone: "053-163-3363, 081-960-2456",
    facebookUrl: "https://www.facebook.com/doiluang.dnp/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติดอยหลวง - Doi Luang National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "lam-nam-kok": {
    address: "ตำบลดอยฮาง อำเภอเมืองเชียงราย จังหวัดเชียงราย 57000",
    phone: "083-764-6475",
    facebookUrl: "https://www.facebook.com/LamNamKokNationalPark",
    facebookName: "อุทยานแห่งชาติลำน้ำกก - Lam Nam Kok National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "phu-chi-fa": {
    address: "หมู่ 19 ตำบลตับเต่า อำเภอเทิง จังหวัดเชียงราย 57160",
    phone: "084-807-9848",
    facebookUrl: "https://www.facebook.com/PhuchifaNationalPark",
    facebookName: "อุทยานแห่งชาติภูชี้ฟ้า - Phu Chi Fa National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "tham-luang-khun-nam-nang-non": {
    address: "ตำบลโป่งผา อำเภอแม่สาย จังหวัดเชียงราย 57130",
    phone: "080-792-5095",
    facebookUrl: "https://www.facebook.com/ThamluangKhunnamNangnonNationalPark",
    facebookName: "อุทยานแห่งชาติถ้ำหลวง-ขุนน้ำนางนอน",
    websiteUrl: "https://nps.dnp.go.th",
  },

  // === ลำปาง / ลำพูน ===
  "chae-son": {
    address: "หมู่ 8 ตำบลแจ้ซ้อน อำเภอเมืองปาน จังหวัดลำปาง 52240",
    phone: "093-137-5533, 089-851-3355",
    facebookUrl: "https://www.facebook.com/ChaesonNationalParkNew/",
    facebookName: "อุทยานแห่งชาติแจ้ซ้อน - Chae Son National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "doi-jong": {
    address: "ตำบลนายาง อำเภอสบปราบ จังหวัดลำปาง 52170",
    phone: "081-951-3624",
    facebookUrl: "https://www.facebook.com/DOICHONGNATIONALPARK/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติดอยจง - Doi Jong National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "tham-pha-thai": {
    address: "หมู่ 3 ตำบลบ้านหวด อำเภองาว จังหวัดลำปาง 52110",
    phone: "082-936-7076",
    facebookUrl: "https://www.facebook.com/p/%E0%B8%AD%E0%B8%B8%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%99%E0%B9%81%E0%B8%AB%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4%E0%B8%96%E0%B9%89%E0%B8%B3%E0%B8%9C%E0%B8%B2%E0%B9%84%E0%B8%97-Tham-Pha-Tai-National-Park-61566364139906/",
    facebookName: "อุทยานแห่งชาติถ้ำผาไท - Tham Pha Thai National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "mae-wa": {
    address: "หมู่ 8 ตำบลแม่วะ อำเภอเถิน จังหวัดลำปาง 52230",
    phone: "081-112-2855",
    facebookUrl: "https://www.facebook.com/MaeWaNationalPark",
    facebookName: "อุทยานแห่งชาติแม่วะ - Mae Wa National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "doi-khun-tan": {
    address: "ตำบลทาปลาดุก อำเภอแม่ทา จังหวัดลำพูน 51140",
    phone: "081-032-6341",
    facebookUrl: "https://www.facebook.com/DoiKhunTanNationalPark",
    facebookName: "อุทยานแห่งชาติดอยขุนตาล - Doi Khun Tan National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "mae-ping": {
    address: "หมู่ 5 ตำบลแม่ลี้ อำเภอลี้ จังหวัดลำพูน 51110",
    phone: "061-375-3500, 052-030-480, 052-030-380, 098-808-2827",
    facebookUrl: "https://www.facebook.com/p/%E0%B8%AD%E0%B8%B8%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%99%E0%B9%81%E0%B8%AB%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4%E0%B9%81%E0%B8%A1%E0%B9%88%E0%B8%9B%E0%B8%B4%E0%B8%87-Mae-Ping-National-Park-100064459249367/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติแม่ปิง - Mae Ping National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },

  // === แพร่ ===
  "mae-yom": {
    address: "หมู่ 1 ตำบลสะเอียบ อำเภอสอง จังหวัดแพร่ 54120",
    phone: "054-520-735",
    facebookUrl: "https://www.facebook.com/p/%E0%B8%AD%E0%B8%B8%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%99%E0%B9%81%E0%B8%AB%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4%E0%B9%81%E0%B8%A1%E0%B9%88%E0%B8%A2%E0%B8%A1-Mae-Yom-National-Park-100068965602131/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติแม่ยม - Mae Yom National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "wiang-kosai": {
    address: "หมู่ 7 ตำบลแม่เกิ๋ง อำเภอวังชิ้น จังหวัดแพร่ 54160",
    phone: "081-030-8663",
    facebookUrl: "https://www.facebook.com/wiangkosai.np/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติเวียงโกศัย - Wiang Kosai National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "doi-pha-klong": {
    address: "ตำบลต้าผามอก อำเภอลอง จังหวัดแพร่ 54150",
    phone: "097-923-0491",
    facebookUrl: "",
    facebookName: "ยังไม่มี Facebook แฟนเพจอย่างเป็นทางการ (สามารถติดต่อผ่านเบอร์โทรศัพท์ที่ทำการอุทยาน)",
    websiteUrl: "https://nps.dnp.go.th",
  },

  // === น่าน ===
  "doi-phu-kha": {
    address: "ตำบลภูคา อำเภอปัว จังหวัดน่าน 55120",
    phone: "082-194-1349",
    facebookUrl: "https://www.facebook.com/p/%E0%B8%AD%E0%B8%B8%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%99%E0%B9%80%E0%B9%80%E0%B8%AB%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4%E0%B8%94%E0%B8%AD%E0%B8%A2%E0%B8%A0%E0%B8%B9%E0%B8%84%E0%B8%B2-Doi-Phu-Kha-National-Park-61557782597546/",
    facebookName: "อุทยานแห่งชาติดอยภูคา - Doi Phu Kha National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "khun-nan": {
    address: "หมู่ 5 บ้านบ่อหลวง ตำบลดงพญา อำเภอบ่อเกลือ จังหวัดน่าน 55220",
    phone: "054-731-790, 096-697-6954, 084-483-7240",
    facebookUrl: "https://www.facebook.com/Khunnan.National.Park/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติขุนน่าน - Khun Nan National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "khun-sathan": {
    address: "ตำบลสันทะ อำเภอนาน้อย จังหวัดน่าน 55150",
    phone: "095-148-1645, 087-173-9549",
    facebookUrl: "https://www.facebook.com/KhunSathanNationalPark",
    facebookName: "อุทยานแห่งชาติขุนสถาน - Khun Sathan National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "tham-sa-koen": {
    address: "ตำบลยอด อำเภอสองแคว จังหวัดน่าน 55160",
    phone: "089-045-9831",
    facebookUrl: "https://www.facebook.com/ThamSaKoenNationalPark",
    facebookName: "อุทยานแห่งชาติถ้ำสะเกิน - Tham Sa Koen National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "mae-charim": {
    address: "ตำบลน้ำปาย อำเภอแม่จริม จังหวัดน่าน 55170",
    phone: "080-679-9070",
    facebookUrl: "https://www.facebook.com/MaeCharimNationalPark",
    facebookName: "อุทยานแห่งชาติแม่จริม - Mae Charim National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "nanthaburi": {
    address: "ตำบลผาทอง อำเภอท่าวังผา จังหวัดน่าน 55140",
    phone: "065-416-8853",
    facebookUrl: "https://www.facebook.com/NanthaburiNationalPark",
    facebookName: "อุทยานแห่งชาตินันทบุรี - Nanthaburi National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "sri-nan": {
    address: "ตำบลเชียงของ อำเภอนาน้อย จังหวัดน่าน 55150",
    phone: "098-803-2872",
    facebookUrl: "https://www.facebook.com/p/%E0%B8%AD%E0%B8%B8%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%99%E0%B9%81%E0%B8%AB%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4%E0%B8%A8%E0%B8%A3%E0%B8%B5%E0%B8%99%E0%B9%88%E0%B8%B2%E0%B8%99-%E0%B8%88%E0%B8%B1%E0%B8%87%E0%B8%AB%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%99%E0%B9%88%E0%B8%B2%E0%B8%99-Sri-Nan-National-Park-%E0%B9%80%E0%B8%9E%E0%B8%88%E0%B8%AB%E0%B8%A5%E0%B8%B1%E0%B8%81-100093421155533/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติศรีน่าน - Sri Nan National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },

  // === พะเยา / แม่ฮ่องสอน ===
  "doi-phu-nang": {
    address: "หมู่ 6 ตำบลบ้านมาง อำเภอเชียงม่วน จังหวัดพะเยา 56160",
    phone: "095-690-0605",
    facebookUrl: "https://www.facebook.com/DoiPhuNangNationalPark",
    facebookName: "อุทยานแห่งชาติดอยภูนาง - Doi Phu Nang National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "phu-sang": {
    address: "ตำบลภูซาง อำเภอภูซาง จังหวัดพะเยา 56110",
    phone: "093-293-5099, 054-070-205",
    facebookUrl: "https://www.facebook.com/PhuSangNationalPark",
    facebookName: "อุทยานแห่งชาติภูซาง - Phu Sang National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "mae-puem": {
    address: "หมู่ 8 ตำบลแม่ใจ อำเภอแม่ใจ จังหวัดพะเยา 56130",
    phone: "093-265-3035, 088-290-9433",
    facebookUrl: "https://www.facebook.com/MaePuemNationalPark",
    facebookName: "อุทยานแห่งชาติแม่ปืม - Mae Puem National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "namtok-mae-surin": {
    address: "ตำบลปางหมู อำเภอเมืองแม่ฮ่องสอน จังหวัดแม่ฮ่องสอน 58000",
    phone: "053-061-073",
    facebookUrl: "https://www.facebook.com/p/%E0%B8%AD%E0%B8%B8%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%99%E0%B9%81%E0%B8%AB%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%95%E0%B8%81%E0%B9%81%E0%B8%A1%E0%B9%88%E0%B8%AA%E0%B8%B8%E0%B8%A3%E0%B8%B4%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B9%8C-Namtok-Mae-Surin-National-Park-100064778436938/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติน้ำตกแม่สุรินทร์ - Namtok Mae Surin National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "salawin": {
    address: "ตำบลแม่คง อำเภอแม่สะเรียง จังหวัดแม่ฮ่องสอน 58110",
    phone: "053-071-429, 081-366-7356",
    facebookUrl: "https://www.facebook.com/SalawinNationalPark",
    facebookName: "อุทยานแห่งชาติสาละวิน - Salawin National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "tham-pla-namtok-pha-suea": {
    address: "หมู่ 2 ตำบลห้วยผา อำเภอเมืองแม่ฮ่องสอน จังหวัดแม่ฮ่องสอน 58000",
    phone: "085-706-6663, 082-191-1746",
    facebookUrl: "https://www.facebook.com/ThamPlaNamtokPhaSueaNationalPark",
    facebookName: "อุทยานแห่งชาติถ้ำปลา-น้ำตกผาเสื่อ",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "mae-ngao": {
    address: "หมู่ 8 ตำบลแม่สวด อำเภอสบเมย จังหวัดแม่ฮ่องสอน 58110",
    phone: "084-372-4036",
    facebookUrl: "https://www.facebook.com/MaeNgaoNationalPark",
    facebookName: "อุทยานแห่งชาติแม่เงา - Mae Ngao National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "mae-sariang": {
    address: "ตำบลแม่สะเรียง อำเภอแม่สะเรียง จังหวัดแม่ฮ่องสอน 58110",
    phone: "080-771-3993",
    facebookUrl: "https://www.facebook.com/MaeSariangNationalPark",
    facebookName: "อุทยานแห่งชาติแม่สะเรียง - Mae Sariang National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },

  // === อุตรดิตถ์ / สุโขทัย ===
  "ton-sak-yai": {
    address: "หมู่ 4 ตำบลน้ำไคร้ อำเภอน้ำปาด จังหวัดอุตรดิตถ์ 53110",
    phone: "064-083-0886",
    facebookUrl: "https://www.facebook.com/TonSakYai.NP/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติต้นสักใหญ่ - Ton Sak Yai National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "lam-nam-nan": {
    address: "หมู่ 8 ตำบลผาเลือด อำเภอท่าปลา จังหวัดอุตรดิตถ์ 53150",
    phone: "090-604-7793",
    facebookUrl: "https://www.facebook.com/p/%E0%B8%AD%E0%B8%B8%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%99%E0%B9%81%E0%B8%AB%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4%E0%B8%A5%E0%B8%B3%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%99%E0%B9%88%E0%B8%B2%E0%B8%99-Lamnam-Nan-National-Park-61566294317876/",
    facebookName: "อุทยานแห่งชาติลำน้ำน่าน - Lamnam Nan National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "phu-soi-dao": {
    address: "ตำบลห้วยม่าน อำเภอบ้านโคก จังหวัดอุตรดิตถ์ 53180",
    phone: "055-436-793, 095-629-9528, 091-024-7633",
    facebookUrl: "https://www.facebook.com/phusoidao07",
    facebookName: "อุทยานแห่งชาติภูสอยดาว - Phu soi dao National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "ramkhamhaeng": {
    address: "ตำบลนาเชิงคีรี อำเภอคีรีมาศ จังหวัดสุโขทัย 64160",
    phone: "055-910-0001, 098-883-9297",
    facebookUrl: "https://www.facebook.com/RamkhamhaengNationalPark",
    facebookName: "อุทยานแห่งชาติรามคำแหง - Ramkhamhaeng National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "si-satchanalai": {
    address: "ตำบลบ้านแก่ง อำเภอศรีสัชนาลัย จังหวัดสุโขทัย 64130",
    phone: "055-910-022, 055-910-023, 095-306-4837",
    facebookUrl: "https://www.facebook.com/p/%E0%B8%AD%E0%B8%B8%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%99%E0%B9%81%E0%B8%AB%E0%B9%88%E0%B8%87%E0%B8%8A%E0%B8%B2%E0%B8%95%E0%B8%B4%E0%B8%A8%E0%B8%A3%E0%B8%B5%E0%B8%AA%E0%B8%B1%E0%B8%8A%E0%B8%99%E0%B8%B2%E0%B8%A5%E0%B8%B1%E0%B8%A2-Srisatchanalai-National-Park-100070061311859/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติศรีสัชนาลัย - Srisatchanalai National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },

  // === พิษณุโลก / เพชรบูรณ์ ===
  "phu-hin-rong-kla": {
    address: "ตำบลเนินเพิ่ม อำเภอนครไทย จังหวัดพิษณุโลก 65120",
    phone: "081-596-5977",
    facebookUrl: "https://www.facebook.com/phuhinrongkla.np",
    facebookName: "อุทยานแห่งชาติภูหินร่องกล้า - Phu Hin Rong Kla National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "thung-salaeng-luang": {
    address: "กม. 80 ถนนสายพิษณุโลก-หล่มสัก ตำบลบ้านแยง อำเภอนครไทย จังหวัดพิษณุโลก 65120",
    phone: "088-756-4940",
    facebookUrl: "https://www.facebook.com/Thungsalaengluang",
    facebookName: "อุทยานแห่งชาติทุ่งแสลงหลวง - Thung Salaeng Luang National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "namtok-chat-trakan": {
    address: "ตำบลชาติตระการ อำเภอชาติตระการ จังหวัดพิษณุโลก 65170",
    phone: "055-906-522",
    facebookUrl: "https://www.facebook.com/profile.php?id=100067984508006",
    facebookName: "อุทยานแห่งชาติน้ำตกชาติตระการ - Namtok Chat Trakan National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "khwae-noi": {
    address: "ตำบลบ้านยาง อำเภอวัดโบสถ์ จังหวัดพิษณุโลก 65160",
    phone: "055-906-615",
    facebookUrl: "https://www.facebook.com/KhwaeNoiNationalPark",
    facebookName: "อุทยานแห่งชาติแควน้อย - Khwae Noi National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "nam-nao": {
    address: "ตำบลน้ำหนาว อำเภอน้ำหนาว จังหวัดเพชรบูรณ์ 67260",
    phone: "061-042-8234, 081-888-4107",
    facebookUrl: "https://www.facebook.com/NamnaoNP5/?locale=th_TH",
    facebookName: "อุทยานแห่งชาติน้ำหนาว - Nam Nao National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "tat-mok": {
    address: "ตำบลนาป่า อำเภอเมืองเพชรบูรณ์ จังหวัดเพชรบูรณ์ 67000",
    phone: "088-278-7108",
    facebookUrl: "https://www.facebook.com/TatmokNationalPark",
    facebookName: "อุทยานแห่งชาติตาดหมอก - Tat Mok National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
  "khao-kho": {
    address: "หมู่ 5 ตำบลสะเดาะพง อำเภอเขาค้อ จังหวัดเพชรบูรณ์ 67270",
    phone: "081-284-5223",
    facebookUrl: "https://www.facebook.com/KhaoKhoNationalPark",
    facebookName: "อุทยานแห่งชาติเขาค้อ - Khao Kho National Park",
    websiteUrl: "https://nps.dnp.go.th",
  },
};

export function getParkContactInfo(slug: string, nameTh: string, province: string): ParkContactInfo {
  let found = parkContactDictionary[slug];
  const cleanName = nameTh.startsWith("อุทยานแห่งชาติ") ? nameTh : `อุทยานแห่งชาติ${nameTh}`;
  const coreName = nameTh.replace(/^อุทยานแห่งชาติ/, "").trim();

  if (!found && coreName) {
    const matchedKey = Object.keys(parkContactDictionary).find((key) => {
      const item = parkContactDictionary[key];
      return item.facebookName?.includes(coreName) || item.address?.includes(coreName) || key.includes(coreName);
    });
    if (matchedKey) {
      found = parkContactDictionary[matchedKey];
    }
  }

  if (found) {
    return {
      ...found,
      phone: formatPhoneString(found.phone),
      facebookUrl: found.facebookUrl !== undefined ? found.facebookUrl : `https://www.facebook.com/search/top?q=${encodeURIComponent(cleanName)}`,
      facebookName: found.facebookName ?? `${cleanName} - เพจทางการ`,
      websiteUrl: found.websiteUrl ?? "https://nps.dnp.go.th",
    };
  }

  return {
    address: `${cleanName} จังหวัด${province}`,
    phone: "053-000-000 (ศูนย์บริการนักท่องเที่ยว)",
    facebookUrl: `https://www.facebook.com/search/top?q=${encodeURIComponent(cleanName)}`,
    facebookName: `${cleanName} - เพจทางการ`,
    websiteUrl: "https://nps.dnp.go.th",
  };
}
