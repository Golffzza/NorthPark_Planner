import { describe, expect, it, vi } from "vitest";

import type { AssistantV2DraftTrip } from "@/lib/chat-v2/state/conversation-state";
import { prisma } from "@/lib/db/prisma";
import { saveAiTripDraft } from "@/lib/services/ai-trip-service";
import { getTripDetailForCurrentUser, listTripsForCurrentUser, updateTripForCurrentUser } from "@/lib/services/trip-service";
import { missingTripEvaluationFields } from "@/lib/services/trip-evaluation-readiness";

const auth = vi.hoisted(() => ({ id: "" }));
vi.mock("@/lib/auth/current-user", () => ({ getCurrentUser: async () => ({ id: auth.id }) }));

async function checkPersistence() {
  const park = await prisma.park.findFirst({
    where: { isActive: true }, select: { id: true, slug: true, nameTh: true },
  });
  if (!park) throw new Error("No active park available for integration test");

  const userId = crypto.randomUUID();
  const createdTripIds: string[] = [];
  try {
    await prisma.user.create({ data: { id: userId, displayName: "AI trip integration test" } });
    auth.id = userId;
    const draft: AssistantV2DraftTrip = {
      draftId: crypto.randomUUID(), revision: 1,
      park: { id: park.slug, slug: park.slug, name: park.nameTh },
      durationDays: 2, companions: [], activities: [],
      verifiedActivities: [
        { name: "Test activity A", sourceReference: "test-doc:chunk-a" },
        { name: "Test activity B", sourceReference: "test-doc:chunk-b" },
      ],
      days: [
        { day: 1, title: "Day 1", items: ["Test activity A", "Test activity B"] },
        { day: 2, title: "Day 2", items: [] },
      ],
    };
    const travel = {
      tripDate: "2026-12-01", departAt: "07:00", originText: "Integration test origin",
      transportMode: "CAR", travelerCount: 1, weatherCondition: "CLEAR",
      estimatedTravelMinutes: 60,
    };

    const saved = await saveAiTripDraft(draft, travel);
    createdTripIds.push(saved.id);
    expect(saved.status).toBe("DRAFT");
    expect(saved.itineraryDays?.map((day) => day.day)).toEqual([1, 2]);
    expect(saved.itineraryDays?.[0].items.map((item) => item.position)).toEqual([1, 2]);
    expect(saved.itineraryDays?.[0].items[0].sourceReference).toBe("test-doc:chunk-a");

    const again = await saveAiTripDraft(draft, travel);
    expect(again.id).toBe(saved.id);
    expect(await prisma.trip.count({ where: { aiDraftId: draft.draftId } })).toBe(1);
    expect((await listTripsForCurrentUser()).some((item) => item.id === saved.id)).toBe(true);
    expect((await getTripDetailForCurrentUser(saved.id)).itineraryDays).toHaveLength(2);

    const emptyDraft = { ...draft, draftId: crypto.randomUUID() };
    const withoutTravel = await saveAiTripDraft(emptyDraft, {});
    createdTripIds.push(withoutTravel.id);
    expect(withoutTravel.tripDate).toBeNull();
    expect(withoutTravel.weatherCondition).toBeNull();
    expect(withoutTravel.estimatedTravelMinutes).toBeNull();
    expect(withoutTravel.itineraryDays).toHaveLength(2);
    const listedIncomplete = (await listTripsForCurrentUser()).find((item) => item.id === withoutTravel.id);
    expect(listedIncomplete?.tripDate).toBeNull();
    expect(listedIncomplete?.originText).toBeNull();
    const completed = await updateTripForCurrentUser(withoutTravel.id, {
      tripDate: new Date("2026-12-01T00:00:00.000Z"), departAt: "07:00",
      originText: "GPS test", originLat: 16.8, originLng: 100.2,
      transportMode: "CAR", travelerCount: 2,
    });
    expect(missingTripEvaluationFields(completed, "live")).toEqual([]);
    expect(completed.status).toBe("DRAFT");

    const partialDraft = { ...draft, draftId: crypto.randomUUID() };
    const partial = await saveAiTripDraft(partialDraft, { originText: "GPS test", originLat: 16.8, originLng: 100.2 });
    createdTripIds.push(partial.id);
    expect(partial.originText).toBe("GPS test");
    expect(partial.originLat).toBe(16.8);
    expect(partial.tripDate).toBeNull();

    auth.id = crypto.randomUUID();
    await expect(getTripDetailForCurrentUser(saved.id)).rejects.toThrow("Forbidden");
  } finally {
    if (createdTripIds.length) await prisma.trip.deleteMany({ where: { id: { in: createdTripIds }, userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
}

describe.skipIf(process.env.RUN_DB_INTEGRATION !== "1")("AI trip real PostgreSQL service integration", () => {
  it("saves and retrieves a real itinerary atomically, idempotently and by owner", checkPersistence);
});
