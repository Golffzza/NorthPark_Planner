//* ./lib/evaluation/score-time-suitability.ts

import { DEFAULT_MOCK_SUNSET_TIME } from "./constants";
import { getTripTimeline } from "./trip-timeline";
import type { TripEvaluationInput } from "./types";

type TimeSuitabilityInput = Pick<TripEvaluationInput,
  "tripDate" | "timeZone" | "departAt" | "estimatedTravelMinutes" |
  "sunsetAt" | "mockSunsetTime" | "parkOpenTime" | "parkCloseTime">;

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

export function scoreTimeSuitability(
  input: TimeSuitabilityInput,
): number {
  const timeline = getTripTimeline({
    ...input,
    mockSunsetTime: input.sunsetAt
      ? undefined
      : input.mockSunsetTime ?? DEFAULT_MOCK_SUNSET_TIME,
  });
  const arrivalMinutes = timeline.arrivalMinutes;

  const openMinutes = toMinutes(input.parkOpenTime);
  const closeMinutes = toMinutes(input.parkCloseTime);

  // Stored tourism hours are an advisory time signal, not a verified entry cutoff.
  if (arrivalMinutes > closeMinutes) {
    return 30;
  }

  /**
   * ถึงก่อนอุทยานเปิด
   *
   * ไม่ใช้ "เวลาออกจากต้นทาง" เปรียบเทียบกับเวลาเปิดอีกแล้ว
   * เพราะสิ่งที่มีผลจริงคือเวลาที่ผู้ใช้ไปถึง
   */
  const minutesBeforeOpen =
    openMinutes - arrivalMinutes;

  if (minutesBeforeOpen > 60) {
    return 65;
  }

  if (minutesBeforeOpen > 0) {
    return 80;
  }

  /**
   * เมื่อมาถึงหลังเวลาเปิดแล้ว
   * ใช้เวลาที่เหลือก่อนปิดเป็นเงื่อนไขหลัก
   */
  const minutesBeforeClose =
    closeMinutes - arrivalMinutes;

  let score: number;

  if (minutesBeforeClose < 30) {
    score = 30;
  } else if (minutesBeforeClose < 60) {
    score = 50;
  } else if (minutesBeforeClose < 120) {
    score = 70;
  } else {
    score = 90;
  }

  /**
   * พระอาทิตย์ตกใช้เป็นปัจจัยประกอบ
   * ไม่ใช่ hard constraint
   */
  if (!timeline.sunsetAt) return score;

  const minutesBeforeSunset =
    (timeline.sunsetAt.getTime() - timeline.arrivalAt.getTime()) / 60_000;

  if (minutesBeforeSunset < 0) {
    score = Math.min(score, 55);
  } else if (minutesBeforeSunset < 60) {
    score = Math.min(score, 65);
  } else if (minutesBeforeSunset < 120) {
    score = Math.min(score, 80);
  }

  return score;
}
