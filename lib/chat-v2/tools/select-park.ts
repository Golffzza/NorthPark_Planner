// ./lib/chat-v2/tools/select-park.ts

import { tool } from "ai";
import { z } from "zod";

import { findMentionedParks } from "@/lib/chat/core/park-catalog";
import type { ParkReference } from "@/lib/chat/shared/contracts";
import { setSelectedPark } from "@/lib/chat-v2/state/conversation-state";
import type { AssistantV2TurnContext } from "@/lib/chat-v2/tools/turn-context";

export const selectParkInputSchema = z.object({
  position: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("ลำดับแบบเริ่มจาก 1 ใน Current results"),
  parkName: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("ชื่ออุทยานที่ผู้ใช้ระบุชัดเจน หรือชื่อใน Current results"),
});

type SelectParkInput = z.infer<typeof selectParkInputSchema>;

type SelectParkResult =
  | { selected: true; park: ParkReference }
  | {
      selected: false;
      reason:
        | "NO_CURRENT_RESULTS"
        | "INVALID_POSITION"
        | "NOT_FOUND"
        | "AMBIGUOUS";
      candidates: ParkReference[];
    };

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("th-TH")
    .replace(/[\s-–—]/g, "");
}

export function executeSelectPark(
  input: SelectParkInput,
  currentResults: ParkReference[],
): SelectParkResult {
  if (!currentResults.length) {
    return { selected: false, reason: "NO_CURRENT_RESULTS", candidates: [] };
  }

  if (input.position !== undefined) {
    const park = currentResults[input.position - 1];
    return park
      ? { selected: true, park: { ...park } }
      : {
          selected: false,
          reason: "INVALID_POSITION",
          candidates: currentResults.map((candidate) => ({ ...candidate })),
        };
  }

  if (!input.parkName) {
    return {
      selected: false,
      reason: "AMBIGUOUS",
      candidates: currentResults.map((candidate) => ({ ...candidate })),
    };
  }

  const query = normalize(input.parkName);
  const exactMatches = currentResults.filter(
    (park) => normalize(park.name) === query || normalize(park.slug) === query,
  );
  const matches = exactMatches.length
    ? exactMatches
    : currentResults.filter((park) => normalize(park.name).includes(query));

  if (matches.length !== 1) {
    return {
      selected: false,
      reason: matches.length ? "AMBIGUOUS" : "NOT_FOUND",
      candidates: matches.map((candidate) => ({ ...candidate })),
    };
  }

  return { selected: true, park: { ...matches[0] } };
}

export function hasExplicitPositionReference(
  message: string,
  position: number,
): boolean {
  const normalized = message
    .trim()
    .toLocaleLowerCase("th-TH")
    .replace(/\s+/g, "");

  const thaiOrdinals: Record<number, string[]> = {
    1: ["ที่หนึ่ง", "ที่แรก", "อันแรก", "อันที่หนึ่ง", "อันที่แรก", "ตัวแรก", "ข้อแรก", "อันดับแรก"],
    2: ["ที่สอง", "อันสอง", "ตัวที่สอง", "ข้อสอง", "อันดับสอง"],
    3: ["ที่สาม", "อันสาม", "ตัวที่สาม", "ข้อสาม", "อันดับสาม"],
  };

  const numericReferences = ["ที่", "อัน", "ตัวที่", "ข้อ", "อันดับ", "ลำดับ"];

  return (thaiOrdinals[position] ?? []).some((reference) =>
    normalized.includes(reference)
  ) || numericReferences.some((prefix) =>
    new RegExp(`${prefix}${position}(?!\\d)`).test(normalized)
  );
}

export function isExplicitParkPositionChoice(message: string, position: number): boolean {
  const normalized = message.trim().toLocaleLowerCase("th-TH").replace(/\s+/g, "");
  if (/(?:ไม่|อย่า|ยังไม่)(?:เลือก|เอา|ไป|เปลี่ยน)/.test(normalized)) return false;
  // A choice may be followed by another request in the same turn.
  const choice = normalized.match(/^(?:(?:ขอ|จะ|อยาก|ช่วย))?(?:เลือก|เอา|ไป|ตัดสินใจไป|เปลี่ยน(?:ไป|เป็น)?|ขอเปลี่ยน(?:ไป|เป็น)?)(?:อัน|ตัว|ข้อ|อันดับ|ลำดับ|ที่)(?:ที่)?(?:แรก|หนึ่ง|สอง|สาม|สี่|ห้า|\d+)/);
  return Boolean(choice && hasExplicitPositionReference(choice[0], position));
}

export function isExplicitNamedParkChoice(message: string): boolean {
  const mentioned = findMentionedParks(message);
  if (mentioned.length !== 1) return false;
  const normalizedMessage = normalize(message);
  const commands = ["ไป", "อยากไป", "เลือก", "เอา", "ตัดสินใจไป",
    "ขอเลือก", "ขอเอา", "จะเลือก", "อยากเลือก", "เปลี่ยนเป็น", "เปลี่ยนไป", "ขอเปลี่ยนเป็น", "ขอเปลี่ยนไป"];
  return [normalize(mentioned[0].name),
    normalize(mentioned[0].name).replace(/^อุทยานแห่งชาติ/, "")].some((name) =>
    commands.some((command) => normalizedMessage.startsWith(`${command}${name}`)
      && /^(?:(?:อะ|ครับ|ค่ะ|นะ|เลย)*)(?:$|(?:แล้ว|และ|มี|ช่วย|ขอ|อยาก|ส่วน|พร้อม))/.test(normalizedMessage.slice(`${command}${name}`.length))));
}

/**
 * A contextual choice is safe only when the latest assistant answer identifies
 * exactly one park. The answer itself is evidence even when an information
 * tool did not update activePark. Never guess from a multi-park answer.
 */
export function resolveContextualParkChoice(
  message: string,
  state: AssistantV2TurnContext["state"],
): ParkReference | undefined {
  const normalized = normalize(message);
  if (!/^(?:งั้น|ถ้างั้น)?(?:(?:ขอ|จะ|อยาก|ช่วย))?(?:เลือก|เอา|ไป|เปลี่ยน(?:ไป|เป็น)?)(?:(?:ที่แนะนำ|อันที่แนะนำ|แห่งที่แนะนำ|ที่บอก|อันที่บอก)(?:เมื่อกี้|ก่อนหน้า|ไปเมื่อกี้)|(?:อันนี้|ที่นี่|แห่งนี้|ที่ว่ามา|ที่เหมาะสุด))(?:แหละ|เลย|นะ|ครับ|ค่ะ|อะ|ได้ไหม)*$/.test(normalized)) return undefined;
  if (state.recommendedPark) return { ...state.recommendedPark };
  const latestAssistant = [...state.recentMessages].reverse().find((item) => item.role === "assistant");
  if (!latestAssistant) return undefined;
  const mentioned = findMentionedParks(latestAssistant.content);
  if (mentioned.length === 0) return undefined;
  if (mentioned.length === 1) {
    const park = mentioned[0];
    return { id: park.id, slug: park.slug, name: park.name };
  }

  // A comparison may mention several parks while explicitly recommending
  // exactly one. Require a clear recommendation sentence, not mere ordering.
  const recommendationLines = latestAssistant.content.split(/[\\n.!?。！？]/)
    .filter((line) => /(?:ขอแนะนำ|แนะนำให้เลือก|เหมาะที่สุด|ตัวเลือกที่ดีที่สุด)/.test(line));
  const recommendations = mentioned.filter((park) =>
    recommendationLines.some((line) => {
      const name = normalize(park.name);
      const shortName = name.replace(/^อุทยานแห่งชาติ/, "");
      const normalizedLine = normalize(line);
      return normalizedLine.includes(name) || normalizedLine.includes(shortName);
    }));
  // Thai comparison answers often phrase the single recommendation as:
  // "หากให้เลือก...ระหว่าง 2 แห่งนี้ [park] จะมีความโดดเด่น..."
  // Accept only an explicit one-choice framing and exactly one named park
  // before the next contrast ("ในขณะที่").
  if (recommendations.length === 0) {
    const firstContrast = latestAssistant.content.split(/ในขณะที่|ส่วนอีกแห่ง|แต่อีกแห่ง/)[0];
    if (/หากให้เลือก|ถ้าให้เลือก|ถ้าต้องเลือก/.test(firstContrast)) {
      const afterChoice = firstContrast.split(/ระหว่าง(?:\\s|\\d|สอง|ทั้ง|[ก-๙])*แห่งนี้/).at(-1) ?? "";
      const choiceNames = mentioned.filter((park) => {
        const full = normalize(park.name);
        const short = full.replace(/^อุทยานแห่งชาติ/, "");
        return normalize(afterChoice).includes(full) || normalize(afterChoice).includes(short);
      });
      if (choiceNames.length === 1) recommendations.push(choiceNames[0]);
    }
  }
  if (recommendations.length !== 1) return undefined;
  const park = recommendations[0];
  return { id: park.id, slug: park.slug, name: park.name };
}

export function createSelectParkTool(context: AssistantV2TurnContext) {
  return tool({
    description:
      "เลือกอุทยานเมื่อผู้ใช้สั่งเลือกชัดเจน ด้วยชื่อที่ระบุเองหรืออันดับใน Current results ห้ามเดาอันดับแรก",
    inputSchema: selectParkInputSchema,
    execute: async (input) =>
      context.runExclusive(async (state) => {
        if (/(?:ไม่|อย่า|ยังไม่)(?:เลือก|เอา|ตัดสินใจไป|เปลี่ยน)/.test(normalize(context.currentMessage))) {
          return { selected: false as const, reason: "AMBIGUOUS" as const, candidates: state.currentResults.map((candidate) => ({ ...candidate })) };
        }
        if (findMentionedParks(context.currentMessage).length > 1) {
          return { selected: false as const, reason: "AMBIGUOUS" as const, candidates: state.currentResults.map((candidate) => ({ ...candidate })) };
        }
        const lastChoice = /^(?:(?:ขอ|จะ|อยาก|ช่วย))?(?:เลือก|เอา|ไป|ตัดสินใจไป)(?:อัน|ตัว|ข้อ|อันดับ|ลำดับ|ที่)?(?:ที่)?(?:สุดท้าย|ท้ายสุด)/.test(normalize(context.currentMessage));
        const recentChoice = resolveContextualParkChoice(context.currentMessage, state);
        // A model-supplied position is not evidence when the user instead
        // refers to a uniquely named recent recommendation.
        const requestedPosition = recentChoice ? undefined : lastChoice ? state.currentResults.length : input.position;
        if (requestedPosition !== undefined && state.currentResultsOrderVerified !== true) {
          return {
            selected: false as const,
            reason: "AMBIGUOUS" as const,
            candidates: state.currentResults.map((candidate) => ({ ...candidate })),
          };
        }
        if (
          requestedPosition !== undefined &&
          !lastChoice && !isExplicitParkPositionChoice(context.currentMessage, requestedPosition)
        ) {
          return {
            selected: false as const,
            reason: "AMBIGUOUS" as const,
            candidates: state.currentResults.map((candidate) => ({
              ...candidate,
            })),
          };
        }

        const mentioned = findMentionedParks(context.currentMessage);
        const namedChoice = isExplicitNamedParkChoice(context.currentMessage);
        const contextualChoice = requestedPosition === undefined && !namedChoice
          ? recentChoice
          : undefined;
        if (requestedPosition === undefined && !namedChoice && !contextualChoice) {
          return { selected: false as const, reason: "AMBIGUOUS" as const, candidates: state.currentResults.map((candidate) => ({ ...candidate })) };
        }
        const explicitNameSelection = requestedPosition === undefined
          && namedChoice
          && mentioned.length === 1
          && (!input.parkName || (findMentionedParks(input.parkName).length === 1
            && findMentionedParks(input.parkName)[0].id === mentioned[0].id));
        const result = contextualChoice
          ? { selected: true as const, park: contextualChoice }
          : explicitNameSelection
            ? { selected: true as const, park: { id: mentioned[0].id, slug: mentioned[0].slug, name: mentioned[0].name } }
            : executeSelectPark({ ...input, position: requestedPosition }, state.currentResults);

        if (result.selected) {
          if (
            requestedPosition === undefined && !contextualChoice &&
            !findMentionedParks(context.currentMessage).some(
              (park) => park.id === result.park.id,
            )
          ) {
            return {
              selected: false as const,
              reason: "AMBIGUOUS" as const,
              candidates: state.currentResults.map((candidate) => ({ ...candidate })),
            };
          }

          setSelectedPark(state, result.park);
        }

        return result;
      }),
  });
}
