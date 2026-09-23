import type { TransportMode, WeatherCondition } from "./types";

function scoreTransportMode(
  transportMode: TransportMode,
  options?: {
    hasDirectPublicTransit?: boolean;
    weatherCondition?: WeatherCondition;
  },
): number {
  switch (transportMode) {
    case "CAR":
      return 90;
    case "PUBLIC_TRANSPORT":
      // If park has no direct public transit, accessibility is difficult (requires chartered transport)
      return options?.hasDirectPublicTransit === false ? 40 : 75;
    case "OTHER":
      return 65;
    case "MOTORCYCLE":
      if (options?.weatherCondition === "HEAVY_RAIN" || options?.weatherCondition === "STORM") {
        return 35;
      }
      return 50;
  }
}

function scoreTravelerCount(travelerCount: number): number {
  if (travelerCount <= 1) return 55;
  if (travelerCount === 2) return 75;
  if (travelerCount <= 4) return 90;
  return 85;
}

export function scoreUserProfile(
  travelerCount: number,
  transportMode: TransportMode,
  options?: {
    hasDirectPublicTransit?: boolean;
    weatherCondition?: WeatherCondition;
  },
): number {
  const transportScore = scoreTransportMode(transportMode, options);
  const travelerScore = scoreTravelerCount(travelerCount);

  return Math.round((transportScore + travelerScore) / 2);
}

