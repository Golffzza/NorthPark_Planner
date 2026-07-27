import type { TransportMode, TripEvaluationInput, WeatherCondition } from "@/lib/evaluation/types";

type TripCoreForLiveEvaluation = {
  departAt: string;
  travelerCount: number;
  transportMode: TransportMode;
  park: {
    openTime: string;
    closeTime: string;
  };
};

type WeatherSnapshotCore = {
  weatherCondition: WeatherCondition;
};

type RouteSnapshotCore = {
  durationSeconds: number;
};

type SunsetSnapshotCore = {
  sunsetAt: Date;
  timezone: string;
};

type LiveEvaluationInputMapperArgs = {
  trip: TripCoreForLiveEvaluation;
  weatherSnapshot: WeatherSnapshotCore;
  routeSnapshot: RouteSnapshotCore;
  sunsetSnapshot: SunsetSnapshotCore;
};

function formatLocalTime(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return formatter.format(date);
}

export function mapLatestSnapshotsToEvaluationInput(
  args: LiveEvaluationInputMapperArgs,
): TripEvaluationInput {
  return {
    weatherCondition: args.weatherSnapshot.weatherCondition,
    estimatedTravelMinutes: Math.ceil(args.routeSnapshot.durationSeconds / 60),
    departAt: args.trip.departAt,
    mockSunsetTime: formatLocalTime(args.sunsetSnapshot.sunsetAt, args.sunsetSnapshot.timezone),
    parkOpenTime: args.trip.park.openTime,
    parkCloseTime: args.trip.park.closeTime,
    travelerCount: args.trip.travelerCount,
    transportMode: args.trip.transportMode,
  };
}
