// ./lib/services/province-route-service.ts

import {
  getProvinceCoordinate,
  calculateHaversineDistanceKm,
  type ProvinceCoordinate,
} from "@/lib/data/province-coordinates";
import { parks } from "@/prisma/seed-data/parks";

export type ParkDistanceEstimate = {
  slug: string;
  nameTh: string;
  province: string;
  distanceKm: number;
  estimatedDrivingMinutes: number;
  openTime: string;
  closeTime: string;
  hasCampsite: boolean;
  highlightAttraction?: string;
};

export type NearbyParksFromOriginResult = {
  originName: string;
  originLat: number;
  originLng: number;
  parks: ParkDistanceEstimate[];
};

/**
 * คำนวณระยะทางและเวลาขับรถโดยประมาณจากจุดศูนย์กลางจังหวัดไปยังอุทยานแห่งชาติ
 * โดยใช้ระยะทางจริง + ค่าชดเชยเส้นทางโค้งเขา (Winding factor ~1.25x สำหรับภาคเหนือ)
 */
export function findNearbyParksFromOrigin(
  originQuery: string | { lat: number; lng: number; name?: string },
  limit = 5,
): NearbyParksFromOriginResult | null {
  let originLat: number;
  let originLng: number;
  let originName: string;

  if (typeof originQuery === "string") {
    const matchedProvince = getProvinceCoordinate(originQuery);
    if (!matchedProvince) {
      return null;
    }
    originLat = matchedProvince.lat;
    originLng = matchedProvince.lng;
    originName = `ตัวเมือง${matchedProvince.name}`;
  } else {
    originLat = originQuery.lat;
    originLng = originQuery.lng;
    originName = originQuery.name || "พิกัดที่คุณระบุ";
  }

  const parkDistances: ParkDistanceEstimate[] = parks.map((park) => {
    const directDistance = calculateHaversineDistanceKm(
      originLat,
      originLng,
      park.latitude,
      park.longitude,
    );

    // ปัจจัยถนนจริงในภาคเหนือ: ระยะทางบนถนนเฉลี่ยประมาณ 1.25 - 1.35 เท่าของระยะเส้นตรง
    const roadDistanceKm = Math.round(directDistance * 1.28);

    // ความเร็วเฉลี่ยบนถนนเส้นทางหลัก + ทางขึ้นเขา (ประมาณ 55-65 กม./ชม.)
    const estimatedMinutes = Math.round((roadDistanceKm / 60) * 60);

    const hasCampsite = park.attractions.some(
      (a) => a.type === "CAMPSITE" || a.name.includes("กางเต็นท์") || a.name.includes("แค้มป์"),
    );

    return {
      slug: park.slug,
      nameTh: park.nameTh,
      province: park.province,
      distanceKm: roadDistanceKm,
      estimatedDrivingMinutes: estimatedMinutes,
      openTime: park.openTime,
      closeTime: park.closeTime,
      hasCampsite,
      highlightAttraction: park.attractions[0]?.name,
    };
  });

  // จัดเรียงตามระยะทางจากใกล้ไปไกล
  parkDistances.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    originName,
    originLat,
    originLng,
    parks: parkDistances.slice(0, limit),
  };
}
