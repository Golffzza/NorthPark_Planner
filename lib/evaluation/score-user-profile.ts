//* ./lib/evaluation/score-user-profile.ts

import type {
  TransportMode,
  WeatherCondition,
} from "./types";

/**
 * ชื่อ function เดิมถูกเก็บไว้เพื่อ compatibility
 *
 * Logic ใหม่ใช้ประเมินความเหมาะสมในการเข้าถึงด้วยพาหนะ
 * ไม่ใช้จำนวนผู้เดินทางเป็นส่วนหนึ่งของคะแนนอีก
 *
 * WeatherCondition ยังอยู่ใน options เพื่อไม่ให้ call site เดิมพัง
 * แต่ไม่ถูกนำมาหักคะแนนซ้ำ เนื่องจากมี Weather Score แยกอยู่แล้ว
 */
function scoreTransportAccessibility(
  transportMode: TransportMode,
  options?: {
    hasDirectPublicTransit?: boolean;
    weatherCondition?: WeatherCondition;
  },
): number {
  switch (transportMode) {
    case "CAR":
      return 90;

    case "MOTORCYCLE":
      /**
       * ไม่ลดคะแนนเพียงเพราะผู้ใช้เลือกมอเตอร์ไซค์
       * เรื่องสภาพอากาศจะถูกประเมินใน Weather Score
       */
      return 90;

    case "PUBLIC_TRANSPORT":
      if (options?.hasDirectPublicTransit === true) {
        return 90;
      }

      if (options?.hasDirectPublicTransit === false) {
        /**
         * ยังมีความเป็นไปได้ในการเดินทาง
         * แต่ต้องต่อรถหรือจัดหาพาหนะเพิ่มเติม
         */
        return 55;
      }

      /**
       * ไม่มีข้อมูลยืนยันเรื่องรถตรง
       * จึงไม่ควรให้คะแนนสูงหรือต่ำเกินไป
       */
      return 70;

    case "OTHER":
    default:
      /**
       * ไม่มีข้อมูลเพียงพอเกี่ยวกับวิธีเดินทาง
       */
      return 70;
  }
}

export function scoreUserProfile(
  _travelerCount: number,
  transportMode: TransportMode,
  options?: {
    hasDirectPublicTransit?: boolean;
    weatherCondition?: WeatherCondition;
  },
): number {
  return scoreTransportAccessibility(
    transportMode,
    options,
  );
}