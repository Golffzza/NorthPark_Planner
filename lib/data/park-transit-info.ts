export type ParkTransitAccessibility = {
  hasDirectPublicTransit: boolean;
  transitType: "TRAIN" | "LOCAL_SONGTHAEW" | "PUBLIC_BUS" | "CHARTER_OR_PRIVATE";
  transitDescription: string;
  recommendation: string;
};

export const DEFAULT_TRANSIT_INFO: ParkTransitAccessibility = {
  hasDirectPublicTransit: false,
  transitType: "CHARTER_OR_PRIVATE",
  transitDescription: "ไม่มีรถโดยสารประจำทางขึ้นถึงที่ทำการอุทยานโดยตรง",
  recommendation: "แนะนำใช้รถยนต์ส่วนบุคคล หรือติดต่อเหมารถสองแถวในพื้นที่ล่วงหน้าเพื่อความปลอดภัย",
};

const PARK_TRANSIT_REGISTRY: Record<string, ParkTransitAccessibility> = {
  "ดอยอินทนนท์": {
    hasDirectPublicTransit: true,
    transitType: "LOCAL_SONGTHAEW",
    transitDescription: "มีรถสองแถวประจำทางสีเหลือง (สายจอมทอง-ดอยอินทนนท์) ให้บริการจากคิวรถหน้าวัดพระธาตุศรีจอมทอง ขึ้นถึงยอดดอยอินทนนท์",
    recommendation: "สามารถนั่งรถสองแถวเหลืองจากหน้าวัดพระธาตุศรีจอมทองได้สะดวก ควรตรวจสอบรอบรถเที่ยวสุดท้ายขากลับก่อน 16:00 น.",
  },
  "ดอยสุเทพ-ปุย": {
    hasDirectPublicTransit: true,
    transitType: "LOCAL_SONGTHAEW",
    transitDescription: "มีรถสองแถวแดงให้บริการจากหน้ามหาวิทยาลัยเชียงใหม่และสวนสัตว์เชียงใหม่ ขึ้นสู่พระธาตุดอยสุเทพและพระตำหนักภูพิงค์",
    recommendation: "มีรถสองแถวแดงขึ้นดอยสุเทพตลอดวัน หากต้องการขึ้นต่อยอดดอยปุยแนะนำต่อรถสองแถวท้องถิ่นช่วงเช้าถึงบ่าย",
  },
  "ดอยขุนตาล": {
    hasDirectPublicTransit: true,
    transitType: "TRAIN",
    transitDescription: "สามารถเดินทางด้วยรถไฟสายเหนือ ลงที่สถานีรถไฟขุนตาน แล้วเดินเท้าตามเส้นทางธรรมชาติขึ้นสู่ที่ทำการอุทยานได้โดยตรง",
    recommendation: "เดินทางด้วยรถไฟสะดวกมาก สามารถเช็ครอบรถไฟขบวนท้องถิ่นและขบวนด่วนพิเศษสายเหนือได้ตลอดปี",
  },
  "ห้วยน้ำดัง": {
    hasDirectPublicTransit: true,
    transitType: "PUBLIC_BUS",
    transitDescription: "สามารถนั่งรถตู้หรือรถประจำทางสายเชียงใหม่-ปาย ลงที่ปากทางเข้าอุทยาน (ด่านกิ่วลม) แล้วติดต่อรถรับ-ส่งของอุทยาน",
    recommendation: "นั่งรถตู้สายเชียงใหม่-ปาย ลงที่ปากทางเข้าอุทยาน แล้วต่อรถสองแถวหรือติดต่อเจ้าหน้าที่รับ-ส่งล่วงหน้า",
  },
  "แจ้ซ้อน": {
    hasDirectPublicTransit: true,
    transitType: "LOCAL_SONGTHAEW",
    transitDescription: "มีรถสองแถวสายลำปาง-เมืองปาน-แจ้ซ้อน ให้บริการจากตัวเมืองลำปาง (รอบเวลาจำกัด)",
    recommendation: "มีรถสองแถวจากตัวเมืองลำปางวิ่งถึงอุทยาน แต่มีรอบวิ่งจำกัด แนะนำออกเดินทางรอบเช้าก่อน 09:00 น.",
  },
  "ดอยผ้าห่มปก": {
    hasDirectPublicTransit: false,
    transitType: "CHARTER_OR_PRIVATE",
    transitDescription: "มีรถประจำทางถึงตัวอำเภอฝาง แต่การขึ้นสู่บ่อน้ำร้อนและลานกางเต็นท์กิ่วลมจำเป็นต้องเหมารถกระบะหรือ 4WD ในพื้นที่",
    recommendation: "นั่งรถตู้/บัสถึง อ.ฝาง แล้วติดต่อเหมารถ 4WD ของศูนย์บริการนักท่องเที่ยวหรือชาวบ้านล่วงหน้า",
  },
  "ดอยภูคา": {
    hasDirectPublicTransit: false,
    transitType: "CHARTER_OR_PRIVATE",
    transitDescription: "มีรถสองแถวจากปัวถึงแค่ปากทางขึ้นเขา ไม่ผ่านถึงที่ทำการหลักและจุดชมวิวยอดดอย",
    recommendation: "ไม่มีรถประจำทางวิ่งตรงถึงยอดดอยภูคา แนะนำเหมารถสองแถวจาก อ.ปัว หรือขับรถส่วนบุคคล",
  },
  "ศรีน่าน": {
    hasDirectPublicTransit: false,
    transitType: "CHARTER_OR_PRIVATE",
    transitDescription: "มีรถสองแถวถึง อ.นาน้อย แต่ไม่มีรถประจำทางขึ้นดอยเสมอดาวและผาชู้",
    recommendation: "เดินทางถึง อ.นาน้อย แล้วต้องเหมารถสองแถวท้องถิ่นขึ้นดอยเสมอดาว หรือเดินทางด้วยรถส่วนตัว",
  },
  "ภูสอยดาว": {
    hasDirectPublicTransit: false,
    transitType: "CHARTER_OR_PRIVATE",
    transitDescription: "ไม่มีรถโดยสารสาธารณะตรงถึงที่ทำการอุทยานภูสอยดาว",
    recommendation: "นั่งรถบัสถึง อ.ชาติตระการ หรือ อ.น้ำปาด แล้วต้องเหมารถสองแถวต่อไปยังอุทยานฯ ภูสอยดาว",
  },
  "แม่เมย": {
    hasDirectPublicTransit: false,
    transitType: "CHARTER_OR_PRIVATE",
    transitDescription: "ไม่มีรถโดยสารประจำทางวิ่งขึ้นสู่จุดชมวิวม่อนคลุยและม่อนครูบาใส",
    recommendation: "เส้นทางขึ้นเขาสูงชันและไม่มีรถประจำทาง จำเป็นต้องใช้รถยนต์ส่วนบุคคลหรือเหมารถกระบะในพื้นที่",
  },
};

export function getParkTransitInfo(parkNameTh: string): ParkTransitAccessibility {
  if (!parkNameTh) return DEFAULT_TRANSIT_INFO;

  if (PARK_TRANSIT_REGISTRY[parkNameTh]) {
    return PARK_TRANSIT_REGISTRY[parkNameTh];
  }

  for (const [key, value] of Object.entries(PARK_TRANSIT_REGISTRY)) {
    if (parkNameTh.includes(key) || key.includes(parkNameTh)) {
      return value;
    }
  }

  return DEFAULT_TRANSIT_INFO;
}
