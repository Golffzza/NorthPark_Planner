// ./lib/chat/core/park-catalog.ts

import knowledgeIndex from "@/data/knowledge/knowledge-index.json";

import type { ParkReference } from "@/lib/chat/shared/contracts";
import { normalizeQuery, isNegated } from "./query-signals";

export type ParkCatalogEntry = ParkReference & {
  nameEn: string;
  provinces: string[];
  legalStatus: string;
  tags: string[];
  attractionCount: number;
  verifiedAt: string;
};

type RawPark = (typeof knowledgeIndex)[number];

function normalize(value: string): string {
  return normalizeQuery(value).replace(/[-–—]/g, "");
}

function toEntry(park: RawPark): ParkCatalogEntry {
  return {
    id: park.slug,
    slug: park.slug,
    name: park.nameTh,
    nameEn: park.nameEn,
    provinces: [...park.provinces],
    legalStatus: park.legalStatus,
    tags: [...park.tags],
    attractionCount: park.attractionCount,
    verifiedAt: park.verifiedAt,
  };
}

const catalog = knowledgeIndex.map(toEntry);

export function getParkCatalog(): ParkCatalogEntry[] {
  return catalog.map((park) => ({
    ...park,
    provinces: [...park.provinces],
    tags: [...park.tags],
  }));
}

export function getKnownProvinces(): string[] {
  return [...new Set(catalog.flatMap((park) => park.provinces))].sort((a, b) =>
    a.localeCompare(b, "th"),
  );
}

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;
  const la = a.length;
  const lb = b.length;
  const d: number[][] = [];
  for (let i = 0; i <= la; i++) d[i] = [i];
  for (let j = 0; j <= lb; j++) d[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return 1.0 - d[la][lb] / Math.max(la, lb);
}

export function findMentionedParks(query: string): ParkCatalogEntry[] {
  const normalized = normalize(query);

  const aliases: Record<string, string[]> = {
    "doi-suthep-pui": ["ดอยสุเทพ", "สุเทพปุย", "สุเทพ"],
    "doi-inthanon": ["อินทนนท์"],
    "si-lanna": ["ศรีลานนา", "ศรีล้านนา"],
    "doi-soi-malai": ["ดอยสอยมาลัย"],
    "phu-hin-rong-kla": ["ภูหินร่องกล้า", "ร่องกล้า"],
  };

  const exactMatches = catalog
    .map((park) => {
      const names = [
        park.name,
        park.name.replace(/^อุทยานแห่งชาติ/, ""),
        park.nameEn,
        park.nameEn.replace(/ National Park$/i, ""),
        ...(aliases[park.slug] ?? []),
      ];
      const positions = names
        .map((name) => normalized.indexOf(normalize(name)))
        .filter((i) => i >= 0);
      return { park, position: positions.length ? Math.min(...positions) : -1 };
    })
    .filter((item) => item.position >= 0)
    .sort((a, b) => a.position - b.position)
    .map((item) => item.park);

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  // Fuzzy matching for typo / misspelling handling
  const cleanQuery = normalized.replace(/^อุทยานแห่งชาติ|^อุทยาน/, "").trim();
  if (cleanQuery.length >= 3) {
    const fuzzyCandidates = catalog
      .map((park) => {
        const names = [
          park.name,
          park.name.replace(/^อุทยานแห่งชาติ/, ""),
          ...(aliases[park.slug] ?? []),
        ];
        let maxSim = 0;
        for (const name of names) {
          const normName = normalize(name).replace(/^อุทยานแห่งชาติ|^อุทยาน/, "");
          const sim = levenshteinSimilarity(cleanQuery, normName);
          if (sim > maxSim) maxSim = sim;
        }
        return { park, similarity: maxSim };
      })
      .filter((item) => item.similarity >= 0.65)
      .sort((a, b) => b.similarity - a.similarity);

    if (fuzzyCandidates.length > 0) {
      return [fuzzyCandidates[0].park];
    }
  }

  return [];
}

// Entity vocabulary only; knowledge coverage still comes from the catalog.
const THAI_PROVINCES = "กรุงเทพมหานคร กระบี่ กาญจนบุรี กาฬสินธุ์ กำแพงเพชร ขอนแก่น จันทบุรี ฉะเชิงเทรา ชลบุรี ชัยนาท ชัยภูมิ ชุมพร เชียงราย เชียงใหม่ ตรัง ตราด ตาก นครนายก นครปฐม นครพนม นครราชสีมา นครศรีธรรมราช นครสวรรค์ นนทบุรี นราธิวาส น่าน บึงกาฬ บุรีรัมย์ ปทุมธานี ประจวบคีรีขันธ์ ปราจีนบุรี ปัตตานี พระนครศรีอยุธยา พะเยา พังงา พัทลุง พิจิตร พิษณุโลก เพชรบุรี เพชรบูรณ์ แพร่ ภูเก็ต มหาสารคาม มุกดาหาร แม่ฮ่องสอน ยโสธร ยะลา ร้อยเอ็ด ระนอง ระยอง ราชบุรี ลพบุรี ลำปาง ลำพูน เลย ศรีสะเกษ สกลนคร สงขลา สตูล สมุทรปราการ สมุทรสงคราม สมุทรสาคร สระแก้ว สระบุรี สิงห์บุรี สุโขทัย สุพรรณบุรี สุราษฎร์ธานี สุรินทร์ หนองคาย หนองบัวลำภู อ่างทอง อำนาจเจริญ อุดรธานี อุตรดิตถ์ อุทัยธานี อุบลราชธานี".split(" ");

export function detectProvince(query: string): string | undefined {
  const text = normalizeQuery(query);
  return THAI_PROVINCES.map(province => ({province, index: text.lastIndexOf(province)}))
    .filter(item => item.index >= 0 && !isNegated(text, item.index))
    .sort((a,b) => b.index - a.index)[0]?.province;
}

export type StructuredFactAnswer = {
  message: string;
  parks?: ParkReference[];
};

export function answerStructuredFact(
  query: string,
  parks = getParkCatalog(),
): StructuredFactAnswer | undefined {
  const normalized = normalize(query);
  const provinces = [...new Set(parks.flatMap((park) => park.provinces))].sort(
    (a, b) => a.localeCompare(b, "th"),
  );
  const province = detectProvince(query);
  const asksCount = /กี่(แห่ง|ที่)|จำนวน/.test(normalized);
  const asksList = /รายชื่อ|อุทยานอะไร|อะไรบ้าง|ที่ไหนบ้าง|ทั้งหมด/.test(normalized);

  if (province && (asksCount || asksList)) {
    const matches = parks.filter((park) => park.provinces.includes(province));
    if (!matches.length) return {message: `ยังไม่มีข้อมูลอุทยานในจังหวัด${province}ในฐานความรู้ NorthPark ครับ ไม่ได้หมายความว่าจังหวัดนี้ไม่มีอุทยาน`, parks: []};
    if (asksCount) {
      return {
        message: `${province}มีอุทยานในฐานข้อมูล NorthPark ${matches.length} แห่งครับ`,
        parks: matches,
      };
    }
    return {
      message: `${province}มีอุทยานในฐานข้อมูล NorthPark ได้แก่\n${matches
        .map((park, index) => `${index + 1}. ${park.name}`)
        .join("\n")}`,
      parks: matches,
    };
  }

  if (/จังหวัด.*อะไรบ้าง|มีจังหวัด/.test(normalized)) {
    return {
      message: `ฐานข้อมูล NorthPark ครอบคลุม ${provinces.length} จังหวัด ได้แก่ ${provinces.join(
        ", ",
      )}`,
    };
  }

  if (/รายชื่อ.*อุทยาน|อุทยาน.*ทั้งหมด/.test(normalized) && !asksCount) {
    return {
      message: `รายชื่ออุทยานในฐานข้อมูล NorthPark ทั้งหมด ${parks.length} แห่ง:\n${parks
        .map((park, index) => `${index + 1}. ${park.name}`)
        .join("\n")}`,
      parks,
    };
  }

  if (asksCount && /อุทยาน|ข้อมูล|ทั้งหมด/.test(normalized)) {
    return {
      message: `ตอนนี้ NorthPark มีข้อมูลอุทยานทั้งหมด ${parks.length} แห่งครับ`,
    };
  }

  return undefined;
}
