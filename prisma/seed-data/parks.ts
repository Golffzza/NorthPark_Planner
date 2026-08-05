import { parksData } from "./parks-raw";
import { parksData as correctedCoordinates } from "./parksData_corrected_coordinates";

type RawPark = {
  name: string;
  nameEn: string;
  description: string;
  province: string;
  district?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  entryFeeThai?: number;
  entryFeeForeigner?: number;
  openingHours: string;
  tags?: string[];
};

const curatedOverrides: Record<
  string,
  {
    slug?: string;
    coverImageUrl?: string;
    attractions?: Array<{
      name: string;
      description: string;
      type: "VIEWPOINT" | "WATERFALL" | "TRAIL" | "CAMPSITE" | "OTHER";
      imageUrl?: string;
    }>;
    warnings?: Array<{
      title: string;
      description: string;
      severity: "LOW" | "MEDIUM" | "HIGH";
      isActive: boolean;
    }>;
  }
> = {
  "Khlong Lan National Park": {
    slug: "khlong-lan",
    coverImageUrl: "/images/parks/khlong-lan.jpg",
    attractions: [
      {
        name: "น้ำตกคลองลาน",
        description: "น้ำตกคลองลานขนาดใหญ่สูงกว่า 100 เมตร สายน้ำตกไหลผ่านหน้าผาสูงตระหง่านกลางป่าอุดมสมบูรณ์",
        type: "WATERFALL",
        imageUrl: "/images/parks/khlong-lan.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังโขดหินลื่นและละอองน้ำ",
        description: "บริเวณหน้าผาน้ำตกมีละอองน้ำกระจายตลอดเวลา ควรระมัดระวังขณะเดินถ่ายภาพ",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Khlong Wang Chao National Park": {
    slug: "khlong-wang-chao",
    coverImageUrl: "/images/parks/khlong-wang-chao.jpg",
    attractions: [
      {
        name: "น้ำตกเต่าดำ",
        description: "น้ำตกขนาดใหญ่ทอดตัวลงมาจากหน้าผาสูงตาดชั้นตระการตา กลางผืนป่าดงดิบสมบูรณ์ของอุทยานแห่งชาติคลองวังเจ้า",
        type: "WATERFALL",
        imageUrl: "/images/parks/khlong-wang-chao.jpg",
      },
      {
        name: "สะพานไม้",
        description: "สะพานแขวนไม้ทอดข้ามลำน้ำคลองวังเจ้า อันเป็นจุดเชื่อมต่อเขตแดนธรรมชาติระหว่าง 2 จังหวัด คือ จังหวัดกำแพงเพชร และจังหวัดตาก",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/khlong-wang-chao-wooden-bridge.jpg",
      },
    ],
    warnings: [
      {
        title: "เส้นทางไปน้ำตกเต่าดำวิบากและชันสูง (ควรใช้รถ 4WD)",
        description: "เส้นทางเดินทางไปน้ำตกเต่าดำเป็นทางลูกรังวิบาก ลาดชันสูง และขรุขระ รถเก๋งหรือรถขับเคลื่อน 2 ล้อทั่วไปไม่สามารถสัญจรได้ ควรใช้รถขับเคลื่อน 4 ล้อ (4WD) หรือใช้บริการรถท้องถิ่นนำทางของอุทยาน",
        severity: "HIGH",
        isActive: true,
      },
      {
        title: "ระวังน้ำเชี่ยวหลังฝนตก",
        description: "บริเวณลำธารและหน้าผาน้ำตกมีกระแสน้ำแรงในช่วงฤดูฝน ควรปฏิบัติตามป้ายเตือนของเจ้าหน้าที่",
        severity: "HIGH",
        isActive: true,
      },
    ],
  },
  "Mae Wong National Park": {
    slug: "mae-wong",
    coverImageUrl: "/images/parks/mae-wong.jpg",
    attractions: [
      {
        name: "แก่งผาคอย / ลำน้ำแม่วงก์",
        description: "สายน้ำลำธารไหลผ่านโขดหินแก่งหินกลางผืนป่าธรรมชาติอันอุดมสมบูรณ์ของอุทยานแห่งชาติแม่วงก์",
        type: "WATERFALL",
        imageUrl: "/images/parks/mae-wong.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังกระแสน้ำเชี่ยวช่วงฝนตกหนัก",
        description: "บริเวณแก่งหินและลำธารมีกระแสน้ำไหลแรงในบางช่วงฤดู ควรระมัดระวังขณะลงเล่นน้ำ",
        severity: "HIGH",
        isActive: true,
      },
    ],
  },
  "Doi Inthanon National Park": {
    slug: "doi-inthanon",
    coverImageUrl: "/images/parks/doi-inthanon.jpg",
    attractions: [
      {
        name: "จุดชมวิวกิ่วแม่ปาน",
        description: "จุดชมวิวสันเขาและระเบียงไม้ชมวิวทะเลหมอกยามเช้าอันสวยงามตระการตา บนเส้นทางศึกษาธรรมชาติกิ่วแม่ปาน",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/kew-mae-pan-viewpoint.jpg",
      },
      {
        name: "น้ำตกวชิรธาร",
        description: "น้ำตกขนาดใหญ่สายน้ำไหลตกจากหน้าผาสูงตระหง่านทอดตัวลงสู่แอ่งน้ำ ท่ามกลางละอองน้ำและป่าธรรมชาติร่มรื่น",
        type: "WATERFALL",
        imageUrl: "/images/attractions/wachirathan-waterfall.jpg",
      },
    ],
    warnings: [
      {
        title: "โขดหินและทางเดินลื่นในช่วงฝนตก",
        description: "เส้นทางเดินศึกษาธรรมชาติและบริเวณใกล้น้ำตกอาจมีความลื่นสูงเมื่อมีฝนตก",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Doi Suthep-Pui National Park": {
    slug: "doi-suthep-pui",
    coverImageUrl: "/images/parks/doi-suthep-pui.jpg",
    attractions: [
      {
        name: "น้ำตกมณฑาธาร",
        description: "น้ำตกธรรมชาติบรรยากาศร่มรื่นกลางผืนป่า เข้าถึงได้สะดวกจากถนนขึ้นดอยสุเทพ",
        type: "WATERFALL",
        imageUrl: "/images/attractions/mon-tha-than.jpg",
      },
    ],
    warnings: [
      {
        title: "เส้นทางขึ้นเขาชันและโค้งคดเคี้ยว",
        description: "ควรขับขี่ด้วยความระมัดระวัง ใช้เกียร์ต่ำ และระวังหมอกหนายามเช้า",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Mae Takhrai National Park": {
    slug: "mae-takhrai",
    coverImageUrl: "/images/parks/mae-takhrai.jpg",
    attractions: [
      {
        name: "ลำน้ำสายห้วยและลานกางเต็นท์แม่ตะไคร้",
        description: "สายน้ำลำธารห้วยไหลผ่านโขดหินกลางผืนป่าร่มรื่น เหมาะแก่การตั้งแคมป์ กางเต็นท์ พักผ่อนท่ามกลางธรรมชาติอันบริสุทธิ์",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/mae-takhrai-stream.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังน้ำเชี่ยวบริเวณลำธารช่วงฝนตกหนัก",
        description: "สายน้ำและลำธารอาจเพิ่มระดับและไหลเชี่ยวได้รวดเร็วเมื่อเกิดฝนตกหนักสะสม ควรระมัดระวังขณะลงเล่นน้ำหรือตั้งแคมป์ริมน้ำ",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Doi Pha Hom Pok National Park": {
    slug: "doi-pha-hom-pok",
    coverImageUrl: "/images/parks/doi-pha-hom-pok.jpg",
    attractions: [
      {
        name: "ยอดดอยผ้าห่มปก",
        description: "ยอดเขาที่สูงเป็นอันดับ 2 ของประเทศไทย (2,285 เมตร) สัมผัสอากาศหนาวเย็น ชมทะเลหมอกและพระอาทิตย์ขึ้นอันสวยงามตระการตา",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/doi-pha-hom-pok-peak.jpg",
      },
    ],
    warnings: [
      {
        title: "สภาพอากาศหนาวจัดและอุณหภูมิต่ำ",
        description: "ยอดดอยมีอากาศหนาวเย็นจัดตลอดปี โดยเฉพาะช่วงฤดูหนาว ควรเตรียมเสื้อผ้ากันหนาวและอุปกรณ์ให้พร้อม",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Huai Nam Dang National Park": {
    slug: "huai-nam-dang",
    coverImageUrl: "/images/parks/huai-nam-dang.jpg",
    attractions: [
      {
        name: "จุดชมวิวดอยกิ่วลม / ทะเลหมอกห้วยน้ำดัง",
        description: "จุดชมวิวทะเลหมอกยามเช้าและพระอาทิตย์ขึ้นอันงดงามที่ขึ้นชื่อที่สุดแห่งหนึ่งของภาคเหนือ",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/huai-nam-dang-viewpoint.jpg",
      },
      {
        name: "ลานกางเต็นท์ห้วยน้ำดัง",
        description: "ลานกางเต็นท์ท่ามกลางอากาศหนาวเย็น สัมผัสธรรมชาติและวิวทิวทัศน์ภูเขากว้างไกล",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/huai-nam-dang-camp.jpg",
      },
    ],
    warnings: [
      {
        title: "ทัศนวิสัยต่ำในตอนเช้าตรู่",
        description: "หมอกหนาอาจลดทัศนวิสัยบนเส้นทางขับรถและจุดชมวิว ควรเปิดไฟส่องสว่างขณะเดินทาง",
        severity: "HIGH",
        isActive: true,
      },
    ],
  },
  "Sri Lanna National Park": {
    slug: "si-lanna",
    coverImageUrl: "/images/parks/si-lanna.jpg",
    attractions: [
      {
        name: "จุดชมวิวเขื่อนแม่งัดสมบูรณ์ชล",
        description: "จุดชมวิวทะเลสาบอ่างเก็บน้ำกลางหุบเขา เหมาะสำหรับพักผ่อนและทำกิจกรรมทางน้ำ",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/mae-ngat-view.jpg",
      },
    ],
    warnings: [],
  },
  "Khun Khan National Park": {
    slug: "khun-khan",
    coverImageUrl: "/images/parks/khun-khan.jpg",
    attractions: [
      {
        name: "จุดชมวิวสะเมิง",
        description: "จุดชมวิวบนสันเขาอำเภอสะเมิง มองเห็นทิวเขาซับซ้อนสลับซับซ้อนกว้างไกลสุดสายตาท่ามกลางผืนป่าดงดิบอันอุดมสมบูรณ์",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/samoeng-viewpoint.jpg",
      },
    ],
    warnings: [
      {
        title: "เส้นทางขึ้นเขาคดเคี้ยวและสูงชัน",
        description: "เส้นทางสู่จุดชมวิวสะเมิงเป็นถนนสายภูเขาคดเคี้ยวและลาดชัน ควรขับขี่ด้วยความระมัดระวังและใช้เกียร์ต่ำ",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Mae Wang National Park": {
    slug: "mae-wang",
    coverImageUrl: "/images/parks/mae-wang.jpg",
    attractions: [
      {
        name: "น้ำตกแม่วาง",
        description: "น้ำตกธรรมชาติบรรยากาศเย็นสบาย รายล้อมด้วยผืนป่าเบญจพรรณอันสมบูรณ์",
        type: "WATERFALL",
        imageUrl: "/images/attractions/mae-wang-waterfall.jpg",
      },
    ],
    warnings: [
      {
        title: "ระวังกระแสน้ำเชี่ยวช่วงฝนตกหนัก",
        description: "ระดับน้ำในลำธารสามารถเพิ่มสูงขึ้นอย่างรวดเร็วในช่วงฝนตกหนัก ติดตามป้ายเตือนอย่างใกล้ชิด",
        severity: "HIGH",
        isActive: true,
      },
    ],
  },
  "Ob Luang National Park": {
    slug: "ob-luang",
    coverImageUrl: "/images/parks/ob-luang.jpg",
    attractions: [
      {
        name: "สะพานเชื่อมโตรกเขาออบหลวง",
        description: "จุดชมวิวโตรกผาหินแคบอันเป็นเอกลักษณ์ พร้อมสายน้ำแม่แจ่มไหลผ่านเบื้องล่าง",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/ob-luang-gorge.jpg",
      },
    ],
    warnings: [
      {
        title: "ระมัดระวังการเดินบริเวณริมหน้าผา",
        description: "จุดชมวิวบางแห่งมีความสูงชัน ควรดูแลเด็กเล็กและผู้สูงอายุอย่างใกล้ชิด",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Mae Ping National Park": {
    slug: "mae-ping",
    coverImageUrl: "/images/parks/mae-ping.jpg",
    attractions: [
      {
        name: "น้ำตกก้อหลวง",
        description: "น้ำตกหินปูนหลายชั้นอันสวยงามที่มีแอ่งน้ำสีฟ้าอมเขียวใสมรกต",
        type: "WATERFALL",
        imageUrl: "/images/attractions/ko-luang.jpg",
      },
    ],
    warnings: [],
  },
  "Khun Chae National Park": {
    slug: "khun-chae",
    coverImageUrl: "/images/parks/khun-chae.jpg",
    attractions: [
      {
        name: "น้ำตกขุนแจ",
        description: "น้ำตกขนาดใหญ่สวยงามซ่อนตัวอยู่กลางผืนป่าดิบเขา มีเส้นทางเดินศึกษาธรรมชาติร่มรื่น",
        type: "WATERFALL",
        imageUrl: "/images/attractions/khun-chae-waterfall.jpg",
      },
      {
        name: "จุดชมวิวดอยม่อนฝิ่น / ทะเลหมอกขุนแจ",
        description: "จุดชมวิวทิวทัศน์ทะเลหมอกและพระอาทิตย์ตกดินยามเย็นอันสวยงามบนยอดเขาของอุทยานแห่งชาติขุนแจ",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/doi-mon-fin.jpg",
      },
    ],
    warnings: [
      {
        title: "พื้นที่จอดรถริมทางมีจำนวนจำกัด",
        description: "ควรวางแผนเวลาเดินทางและช่วงเวลามาถึงให้รอบคอบโดยเฉพาะในช่วงเทศกาลท่องเที่ยว",
        severity: "LOW",
        isActive: true,
      },
      {
        title: "หมอกหนาและเส้นทางขับขี่ลาดชัน",
        description: "เส้นทางขับรถขึ้นจุดชมวิวมีความลาดชันและอาจมีหมอกหนาในตอนเช้าและเย็น ควรขับขี่ด้วยความระมัดระวัง",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Doi Luang National Park": {
    slug: "doi-luang",
    coverImageUrl: "/images/parks/doi-luang.jpg",
    attractions: [
      {
        name: "น้ำตกปูแกง",
        description: "น้ำตกหินปูนหลายชั้นอันสวยงาม สายน้ำใสไหลผ่านตาดหินและผืนป่าธรรมชาติอันร่มรื่นของอุทยานแห่งชาติดอยหลวง",
        type: "WATERFALL",
        imageUrl: "/images/attractions/pu-kaeng-waterfall.jpg",
      },
      {
        name: "น้ำตกจำปาทอง",
        description: "น้ำตกสวยงามที่มีสายน้ำไหลลงมาจากหน้าผาสูง รายล้อมด้วยโขดหินและธรรมชาติอุดมสมบูรณ์",
        type: "WATERFALL",
        imageUrl: "/images/attractions/champa-thong-waterfall.jpg",
      },
    ],
    warnings: [
      {
        title: "โขดหินลื่นและระดับน้ำสูงช่วงฤดูฝน",
        description: "บริเวณหน้าผาน้ำตกและโขดหินมีคราบตะไคร่น้ำและกระแสน้ำไหลเชี่ยวในบางช่วง ควรเดินด้วยความระมัดระวัง",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
};

const keywordAttractionTypes = [
  { keywords: ["waterfall", "namtok", "water fall"], type: "WATERFALL" as const },
  { keywords: ["trail", "trek", "hiking", "forest"], type: "TRAIL" as const },
  { keywords: ["camp", "campsite"], type: "CAMPSITE" as const },
  { keywords: ["view", "doi", "peak", "cliff", "mist", "sea"], type: "VIEWPOINT" as const },
];

const correctedCoordinateMap = new Map(
  (correctedCoordinates as RawPark[]).map((park) => [
    park.nameEn,
    {
      latitude: park.latitude,
      longitude: park.longitude,
    },
  ]),
);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/national park/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function resolveSlug(rawPark: RawPark, usedSlugs: Set<string>) {
  const overrideSlug = curatedOverrides[rawPark.nameEn]?.slug;
  let candidate = overrideSlug ?? slugify(rawPark.nameEn || rawPark.name);

  if (!candidate) {
    candidate = `park-${usedSlugs.size + 1}`;
  }

  if (!usedSlugs.has(candidate)) {
    usedSlugs.add(candidate);
    return candidate;
  }

  const provinceSlug = slugify(rawPark.province);
  const withProvince = provinceSlug ? `${candidate}-${provinceSlug}` : `${candidate}-${usedSlugs.size + 1}`;

  if (!usedSlugs.has(withProvince)) {
    usedSlugs.add(withProvince);
    return withProvince;
  }

  let suffix = 2;
  while (usedSlugs.has(`${withProvince}-${suffix}`)) {
    suffix += 1;
  }

  const uniqueSlug = `${withProvince}-${suffix}`;
  usedSlugs.add(uniqueSlug);
  return uniqueSlug;
}

function splitOpeningHours(openingHours: string) {
  const [openTime = "08:00", closeTime = "16:30"] = openingHours.split("-").map((item) => item.trim());
  return { openTime, closeTime };
}

function inferAttractionType(name: string) {
  const normalized = name.toLowerCase();

  for (const matcher of keywordAttractionTypes) {
    if (matcher.keywords.some((keyword) => normalized.includes(keyword))) {
      return matcher.type;
    }
  }

  return "OTHER" as const;
}

function buildAttractions(rawPark: RawPark) {
  const overrideAttractions = curatedOverrides[rawPark.nameEn]?.attractions;

  if (overrideAttractions) {
    return overrideAttractions;
  }

  const tags = rawPark.tags?.filter(Boolean) ?? [];
  const tagAttractions = tags.slice(0, 3).map((tag) => ({
    name: tag,
    description: `Recommended activity highlight for ${rawPark.nameEn}.`,
    type: inferAttractionType(tag),
    imageUrl: undefined,
  }));

  if (tagAttractions.length > 0) {
    return tagAttractions;
  }

  return [
    {
      name: rawPark.nameEn,
      description: `Signature nature stop in ${rawPark.province}.`,
      type: inferAttractionType(rawPark.nameEn),
      imageUrl: undefined,
    },
  ];
}

function buildWarnings(rawPark: RawPark) {
  const overrideWarnings = curatedOverrides[rawPark.nameEn]?.warnings;

  if (overrideWarnings) {
    return overrideWarnings;
  }

  return [];
}

const usedSlugs = new Set<string>();

export const parks = (parksData as RawPark[]).map((rawPark) => {
  const { openTime, closeTime } = splitOpeningHours(rawPark.openingHours);
  const override = curatedOverrides[rawPark.nameEn];
  const correctedCoordinate = correctedCoordinateMap.get(rawPark.nameEn);

  return {
    slug: resolveSlug(rawPark, usedSlugs),
    nameTh: rawPark.name,
    nameEn: rawPark.nameEn,
    province: rawPark.province,
    region: "NORTH" as const,
    latitude: correctedCoordinate?.latitude ?? rawPark.latitude,
    longitude: correctedCoordinate?.longitude ?? rawPark.longitude,
    openTime,
    closeTime,
    description: rawPark.description,
    coverImageUrl: override?.coverImageUrl ?? null,
    isActive: true,
    attractions: buildAttractions(rawPark),
    warnings: buildWarnings(rawPark),
  };
});
