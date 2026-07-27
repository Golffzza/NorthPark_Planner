export const TRANSPORT_MODE_OPTIONS = [
  { value: "CAR", label: "รถยนต์ส่วนตัว" },
  { value: "MOTORCYCLE", label: "รถจักรยานยนต์" },
  { value: "PUBLIC_TRANSPORT", label: "ขนส่งสาธารณะ" },
  { value: "OTHER", label: "อื่น ๆ" },
] as const;

export const WEATHER_CONDITION_OPTIONS = [
  { value: "CLEAR", label: "อากาศแจ่มใส" },
  { value: "CLOUDY", label: "มีเมฆมาก" },
  { value: "LIGHT_RAIN", label: "ฝนเล็กน้อย" },
  { value: "HEAVY_RAIN", label: "ฝนตกหนัก" },
  { value: "STORM", label: "พายุ / สภาพอากาศเสี่ยง" },
] as const;

export const TRIP_STATUS_LABELS: Record<string, string> = {
  DRAFT: "รอประเมิน",
  EVALUATED: "ประเมินแล้ว",
  CANCELLED: "ยกเลิกแล้ว",
  COMPLETED: "เสร็จสิ้น",
};

export const EVALUATION_LEVEL_LABELS: Record<string, string> = {
  EXCELLENT: "เหมาะสมมาก",
  GOOD: "เหมาะสม",
  MODERATE: "ปานกลาง",
  NEEDS_ADJUSTMENT: "ควรปรับแผน",
};

export const WEATHER_CONDITION_LABELS = Object.fromEntries(
  WEATHER_CONDITION_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

export const TRANSPORT_MODE_LABELS = Object.fromEntries(
  TRANSPORT_MODE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>;

export function getTripStatusLabel(status: string) {
  return TRIP_STATUS_LABELS[status] ?? status;
}

export function getEvaluationLevelLabel(level: string) {
  return EVALUATION_LEVEL_LABELS[level] ?? level;
}

export function getWeatherConditionLabel(condition: string) {
  return WEATHER_CONDITION_LABELS[condition] ?? condition;
}

export function getTransportModeLabel(mode: string) {
  return TRANSPORT_MODE_LABELS[mode] ?? mode;
}
