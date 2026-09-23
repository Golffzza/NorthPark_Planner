// ===============================
// BE <-> CE helpers (พ.ศ. <-> ค.ศ.)
// ===============================

/** แปลง YYYY-MM-DD ที่อาจเป็นปี พ.ศ. (>=2400) ให้เป็น ค.ศ. */
export function normalizeYMD(input: string) {
  const raw = String(input || "").trim();

  // รองรับ ISO เต็ม "2026-02-05T..." -> เอา 10 ตัวแรกก่อน
  const head = raw.length >= 10 ? raw.slice(0, 10) : raw;

  const [yy, mm, dd] = head.split("-").map(Number);
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return head;

  let y = yy;
  if (y >= 2400) y = y - 543;

  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad2(mm)}-${pad2(dd)}`;
}

/** แปลง YYYY-MM-DD (พ.ศ./ค.ศ. ได้) เป็น Date (local) */
export function fromYMD(input: string) {
  const s = normalizeYMD(input);
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** คืน YYYY-MM-DD จาก Date (local) */
export function toYMD(d: Date) {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** alias ชื่อเดิม (กันไฟล์เก่า import อยู่) */
export const toISODateString = toYMD;

/** เอา date จาก ISO datetime ให้เป็น YYYY-MM-DD (รองรับพ.ศ.ถ้ามีคนส่งมาแปลกๆ) */
export function dateOnly(input: string) {
  return normalizeYMD(input);
}

// ===============================
// Thai labels
// ===============================

export const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
export const THAI_DAYS_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

/** Format month+year ไทย (พ.ศ.) */
export function formatMonthYear(date: Date, short = false) {
  const month = short ? THAI_MONTHS_SHORT[date.getMonth()] : THAI_MONTHS[date.getMonth()];
  const year = date.getFullYear() + 543;
  return `${month} ${year}`;
}

/** Format วันที่แบบไทย (รองรับ string/date) */
export function formatThaiDate(
  date: Date | string,
  options: { short?: boolean; includeYear?: boolean; includeDay?: boolean } = {},
) {
  if (!date) return "";
  const d = typeof date === "string" ? fromYMD(date) : date;
  if (isNaN(d.getTime())) return "";
  const { short = false, includeYear = true, includeDay = false } = options;

  const day = d.getDate();
  const month = short ? THAI_MONTHS_SHORT[d.getMonth()] : THAI_MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543;
  const dayName = THAI_DAYS[d.getDay()];

  let result = `${day} ${month}`;
  if (includeYear) result += ` ${short ? year.toString().slice(-2) : year}`;
  if (includeDay) result = `วัน${dayName} ${result}`;
  return result;
}

// ===============================
// Date utils used by calendar
// ===============================

export function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

export function isToday(date: Date) {
  return isSameDay(date, new Date());
}

export function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function isPast(date: Date) {
  const today = startOfDay(new Date());
  const checkDate = startOfDay(new Date(date));
  return checkDate < today;
}

export function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** ปฏิทิน 42 ช่อง (6 สัปดาห์) */
export function getCalendarDays(currentMonth: Date) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();

  const days: Date[] = [];

  for (let i = startPadding - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ===============================
// Time helpers
// ===============================

export function formatTime(time: string) {
  const [hours, minutes] = time.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")} น.`;
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
