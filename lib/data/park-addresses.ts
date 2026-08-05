export type ParkContactInfo = {
  address: string;
  phone?: string;
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

export const parkContactDictionary: Record<string, ParkContactInfo> = {
  "khun-chae": {
    address: "192 หมู่ 7 ถนนสายเชียงใหม่-เชียงราย ตำบลแม่เจดีย์ใหม่ อำเภอเวียงป่าเป้า จังหวัดเชียงราย 57260",
    phone: "053-711-402, 084-366-6210",
  },
  "khlong-lan": {
    address: "หมู่ 2 ตำบลคลองลานพัฒนา อำเภอคลองลาน จังหวัดกำแพงเพชร 62180",
    phone: "055-766-002",
  },
  "khlong-wang-chao": {
    address: "หมู่ 3 ตำบลคลองลานพัฒนา อำเภอคลองลาน จังหวัดกำแพงเพชร 62180",
    phone: "055-766-002, 086-440-2862",
  },
  "mae-wong": {
    address: "กม. 65 ถนนคลองลาน-อุ้มผาง ตำบลปางตาไว อำเภอปางศิลาทอง จังหวัดกำแพงเพชร 62120",
    phone: "055-766-027, 055-766-437",
  },
  "doi-inthanon": {
    address: "119 หมู่ 7 ตำบลบ้านหลวง อำเภอจอมทอง จังหวัดเชียงใหม่ 50160",
    phone: "053-286-729",
  },
  "doi-suthep-pui": {
    address: "ถนนศรีวิชัย ตำบลสุเทพ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50200",
    phone: "053-210-244",
  },
  "doi-luang": {
    address: "หมู่ 6 ตำบลแม่เย็น อำเภอพาน จังหวัดเชียงราย 57120",
    phone: "053-603-944, 081-960-2456",
  },
  "huai-nam-dang": {
    address: "หมู่ 5 ตำบลกึ้ดช้าง อำเภอแม่แตง จังหวัดเชียงใหม่ 50150",
    phone: "053-248-491",
  },
  "doi-pha-hom-pok": {
    address: "224 หมู่ 6 ตำบลโป่งน้ำร้อน อำเภอฝาง จังหวัดเชียงใหม่ 50110",
    phone: "053-453-517",
  },
  "si-lanna": {
    address: "หมู่ 3 ตำบลบ้านป่า อำเภอแม่แตง จังหวัดเชียงใหม่ 50150",
    phone: "053-471-416",
  },
  "mae-wang": {
    address: "ตำบลบ้านกาด อำเภอแม่วาง จังหวัดเชียงใหม่ 50360",
    phone: "053-818-348",
  },
  "ob-luang": {
    address: "ตำบลหางดง อำเภอฮอด จังหวัดเชียงใหม่ 50240",
    phone: "053-317-605",
  },
  "chae-son": {
    address: "หมู่ 8 ตำบลแจ้ซ้อน อำเภอเมืองปาน จังหวัดลำปาง 52240",
    phone: "054-380-000",
  },
  "doi-khun-tan": {
    address: "ตำบลทาปลาดุก อำเภอแม่ทา จังหวัดลำพูน 51140",
    phone: "053-519-216",
  },
  "mae-ping": {
    address: "หมู่ 5 ตำบลแม่ลี้ อำเภอลี้ จังหวัดลำพูน 51110",
    phone: "053-518-060",
  },
  "doi-phu-kha": {
    address: "ตำบลภูคา อำเภอปัว จังหวัดน่าน 55120",
    phone: "054-731-623",
  },
  "sri-nan": {
    address: "ตำบลเชียงของ อำเภอนาน้อย จังหวัดน่าน 55150",
    phone: "054-731-714",
  },
  "phu-soi-dao": {
    address: "ตำบลห้วยม่าน อำเภอบ้านโคก จังหวัดอุตรดิตถ์ 53180",
    phone: "055-436-812",
  },
  "phu-hin-rong-kla": {
    address: "ตำบลเนินเพิ่ม อำเภอนครไทย จังหวัดพิษณุโลก 65120",
    phone: "055-356-607",
  },
  "thung-salaeng-luang": {
    address: "ตำบลบ้านแยง อำเภอนครไทย จังหวัดพิษณุโลก 65120",
    phone: "055-268-019",
  },
};

export function getParkContactInfo(slug: string, nameTh: string, province: string): ParkContactInfo {
  const found = parkContactDictionary[slug];
  if (found) {
    return {
      ...found,
      phone: formatPhoneString(found.phone),
    };
  }

  return {
    address: `อุทยานแห่งชาติ${nameTh.replace(/^อุทยานแห่งชาติ/, "")} จังหวัด${province}`,
    phone: "053-000-000 (ศูนย์บริการนักท่องเที่ยว)",
  };
}
