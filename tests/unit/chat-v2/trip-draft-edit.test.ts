import { describe, expect, it } from "vitest";

import type { AssistantV2DraftTrip } from "@/lib/chat-v2/state/conversation-state";
import { editTripDraft, tripDraftEditSchema } from "@/lib/chat-v2/state/trip-draft-edit";

function draft(): AssistantV2DraftTrip {
  return {
    draftId: "draft-1",
    revision: 1,
    park: { id: "park-1", slug: "park-1", name: "อุทยานตัวอย่าง" },
    durationDays: 2,
    companions: [],
    activities: [],
    verifiedActivities: [
      { name: "น้ำตก A", sourceReference: "doc-1:chunk-1" },
      { name: "จุดชมวิว B", sourceReference: "doc-1:chunk-2" },
      { name: "เส้นทาง C", sourceReference: "doc-1:chunk-3" },
    ],
    days: [
      { day: 1, title: "วันที่ 1", items: ["น้ำตก A", "จุดชมวิว B"] },
      { day: 2, title: "วันที่ 2", items: ["เส้นทาง C"] },
    ],
  };
}

describe("edit AI trip draft", () => {
  it("extends and reduces duration without dropping activities", () => {
    const extended = editTripDraft(draft(), { operation: "SET_DURATION", durationDays: 3 });
    expect(extended).toMatchObject({ status: "OK", draft: { durationDays: 3 } });
    if (extended.status !== "OK") return;
    expect(extended.draft.days).toHaveLength(3);
    const reduced = editTripDraft(extended.draft, { operation: "SET_DURATION", durationDays: 1 });
    expect(reduced).toMatchObject({
      status: "OK",
      draft: { days: [{ items: ["น้ำตก A", "จุดชมวิว B", "เส้นทาง C"] }] },
    });
  });

  it("adds only evidenced activities and rejects unknown activity or day", () => {
    const added = editTripDraft(draft(), {
      operation: "ADD_ACTIVITY", day: 2, activityName: "น้ำตก A", position: 1,
    });
    expect(added).toMatchObject({ status: "OK", draft: { days: [
      expect.any(Object), { items: ["น้ำตก A", "เส้นทาง C"] },
    ] } });
    expect(editTripDraft(draft(), {
      operation: "ADD_ACTIVITY", day: 1, activityName: "สถานที่แต่งขึ้น",
    })).toMatchObject({ status: "INVALID_ACTIVITY" });
    expect(editTripDraft(draft(), {
      operation: "ADD_ACTIVITY", day: 9, activityName: "น้ำตก A",
    })).toMatchObject({ status: "INVALID_DAY" });
  });

  it("removes, moves and reorders by validated indexes", () => {
    const removed = editTripDraft(draft(), { operation: "REMOVE_ACTIVITY", day: 1, position: 2 });
    expect(removed.status).toBe("OK");
    if (removed.status !== "OK") return;
    expect(removed.draft.days[0].items).toEqual(["น้ำตก A"]);
    const moved = editTripDraft(draft(), {
      operation: "MOVE_ACTIVITY", fromDay: 1, fromPosition: 2, toDay: 2, toPosition: 1,
    });
    expect(moved).toMatchObject({ status: "OK", draft: { days: [
      { items: ["น้ำตก A"] }, { items: ["จุดชมวิว B", "เส้นทาง C"] },
    ] } });
    const reordered = editTripDraft(draft(), {
      operation: "MOVE_ACTIVITY", fromDay: 1, fromPosition: 2, toDay: 1, toPosition: 1,
    });
    expect(reordered.status).toBe("OK");
    if (reordered.status !== "OK") return;
    expect(reordered.draft.days[0].items).toEqual(["จุดชมวิว B", "น้ำตก A"]);
    expect(editTripDraft(draft(), {
      operation: "MOVE_ACTIVITY", fromDay: 1, fromPosition: 5, toDay: 2, toPosition: 1,
    })).toMatchObject({ status: "INVALID_POSITION" });
  });

  it("accepts an exact activity name for removal and rejects ambiguous duplicates", () => {
    const parsed = tripDraftEditSchema.safeParse({ operation: "REMOVE_ACTIVITY", day: 1, activityName: "จุดชมวิว B" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const removedByName = editTripDraft(draft(), parsed.data);
    expect(removedByName.status).toBe("OK");
    if (removedByName.status !== "OK") return;
    expect(removedByName.draft.days[0].items).toEqual(["น้ำตก A"]);
    const duplicated = draft();
    duplicated.days[0].items.push("จุดชมวิว B");
    expect(editTripDraft(duplicated, parsed.data)).toMatchObject({ status: "AMBIGUOUS_ACTIVITY" });
  });

  it("keeps identity and preferences, but locks a saved draft", () => {
    const original = draft();
    const result = editTripDraft(original, { operation: "REMOVE_ACTIVITY", day: 1, position: 1 });
    expect(result).toMatchObject({ status: "OK", draft: {
      draftId: "draft-1", revision: 2, park: original.park,
      companions: original.companions, activities: original.activities,
    } });
    expect(original.days[0].items).toEqual(["น้ำตก A", "จุดชมวิว B"]);
    expect(editTripDraft({ ...original, savedTripId: "trip-1" }, {
      operation: "REMOVE_ACTIVITY", day: 1, position: 1,
    })).toMatchObject({ status: "ALREADY_SAVED" });
  });
});
