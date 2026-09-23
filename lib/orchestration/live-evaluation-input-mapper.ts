import { getParkTransitInfo } from "@/lib/data/park-transit-info";
import type { TransportMode, TripEvaluationInput, WeatherCondition } from "@/lib/evaluation/types";

type TripCoreForLiveEvaluation = {
  departAt: string;
  travelerCount: number;
  transportMode: TransportMode;
  park: {
    nameTh?: string;
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

export function getTransportDurationMultiplier(mode: TransportMode): number {
  switch (mode) {
    case "CAR":
      return 1.0;
    case "MOTORCYCLE":
      return 1.15;
    case "PUBLIC_TRANSPORT":
      return 1.6;
    case "OTHER":
      return 1.25;
  }
}

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
  const parkName = args.trip.park.nameTh ?? "";
  const transitInfo = getParkTransitInfo(parkName);
  const durationMultiplier = getTransportDurationMultiplier(args.trip.transportMode);
  const baseMinutes = Math.ceil(args.routeSnapshot.durationSeconds / 60);
  const estimatedTravelMinutes = Math.ceil(baseMinutes * durationMultiplier);

  return {
    weatherCondition: args.weatherSnapshot.weatherCondition,
    estimatedTravelMinutes,
    departAt: args.trip.departAt,
    mockSunsetTime: formatLocalTime(args.sunsetSnapshot.sunsetAt, args.sunsetSnapshot.timezone),
    parkOpenTime: args.trip.park.openTime,
    parkCloseTime: args.trip.park.closeTime,
    travelerCount: args.trip.travelerCount,
    transportMode: args.trip.transportMode,
    hasDirectPublicTransit: transitInfo.hasDirectPublicTransit,
    parkName: parkName || undefined,
  };
}

