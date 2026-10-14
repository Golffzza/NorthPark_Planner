import { z } from "zod";

import { AuthenticationError } from "@/lib/auth/current-user";
import {
  AuthorizationError,
  NotFoundError,
  getTripDetailForCurrentUser,
  listTripsForCurrentUser,
} from "@/lib/services/trip-service";

export const getTripEvaluationInputSchema = z.object({
  tripId: z.string().trim().min(1).optional(),
});

type GetTripEvaluationInput = z.infer<typeof getTripEvaluationInputSchema>;

function mentionsTrip(message: string, trip: { id: string; park: { nameTh: string } }): boolean {
  const shortParkName = trip.park.nameTh.replace(/^อุทยานแห่งชาติ/, "");
  return message.includes(trip.id)
    || message.includes(trip.park.nameTh)
    || (shortParkName.length >= 4 && message.includes(shortParkName));
}

export async function executeGetTripEvaluation(
  input: GetTripEvaluationInput,
  currentMessage: string,
) {
  try {
    const trips = await listTripsForCurrentUser();
    if (trips.length === 0) return { status: "NO_TRIPS" as const };

    // A model-supplied ID is not evidence that the user selected that trip.
    // With multiple trips, require the ID in the user's current message.
    if (input.tripId && currentMessage.includes(input.tripId)
      && !trips.some((trip) => trip.id === input.tripId)) {
      return { status: "TRIP_NOT_FOUND" as const };
    }
    const mentionedTrips = trips.filter((trip) => mentionsTrip(currentMessage, trip));
    const tripId = mentionedTrips.length > 1
      ? undefined
      : mentionedTrips[0]?.id ?? (trips.length === 1 ? trips[0].id : undefined);
    if (!tripId) {
      return {
        status: "TRIP_CLARIFICATION_REQUIRED" as const,
        totalTrips: trips.length,
        choices: trips.slice(0, 10).map((trip) => ({
          tripId: trip.id,
          parkName: trip.park.nameTh,
          tripDate: trip.tripDate,
          tripStatus: trip.status,
          hasSavedEvaluation: Boolean(trip.latestEvaluation),
        })),
      };
    }

    const trip = await getTripDetailForCurrentUser(tripId);
    const latest = trip.evaluations[0];
    if (!latest) {
      return {
        status: "NOT_EVALUATED" as const,
        tripId: trip.id,
        parkName: trip.park.nameTh,
        tripDate: trip.tripDate,
        tripStatus: trip.status,
      };
    }

    return {
      status: "SAVED_EVALUATION" as const,
      tripId: trip.id,
      parkName: trip.park.nameTh,
      tripDate: trip.tripDate,
      tripStatus: trip.status,
      evaluation: {
        id: latest.id,
        totalScore: latest.totalScore,
        level: latest.level,
        canProceed: latest.canProceed,
        weatherScore: latest.weatherScore,
        durationScore: latest.durationScore,
        timeScore: latest.timeScore,
        transportAccessibilityScore: latest.userProfileScore,
        summary: latest.summary,
        recommendation: latest.recommendation,
        evaluatedAt: latest.evaluatedAt,
      },
    };
  } catch (error) {
    if (error instanceof AuthenticationError) return { status: "UNAUTHORIZED" as const };
    if (error instanceof AuthorizationError || error instanceof NotFoundError) {
      return { status: "TRIP_NOT_FOUND" as const };
    }
    throw error;
  }
}
