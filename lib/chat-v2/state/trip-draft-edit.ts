import { z } from "zod";

import type { AssistantV2DraftTrip } from "@/lib/chat-v2/state/conversation-state";

const day = z.number().int().positive();
const position = z.number().int().positive();

export const tripDraftEditSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("SET_DURATION"), durationDays: day.max(14) }),
  z.object({ operation: z.literal("ADD_ACTIVITY"), day, activityName: z.string().trim().min(1), position: position.optional() }),
  z.object({ operation: z.literal("REMOVE_ACTIVITY"), day, position: position.optional(), activityName: z.string().trim().min(1).optional() }),
  z.object({ operation: z.literal("MOVE_ACTIVITY"), fromDay: day, fromPosition: position, toDay: day, toPosition: position }),
]);

export type TripDraftEdit = z.infer<typeof tripDraftEditSchema>;
export type TripDraftEditResult =
  | { status: "OK"; draft: AssistantV2DraftTrip }
  | { status: "ALREADY_SAVED" | "INVALID_DAY" | "INVALID_POSITION" | "INVALID_ACTIVITY" | "AMBIGUOUS_ACTIVITY" };

export function editTripDraft(draft: AssistantV2DraftTrip, edit: TripDraftEdit): TripDraftEditResult {
  if (draft.savedTripId) return { status: "ALREADY_SAVED" };
  const next = structuredClone(draft);
  const getDay = (number: number) => next.days[number - 1]?.day === number ? next.days[number - 1] : undefined;

  switch (edit.operation) {
    case "SET_DURATION": {
      const count = edit.durationDays;
      if (count < next.days.length) {
        const removed = next.days.splice(count);
        next.days[count - 1].items.push(...removed.flatMap((entry) => entry.items));
      } else {
        for (let number = next.days.length + 1; number <= count; number++) {
          next.days.push({ day: number, title: `วันที่ ${number}`, items: [] });
        }
      }
      next.durationDays = count;
      break;
    }
    case "ADD_ACTIVITY": {
      const target = getDay(edit.day);
      if (!target) return { status: "INVALID_DAY" };
      const candidate = next.verifiedActivities?.find((item) => item.name === edit.activityName);
      if (!candidate) return { status: "INVALID_ACTIVITY" };
      const at = edit.position ?? target.items.length + 1;
      if (at > target.items.length + 1) return { status: "INVALID_POSITION" };
      target.items.splice(at - 1, 0, candidate.name);
      break;
    }
    case "REMOVE_ACTIVITY": {
      const target = getDay(edit.day);
      if (!target) return { status: "INVALID_DAY" };
      let at = edit.position;
      if (edit.activityName) {
        const matches = target.items.flatMap((name, index) => name === edit.activityName ? [index + 1] : []);
        if (!matches.length || (at !== undefined && at !== matches[0])) return { status: "INVALID_ACTIVITY" };
        if (matches.length > 1) return { status: "AMBIGUOUS_ACTIVITY" };
        at = matches[0];
      }
      if (at === undefined || at > target.items.length) return { status: "INVALID_POSITION" };
      target.items.splice(at - 1, 1);
      break;
    }
    case "MOVE_ACTIVITY": {
      const source = getDay(edit.fromDay);
      const target = getDay(edit.toDay);
      if (!source || !target) return { status: "INVALID_DAY" };
      if (edit.fromPosition > source.items.length || edit.toPosition > target.items.length + (source === target ? 0 : 1)) {
        return { status: "INVALID_POSITION" };
      }
      const [activity] = source.items.splice(edit.fromPosition - 1, 1);
      target.items.splice(edit.toPosition - 1, 0, activity);
      break;
    }
  }

  next.revision = (draft.revision ?? 1) + 1;
  return { status: "OK", draft: next };
}
