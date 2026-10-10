//* ./lib/evaluation/build-factor-reasons.ts

import type {
  TripEvaluationInput,
  TransportMode,
  WeatherCondition,
} from "./types";
import { getTripTimeline } from "./trip-timeline";

function formatDuration(minutes: number): string {
  const safeMinutes = Math.max(
    0,
    Math.round(minutes),
  );

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} นาที`;
  }

  if (remainingMinutes === 0) {
    return `${hours} ชั่วโมง`;
  }

  return `${hours} ชั่วโมง ${remainingMinutes} นาที`;
}

const WEATHER_REASONS: Record<
  WeatherCondition,
  string
> = {
  CLEAR:
    "สภาพอากาศโดยรวมเอื้อต่อการเดินทาง",
  CLOUDY:
    "มีเมฆมากในช่วงวันที่ประเมิน ควรตรวจสอบพยากรณ์อากาศก่อนเดินทาง",
  LIGHT_RAIN:
    "มีฝนเล็กน้อยในช่วงวันที่ประเมิน จึงเป็นปัจจัยที่ควรตรวจสอบก่อนเดินทาง",
  HEAVY_RAIN:
    "มีฝนตกหนักในช่วงวันที่ประเมิน ควรตรวจสอบพยากรณ์อากาศก่อนเดินทาง",
  STORM:
    "มีสภาพอากาศรุนแรง ควรตรวจสอบสถานการณ์อีกครั้งก่อนเดินทาง",
};

function buildAccessibilityReason(
  transportMode: TransportMode,
  hasDirectPublicTransit?: boolean,
): string {
  switch (transportMode) {
    case "CAR":
      return "เดินทางด้วยรถยนต์ส่วนบุคคล จึงสามารถวางแผนการเข้าถึงจุดหมายได้ค่อนข้างยืดหยุ่น";

    case "MOTORCYCLE":
      return "เดินทางด้วยรถจักรยานยนต์และสามารถวางแผนการเดินทางด้วยตนเองได้";

    case "PUBLIC_TRANSPORT":
      if (hasDirectPublicTransit === true) {
        return "มีข้อมูลว่าระบบขนส่งสาธารณะสามารถเข้าถึงจุดหมายได้โดยตรง";
      }

      if (hasDirectPublicTransit === false) {
        return "ไม่มีระบบขนส่งสาธารณะตรงถึงจุดหมาย จึงอาจต้องวางแผนต่อรถหรือหาพาหนะเพิ่มเติม";
      }

      return "ยังไม่มีข้อมูลยืนยันว่ามีระบบขนส่งสาธารณะตรงถึงจุดหมาย";

    case "OTHER":
    default:
      return "ข้อมูลรูปแบบการเดินทางยังไม่เพียงพอสำหรับประเมินการเข้าถึงอย่างละเอียด";
  }
}

export function buildFactorReasons(input: {
  tripDate?: TripEvaluationInput["tripDate"];
  timeZone?: TripEvaluationInput["timeZone"];
  weatherCondition: WeatherCondition;
  estimatedTravelMinutes: number;
  departAt: string;
  transportMode: TransportMode;
  hasDirectPublicTransit?: boolean;
}) {
  const arrival = getTripTimeline(input);
  const dayText = arrival.dayOffset > 0
    ? arrival.dayOffset === 1 ? " (วันถัดไป)" : ` (อีก ${arrival.dayOffset} วัน)`
    : "";

  return {
    weather: WEATHER_REASONS[
      input.weatherCondition
    ],

    duration: `ใช้เวลาเดินทางโดยประมาณ ${formatDuration(
      input.estimatedTravelMinutes,
    )}`,

    time: `จากเวลาออกเดินทางและระยะเวลาโดยประมาณ คาดว่าจะถึงจุดหมายประมาณ ${arrival.arrivalTime} น.${dayText}`,

    userProfile: buildAccessibilityReason(
      input.transportMode,
      input.hasDirectPublicTransit,
    ),
  };
}
