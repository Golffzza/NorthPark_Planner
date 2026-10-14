import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth/current-user";
import type { AssistantV2DraftTrip } from "@/lib/chat-v2/state/conversation-state";
import { prisma } from "@/lib/db/prisma";
import { getTripDetailForCurrentUser } from "@/lib/services/trip-service";
import { parseAiTripTravelDetails } from "@/lib/validations/ai-trip-travel-details";

export class InvalidAiTripDraftError extends Error {}

export async function saveAiTripDraft(draft: AssistantV2DraftTrip, travelDetails: unknown) {
  if (!draft.draftId || draft.savedTripId || !draft.days.length || draft.days.length !== draft.durationDays) {
    throw new InvalidAiTripDraftError("Draft is unavailable or already saved");
  }
  const verified = new Map(draft.verifiedActivities?.map((item) => [item.name, item.sourceReference]));
  if (draft.days.some((day, index) => day.day !== index + 1 || day.items.some((name) => !verified.has(name)))) {
    throw new InvalidAiTripDraftError("Draft contains an unverified activity");
  }

  const user = await getCurrentUser();
  const existing = await prisma.trip.findUnique({ where: { aiDraftId: draft.draftId }, select: { id: true, userId: true } });
  if (existing) {
    if (existing.userId !== user.id) throw new InvalidAiTripDraftError("Draft belongs to another user");
    return getTripDetailForCurrentUser(existing.id);
  }

  const park = await prisma.park.findUnique({ where: { slug: draft.park.slug }, select: { id: true, isActive: true } });
  if (!park?.isActive) throw new InvalidAiTripDraftError("Park is unavailable");
  const details = parseAiTripTravelDetails(travelDetails);

  try {
    const trip = await prisma.trip.create({
      data: {
        aiDraftId: draft.draftId,
        userId: user.id,
        parkId: park.id,
        tripDate: details.tripDate ?? null,
        departAt: details.departAt ?? null,
        originText: details.originText ?? null,
        originLat: details.originLat ?? null,
        originLng: details.originLng ?? null,
        transportMode: details.transportMode ?? null,
        travelerCount: details.travelerCount ?? null,
        weatherCondition: details.weatherCondition ?? null,
        estimatedTravelMinutes: details.estimatedTravelMinutes ?? null,
        mockSunsetTime: details.mockSunsetTime ?? null,
        notes: details.notes ?? draft.notes ?? null,
        status: "DRAFT",
        itineraryDays: {
          create: draft.days.map((day) => ({
            dayNumber: day.day,
            title: day.title,
            items: { create: day.items.map((name, index) => ({
              position: index + 1,
              name,
              sourceReference: verified.get(name) ?? null,
            })) },
          })),
        },
      },
      select: { id: true },
    });
    return getTripDetailForCurrentUser(trip.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await prisma.trip.findUnique({ where: { aiDraftId: draft.draftId }, select: { id: true, userId: true } });
      if (duplicate?.userId === user.id) return getTripDetailForCurrentUser(duplicate.id);
    }
    throw error;
  }
}
