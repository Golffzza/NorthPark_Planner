// ./lib/chat-v2/tools/select-park.ts

import { tool } from "ai";
import { z } from "zod";

import type { ParkReference } from "@/lib/chat/shared/contracts";
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
    .describe("ชื่ออุทยานที่ต้องตรงกับรายการใน Current results เท่านั้น"),
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

function hasExplicitPositionReference(
  message: string,
  position: number,
): boolean {
  const normalized = message
    .trim()
    .toLocaleLowerCase("th-TH")
    .replace(/\s+/g, "");

  const thaiOrdinals: Record<number, string[]> = {
    1: ["ที่หนึ่ง", "อันแรก", "ตัวแรก", "ข้อแรก", "อันดับแรก"],
    2: ["ที่สอง", "อันสอง", "ตัวที่สอง", "ข้อสอง", "อันดับสอง"],
    3: ["ที่สาม", "อันสาม", "ตัวที่สาม", "ข้อสาม", "อันดับสาม"],
  };

  const numericReferences = [
    `ที่${position}`,
    `อัน${position}`,
    `ตัวที่${position}`,
    `ข้อ${position}`,
    `อันดับ${position}`,
  ];

  return [...(thaiOrdinals[position] ?? []), ...numericReferences].some(
    (reference) => normalized.includes(reference.replace(/\s+/g, "")),
  );
}

export function createSelectParkTool(context: AssistantV2TurnContext) {
  return tool({
    description:
      "เลือกอุทยานจาก Current results เท่านั้น ใช้เมื่อผู้ใช้บอกว่าเอาที่หนึ่ง/ที่สอง ห้ามค้นทั้ง catalog หรือเดาอันดับแรก",
    inputSchema: selectParkInputSchema,
    execute: async (input) =>
      context.runExclusive(async (state) => {
        if (
          input.position !== undefined &&
          state.currentResults.length > 1 &&
          !hasExplicitPositionReference(context.currentMessage, input.position)
        ) {
          return {
            selected: false as const,
            reason: "AMBIGUOUS" as const,
            candidates: state.currentResults.map((candidate) => ({
              ...candidate,
            })),
          };
        }

        const result = executeSelectPark(input, state.currentResults);

        if (result.selected) {
          state.selectedPark = { ...result.park };
        }

        return result;
      }),
  });
}
