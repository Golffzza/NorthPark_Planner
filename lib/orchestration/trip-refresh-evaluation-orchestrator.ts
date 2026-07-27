import { evaluateLiveTripForCurrentUser } from "@/lib/orchestration/trip-live-evaluation-orchestrator";
import { getTripForCurrentUser } from "@/lib/services/trip-service";
import { syncRouteSnapshotForCurrentUser } from "@/lib/snapshots/route-snapshot-service";
import { syncSunsetSnapshotForCurrentUser } from "@/lib/snapshots/sunset-snapshot-service";
import { syncWeatherSnapshotForCurrentUser } from "@/lib/snapshots/weather-snapshot-service";

export type RefreshTripEvaluationResult = {
  tripId: string;
  snapshots: {
    weather: {
      id: string;
      source: string;
      weatherCondition: string;
    };
    sunset: {
      id: string;
      source: string;
      sunsetLocalTime: string;
    };
    route: {
      id: string;
      source: string;
      distanceMeters: number;
      durationSeconds: number;
    };
  };
  evaluation: Awaited<ReturnType<typeof evaluateLiveTripForCurrentUser>>["data"];
};

export async function refreshTripEvaluationForCurrentUser(
  tripId: string,
): Promise<RefreshTripEvaluationResult> {
  await getTripForCurrentUser(tripId);

  const weatherSnapshot = await syncWeatherSnapshotForCurrentUser(tripId);
  const sunsetSnapshot = await syncSunsetSnapshotForCurrentUser(tripId);
  const routeSnapshot = await syncRouteSnapshotForCurrentUser(tripId);
  const evaluationResult = await evaluateLiveTripForCurrentUser(tripId);

  return {
    tripId,
    snapshots: {
      weather: {
        id: weatherSnapshot.id,
        source: weatherSnapshot.source,
        weatherCondition: weatherSnapshot.weatherCondition,
      },
      sunset: {
        id: sunsetSnapshot.id,
        source: sunsetSnapshot.source,
        sunsetLocalTime: sunsetSnapshot.sunsetLocalTime,
      },
      route: {
        id: routeSnapshot.id,
        source: routeSnapshot.source,
        distanceMeters: routeSnapshot.distanceMeters,
        durationSeconds: routeSnapshot.durationSeconds,
      },
    },
    evaluation: evaluationResult.data,
  };
}
