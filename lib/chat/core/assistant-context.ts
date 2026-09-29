// ./lib/chat/core/assistant-context.ts

import type { AssistantConstraints, AssistantContext } from "@/lib/chat/shared/contracts";
import { detectProvince } from "./park-catalog";
import { ACTIVITY_WORDS, isNegated, normalizeQuery } from "./query-signals";

export type ContextPatch = AssistantConstraints & { replaceActivities?: boolean; reset?: boolean };

export function extractContextPatch(message: string): ContextPatch {
  const query = normalizeQuery(message);
  const province = detectProvince(query);
  const activities: string[] = [], excludedActivities: string[] = [];
  for (const [activity, words] of Object.entries(ACTIVITY_WORDS)) {
    for (const word of words) {
      const index = query.lastIndexOf(word);
      if (index >= 0) (isNegated(query, index) ? excludedActivities : activities).push(activity);
    }
  }
  let fatigue: AssistantConstraints["fatigue"];
  if (/ไม่(?:อยาก|เอา|ต้องการ)?เดิน(?:หนัก|ไกล|เยอะ)|เดินไม่เยอะ|เดินน้อย|เดินนิดเดียว|ทางเดินง่าย|ไม่อยากเหนื่อย|เที่ยวสบาย|ใช้แรงน้อย/.test(query)) fatigue = "LOW";
  else if (/เดินหนัก|เดินไกล|ท้าทาย|ขึ้นเขา/.test(query)) fatigue = "HIGH";
  else if (/เดินปานกลาง|แรงปานกลาง/.test(query)) fatigue = "MEDIUM";
  let companions: string[] | undefined;
  if (/ไปคนเดียว|ไปเอง|ไม่.*(พ่อแม่|ครอบครัว|เด็ก)/.test(query)) companions = [];
  else if (/พ่อแม่|ผู้สูงอายุ|ผู้สูงวัย|คนแก่/.test(query)) companions = /พ่อแม่/.test(query) ? ["FAMILY", "ELDERLY"] : ["ELDERLY"];
  else if (/ครอบครัว|ลูก|เด็ก/.test(query)) companions = ["FAMILY"];
  const duration = query.match(/(\d{1,2})วัน/);
  const durationWord = query.match(/(หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ)วัน/);
  const durationWords: Record<string, number> = {
    หนึ่ง: 1, สอง: 2, สาม: 3, สี่: 4, ห้า: 5,
    หก: 6, เจ็ด: 7, แปด: 8, เก้า: 9, สิบ: 10,
  };
  const durationDays = duration
    ? Number(duration[1])
    : durationWord
      ? durationWords[durationWord[1]]
      : undefined;
  return {
    ...(province ? {province} : {}), ...(fatigue ? {fatigue} : {}),
    ...(activities.length ? {activities: [...new Set(activities)]} : {}),
    ...(excludedActivities.length ? {excludedActivities: [...new Set(excludedActivities)]} : {}),
    ...(companions ? {companions} : {}),
    ...(durationDays && durationDays > 0 ? {durationDays} : {}),
    ...(/เปลี่ยนเป็น|เอาแค่|เอาเฉพาะ/.test(query) && activities.length ? {replaceActivities: true} : {}),
    ...(/ล้างเงื่อนไข|เริ่มใหม่|ไม่จำกัดเงื่อนไข/.test(query) ? {reset: true} : {}),
  };
}

export function mergeAssistantContext(current: AssistantContext, patch: ContextPatch): AssistantContext {
  const {replaceActivities, reset, ...values} = patch;
  const previous = reset ? {} : current.userConstraints ?? {};
  const excluded = new Set([...(previous.excludedActivities ?? []), ...(values.excludedActivities ?? [])]);
  for (const activity of values.activities ?? []) excluded.delete(activity);
  const activities = [...new Set([...(replaceActivities ? [] : previous.activities ?? []), ...(values.activities ?? [])])]
    .filter(activity => !excluded.has(activity));
  return {...(reset ? {} : current), userConstraints: {
    ...previous, ...values,
    ...(previous.activities || values.activities || excluded.size ? {activities} : {}),
    ...(previous.excludedActivities || values.excludedActivities ? {excludedActivities: [...excluded]} : {}),
  }};
}
