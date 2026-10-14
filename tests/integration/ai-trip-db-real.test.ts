import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";

async function checkPersistence() {
  const park = await prisma.park.findFirst({ where: { isActive: true }, select: { id: true } });
  if (!park) throw new Error("No active park available for integration test");

  const userId = crypto.randomUUID();
  const draftId = crypto.randomUUID();
  let createdTripId: string | undefined;
  try {
    await prisma.user.create({ data: { id: userId, displayName: "AI trip integration test" } });
    const saved = await prisma.trip.create({
      data: {
        userId, parkId: park.id, aiDraftId: draftId,
        tripDate: new Date("2026-12-01T00:00:00.000Z"), departAt: "07:00",
        originText: "Integration test origin", transportMode: "CAR",
        travelerCount: 1, weatherCondition: "CLEAR", estimatedTravelMinutes: 60,
        itineraryDays: { create: [
          { dayNumber: 1, title: "Day 1", items: { create: [
            { position: 1, name: "Evidence-backed fixture A", sourceReference: "test-doc:test-chunk-a" },
            { position: 2, name: "Evidence-backed fixture B", sourceReference: "test-doc:test-chunk-b" },
          ] } },
          { dayNumber: 2, title: "Day 2", items: { create: [] } },
        ] },
      },
      select: { id: true },
    });
    createdTripId = saved.id;

    const retrieved = await prisma.trip.findUniqueOrThrow({
      where: { aiDraftId: draftId },
      include: { itineraryDays: { orderBy: { dayNumber: "asc" }, include: { items: { orderBy: { position: "asc" } } } } },
    });
    if (retrieved.userId !== userId || retrieved.itineraryDays.length !== 2 ||
        retrieved.itineraryDays[0].items.map((item) => item.position).join(",") !== "1,2" ||
        retrieved.itineraryDays[1].items.length !== 0) {
      throw new Error("Saved itinerary did not round-trip correctly");
    }
    const owned = await prisma.trip.findFirst({ where: { id: saved.id, userId: crypto.randomUUID() }, select: { id: true } });
    if (owned) throw new Error("Owner filter exposed another user's trip");
    expect(retrieved.itineraryDays[0].items).toHaveLength(2);
  } finally {
    if (createdTripId) await prisma.trip.delete({ where: { id: createdTripId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
}

describe.skipIf(process.env.RUN_DB_INTEGRATION !== "1")("AI trip real PostgreSQL integration", () => {
  it("persists ordered days and items, restricts by owner, and cleans disposable data", checkPersistence);
});
