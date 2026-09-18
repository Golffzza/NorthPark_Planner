import { calculateTripEvaluation } from "@/lib/evaluation/calculate-trip-evaluation";
import { prisma } from "@/lib/db/prisma";
import { mapEvaluationToDto } from "@/lib/mappers/evaluation-dto";
import { getTripForCurrentUser, saveEvaluationInMemory } from "@/lib/services/trip-service";
import {
  getLatestRouteSnapshotInMemory,
  getLatestSunsetSnapshotInMemory,
  getLatestWeatherSnapshotInMemory,
} from "@/lib/snapshots/in-memory-snapshots";
import type { TripEvaluation, WeatherSnapshot, RouteSnapshot, SunsetSnapshot } from "@prisma/client";

import { mapLatestSnapshotsToEvaluationInput } from "./live-evaluation-input-mapper";

export class MissingLiveSnapshotError extends Error {
  code: "missing_weather_snapshot" | "missing_route_snapshot" | "missing_sunset_snapshot";

  constructor(
    message: string,
    code: "missing_weather_snapshot" | "missing_route_snapshot" | "missing_sunset_snapshot",
  ) {
    super(message);
    this.name = "MissingLiveSnapshotError";
    this.code = code;
  }
}

export type EvaluateLiveTripResult = {
  tripId: string;
  data: ReturnType<typeof mapEvaluationToDto>;
};

export async function evaluateLiveTripForCurrentUser(
  tripId: string,
): Promise<EvaluateLiveTripResult> {
  const trip = await getTripForCurrentUser(tripId);

  let weatherSnapshot: WeatherSnapshot | null | undefined = null;
  let routeSnapshot: RouteSnapshot | null | undefined = null;
  let sunsetSnapshot: SunsetSnapshot | null | undefined = null;

  if (typeof prisma?.weatherSnapshot?.findFirst === "function") {
    try {
      [weatherSnapshot, routeSnapshot, sunsetSnapshot] = await Promise.all([
        prisma.weatherSnapshot.findFirst({
          where: { tripId: trip.id },
          orderBy: { createdAt: "desc" },
        }),
        prisma.routeSnapshot.findFirst({
          where: { tripId: trip.id },
          orderBy: { createdAt: "desc" },
        }),
        prisma.sunsetSnapshot.findFirst({
          where: { tripId: trip.id },
          orderBy: { createdAt: "desc" },
        }),
      ]);
    } catch (dbError) {
      console.warn("[trip-live-evaluation-orchestrator] Database query failed, checking in-memory snapshots fallback:", dbError);
    }
  }

  weatherSnapshot = weatherSnapshot ?? getLatestWeatherSnapshotInMemory(trip.id);
  routeSnapshot = routeSnapshot ?? getLatestRouteSnapshotInMemory(trip.id);
  sunsetSnapshot = sunsetSnapshot ?? getLatestSunsetSnapshotInMemory(trip.id);

  if (!weatherSnapshot) {
    throw new MissingLiveSnapshotError(
      "Weather snapshot is required for live evaluation",
      "missing_weather_snapshot",
    );
  }

  if (!routeSnapshot) {
    throw new MissingLiveSnapshotError(
      "Route snapshot is required for live evaluation",
      "missing_route_snapshot",
    );
  }

  if (!sunsetSnapshot) {
    throw new MissingLiveSnapshotError(
      "Sunset snapshot is required for live evaluation",
      "missing_sunset_snapshot",
    );
  }

  const evaluationInput = mapLatestSnapshotsToEvaluationInput({
    trip,
    weatherSnapshot,
    routeSnapshot,
    sunsetSnapshot,
  });
  const evaluation = calculateTripEvaluation(evaluationInput);

  let savedEvaluation: TripEvaluation | null = null;
  try {
    savedEvaluation = await prisma.$transaction(async (tx) => {
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
  } catch (error) {
    console.warn("[trip-live-evaluation-orchestrator] DB transaction failed, saving evaluation in memory fallback:", error);
    savedEvaluation = saveEvaluationInMemory(trip.id, evaluation);
  }

  if (!savedEvaluation) {
    throw new Error("Failed to save evaluation");
  }

  return {
    tripId: trip.id,
    data: mapEvaluationToDto(savedEvaluation),
  };
}
