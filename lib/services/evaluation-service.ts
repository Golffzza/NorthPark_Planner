import { calculateTripEvaluation } from "@/lib/evaluation/calculate-trip-evaluation";
import { prisma } from "@/lib/db/prisma";
import { mapEvaluationToDto } from "@/lib/mappers/evaluation-dto";
import { getTripForCurrentUser } from "@/lib/services/trip-service";

export type EvaluateTripResult = {
  tripId: string;
  data: ReturnType<typeof mapEvaluationToDto>;
};

export async function evaluateTripForCurrentUser(tripId: string): Promise<EvaluateTripResult> {
  const trip = await getTripForCurrentUser(tripId);

  const evaluation = calculateTripEvaluation({
    weatherCondition: trip.weatherCondition,
    estimatedTravelMinutes: trip.estimatedTravelMinutes,
    departAt: trip.departAt,
    mockSunsetTime: trip.mockSunsetTime ?? undefined,
    parkOpenTime: trip.park.openTime,
    parkCloseTime: trip.park.closeTime,
    travelerCount: trip.travelerCount,
    transportMode: trip.transportMode,
  });

  const savedEvaluation = await prisma.$transaction(async (tx) => {
    const createdEvaluation = await tx.tripEvaluation.create({
      data: {
        tripId: trip.id,
        totalScore: evaluation.totalScore,
        level: evaluation.level,
        weatherScore: evaluation.weatherScore,
        durationScore: evaluation.durationScore,
        timeScore: evaluation.timeScore,
        userProfileScore: evaluation.userProfileScore,
        summary: evaluation.summary,
        recommendation: evaluation.recommendation,
        evaluatedAt: new Date(),
      },
    });

    await tx.trip.update({
      where: { id: trip.id },
      data: { status: "EVALUATED" },
    });

    return createdEvaluation;
  });

  return {
    tripId: trip.id,
    data: mapEvaluationToDto(savedEvaluation),
  };
}
