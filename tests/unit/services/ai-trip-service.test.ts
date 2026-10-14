import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AssistantV2DraftTrip } from "@/lib/chat-v2/state/conversation-state";
import { saveAiTripDraft } from "@/lib/services/ai-trip-service";

const db = vi.hoisted(() => ({
  trip: { findUnique: vi.fn(), create: vi.fn() },
  park: { findUnique: vi.fn() },
}));
const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
const detail = vi.hoisted(() => ({ getTripDetailForCurrentUser: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));
vi.mock("@/lib/auth/current-user", () => auth);
vi.mock("@/lib/services/trip-service", () => detail);

const draft: AssistantV2DraftTrip = {
  draftId: "f79563b2-c0ce-434f-8c18-c363d9fb805b",
  revision: 1,
  park: { id: "catalog-slug", slug: "catalog-slug", name: "อุทยานตัวอย่าง" },
  durationDays: 2,
  companions: [], activities: [],
  verifiedActivities: [{ name: "น้ำตก", sourceReference: "doc-1:chunk-1" }],
  days: [{ day: 1, title: "วันที่ 1", items: ["น้ำตก"] }, { day: 2, title: "วันที่ 2", items: [] }],
};
const travel = {
  tripDate: "2026-12-01", departAt: "07:00", originText: "เชียงใหม่",
  transportMode: "CAR", travelerCount: 2, weatherCondition: "CLOUDY",
  estimatedTravelMinutes: 120,
};

describe("AI draft persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getCurrentUser.mockResolvedValue({ id: "user-1" });
    db.trip.findUnique.mockResolvedValue(null);
    db.park.findUnique.mockResolvedValue({ id: "db-park-id", isActive: true });
    db.trip.create.mockResolvedValue({ id: "trip-1" });
    detail.getTripDetailForCurrentUser.mockResolvedValue({ id: "trip-1", itineraryDays: [] });
  });

  it("maps catalog slug to DB id and creates trip plus ordered itinerary atomically", async () => {
    await saveAiTripDraft(draft, travel);
    expect(db.park.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: "catalog-slug" } }));
    expect(db.trip.create).toHaveBeenCalledTimes(1);
    const data = db.trip.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ aiDraftId: draft.draftId, userId: "user-1", parkId: "db-park-id", status: "DRAFT", weatherCondition: "CLOUDY", estimatedTravelMinutes: 120 });
    expect(data.itineraryDays.create[0].items.create[0]).toMatchObject({ position: 1, name: "น้ำตก", sourceReference: "doc-1:chunk-1" });
    expect(data.itineraryDays.create[1]).toMatchObject({ dayNumber: 2, title: "วันที่ 2" });
  });

  it("saves an itinerary with no travel information as real null values", async () => {
    await saveAiTripDraft(draft, {});
    expect(db.trip.create.mock.calls[0][0].data).toMatchObject({
      tripDate: null, departAt: null, originText: null,
      transportMode: null, travelerCount: null,
      weatherCondition: null, estimatedTravelMinutes: null,
      originLat: null, originLng: null, status: "DRAFT",
    });
  });

  it("saves only supplied travel fields and rejects incomplete coordinates", async () => {
    await saveAiTripDraft(draft, { tripDate: "2026-12-01", originText: "สถานีขนส่งพิษณุโลก", originLat: 16.8, originLng: 100.2 });
    expect(db.trip.create.mock.calls[0][0].data).toMatchObject({
      tripDate: expect.any(Date), originText: "สถานีขนส่งพิษณุโลก", originLat: 16.8, originLng: 100.2,
      departAt: null, weatherCondition: null, estimatedTravelMinutes: null,
    });
    await expect(saveAiTripDraft(draft, { originLat: 16.8 })).rejects.toThrow();
  });

  it("refuses an activity without supporting evidence", async () => {
    await expect(saveAiTripDraft({ ...draft, days: [{ day: 1, title: "วันที่ 1", items: ["แต่งขึ้น"] }, draft.days[1]] }, travel)).rejects.toThrow("unverified");
    expect(db.trip.create).not.toHaveBeenCalled();
  });

  it("returns the existing owned trip for a repeated confirmation", async () => {
    db.trip.findUnique.mockResolvedValue({ id: "trip-1", userId: "user-1" });
    await expect(saveAiTripDraft(draft, travel)).resolves.toMatchObject({ id: "trip-1" });
    expect(db.trip.create).not.toHaveBeenCalled();
  });

  it("does not disclose a trip owned by another user", async () => {
    db.trip.findUnique.mockResolvedValue({ id: "trip-2", userId: "user-2" });
    await expect(saveAiTripDraft(draft, travel)).rejects.toThrow("another user");
    expect(detail.getTripDetailForCurrentUser).not.toHaveBeenCalled();
  });
});
