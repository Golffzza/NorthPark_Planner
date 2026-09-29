// ./lib/chat/core/query-signals.ts

export function normalizeQuery(text: string): string {
  return text.normalize("NFC").replace(/\u0e4d\u0e32/g, "ำ").toLowerCase().replace(/\s+/g, "");
}

export const ACTIVITY_WORDS: Record<string, string[]> = {
  WATERFALL: ["น้ำตก"],
  CAMPSITE: ["กางเต็นท์", "กางเต้นท์", "ลานเต็นท์", "แคมป์ปิ้ง", "แคมป์"],
  VIEWPOINT: ["จุดชมวิว", "ชมวิว", "วิวสวย", "ทะเลหมอก", "ดูหมอก"],
  TRAIL: ["เดินป่า", "เดินเขา", "เดินเทรล", "เทรคกิ้ง", "เทรกกิ้ง", "เส้นทางศึกษาธรรมชาติ"],
  HOT_SPRING: ["น้ำพุร้อน", "บ่อน้ำร้อน", "ออนเซ็น"],
  CAVE: ["ถ้ำ"],
  GEOLOGY: ["ธรณี", "เสาดิน", "หินผา"],
  RIVER: ["แม่น้ำ", "ลำน้ำ"],
  BOAT: ["ล่องเรือ", "นั่งเรือ"],
  RESERVOIR: ["อ่างเก็บน้ำ", "เขื่อน"],
  RAFTING: ["ล่องแก่ง", "พายเรือยาง"],
  FLOWER: ["ชมดอกไม้", "ดอกไม้", "ดอกพญาเสือโคร่ง"],
  SAVANNA: ["ทุ่งหญ้า", "สะวันนา"],
  WILDLIFE: ["สัตว์ป่า", "นกยูง"],
  HISTORY: ["ประวัติศาสตร์", "โบราณสถาน"],
  CULTURE: ["วัฒนธรรม"],
};

export function isNegated(query: string, position: number): boolean {
  const prefix = query.slice(0, position);
  const negations = ["ไม่ต้องการ", "ไม่อยาก", "ไม่เที่ยว", "ไม่ชอบ", "ไม่เอา", "ไม่ไป", "ไม่ดู", "ยกเลิก", "เลิก", "งด", "ไม่"];
  const matches = negations
    .map((word) => ({ word, index: prefix.lastIndexOf(word) }))
    .filter((match) => match.index >= 0)
    .sort((a, b) => b.index - a.index || b.word.length - a.word.length);
  const negation = matches[0];
  if (!negation) return false;

  const negationEnd = negation.index + negation.word.length;
  const boundaries = ["เปลี่ยนเป็น", "เปลี่ยน", "แต่ขอ", "แล้วขอ", "แต่", "ขอ", "อยาก", "สนใจ", "เล็ง", "จะไป", "ไป", ",", ";"];
  const lastBoundary = Math.max(...boundaries.map((word) => {
    const index = prefix.lastIndexOf(word);
    return index >= negationEnd ? index : -1;
  }));
  if (lastBoundary >= 0) return false;

  return negation.word !== "ไม่" || prefix.length - negation.index <= 6;
}

export function requiresLiveData(message: string): boolean {
  return /เปิดไหม|เปิดหรือ|เปิดกี่โมง|เปิดวันไหน|เปิดเมื่อไร|ปิดไหม|ปิดหรือ|ปิดกี่โมง|เวลาเปิด|เวลา.*ปิด|ยังเปิดอยู่|เข้าได้ไหม|ค่าเข้า|ค่าธรรมเนียม|ราคาบัตร|ซื้อตั๋ว|เสียค่า|จอง|ว่างไหม|ว่างหรือเปล่า|ยังว่าง|วันนี้|พรุ่งนี้|ตอนนี้|สถานะล่าสุด|อากาศ|ฝนตก|(?:ถนน|ทางขึ้น).*(?:ผ่าน|ปิด|ใช้ได้|เป็นยังไง)|ดอก.*บาน/.test(normalizeQuery(message));
}

export function asksForParkRationale(message: string): boolean {
  const query = normalizeQuery(message);

  return (
    /ทำไม.*(?:น่าไป|ควรไป|ต้องไป|น่าเที่ยว)/.test(query) ||
    /(?:น่าไป|ควรไป|ต้องไป|น่าเที่ยว).*เพราะอะไร/.test(query) ||
    /(?:พิเศษ|โดดเด่น)(?:ยังไง|อย่างไร|ตรงไหน)/.test(query) ||
    /(?:มีดีอะไร|ดีตรงไหน|น่าสนใจตรงไหน|จุดเด่น(?:คือ|มี|อะไร)|เหตุผล.*(?:น่าไป|ควรไป))/.test(
      query,
    )
  );
}

export function isParkInformationFollowUp(message: string): boolean {
  const query = normalizeQuery(message);
  return asksForParkRationale(query)
    || /^(?:แล้ว)?มี.*(?:ไหม|หรือเปล่า|อะไรบ้าง)$/.test(query)
    || /^(?:แล้ว)?(?:ที่พัก|บ้านพัก|ห้องน้ำ|ที่จอดรถ|อาหาร|สิ่งอำนวย|น้ำตก|กิจกรรม).*ล่ะ$/.test(query)
    || /เดินทาง.*(?:ยังไง|อย่างไร)|ไป(?:ยังไง|อย่างไร)|เข้าทางไหน/.test(query)
    || /เปิดกี่โมง|ปิดกี่โมง|เวลาเปิด|เวลา.*ปิด|ค่าเข้า|ค่าธรรมเนียม|ราคาบัตร/.test(query)
    || /(?:ปลอดภัย|อันตราย|ข้อควรระวัง).*(?:ไหม|อะไร|ยังไง)?/.test(query);
}

export function isGreeting(message: string): boolean {
  return /^(สวัสดี(ครับ|ค่ะ|คะ)?|หวัดดี(ครับ|ค่ะ)?|ดีครับ|hello|hi|ขอบคุณ(ครับ|ค่ะ)?|โอเค|ok)[!?.ๆ]*$/i.test(normalizeQuery(message));
}
