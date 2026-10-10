import type { TripDetailDto } from "@/lib/mappers/trip-dto";

/** Select only the snapshot data recorded by this evaluation. */
export function getTripResultSnapshotData(
  trip: TripDetailDto,
  evaluation: TripDetailDto["evaluations"][number],
) {
  const weather = evaluation.weatherSnapshotId
    ? evaluation.weatherSnapshot?.id === evaluation.weatherSnapshotId
      ? evaluation.weatherSnapshot
      : null
    : null;
  const route = evaluation.routeSnapshotId
    ? evaluation.routeSnapshot?.id === evaluation.routeSnapshotId
      ? evaluation.routeSnapshot
      : null
    : null;

  return {
    weatherCondition: weather?.weatherCondition ??
      (evaluation.weatherSnapshotId ? null : trip.weatherCondition),
    temperatureC: weather?.temperatureC ?? null,
    distanceMeters: route?.distanceMeters ?? null,
    durationSeconds: route?.durationSeconds ?? null,
    fallbackTravelMinutes: evaluation.routeSnapshotId
      ? null
      : trip.estimatedTravelMinutes,
  };
}
