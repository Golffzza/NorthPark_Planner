//* ./lib/evaluation/constants.ts

import type { EvaluationLevel, WeatherCondition } from "./types";

export const EVALUATION_WEIGHTS = {
  weather: 0.35,
  duration: 0.25,
  time: 0.2,

  // ชื่อเดิมถูกเก็บไว้เพื่อไม่ให้ส่วนอื่นของระบบพัง
  // แต่คะแนนนี้จะใช้ประเมินความเหมาะสม/การเข้าถึงด้วยพาหนะ
  // ไม่ใช้จำนวนผู้เดินทางมาหักคะแนนอีก
  userProfile: 0.2,
} as const;

export const WEATHER_SCORES: Record<WeatherCondition, number> = {
  CLEAR: 95,
  CLOUDY: 80,
  LIGHT_RAIN: 60,
  HEAVY_RAIN: 35,
  STORM: 10,
};

/**
 * ใช้เป็น fallback เฉพาะกรณีที่ระบบยังไม่มีเวลาพระอาทิตย์ตกจริง
 * ในอนาคตควรเปลี่ยนเป็นข้อมูล sunset ตามวันที่และตำแหน่งจริง
 */
export const DEFAULT_MOCK_SUNSET_TIME = "18:30";

export const SCORE_LEVELS: Array<{
  min: number;
  level: EvaluationLevel;
}> = [
  { min: 80, level: "EXCELLENT" },
  { min: 60, level: "GOOD" },
  { min: 40, level: "MODERATE" },
  { min: 0, level: "NEEDS_ADJUSTMENT" },
];