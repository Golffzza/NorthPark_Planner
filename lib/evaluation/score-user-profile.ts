import type { TransportMode } from "./types";

function scoreTransportMode(transportMode: TransportMode): number {
  switch (transportMode) {
    case "CAR":
      return 90;
    case "PUBLIC_TRANSPORT":
      return 70;
    case "OTHER":
      return 65;
    case "MOTORCYCLE":
      return 50;
  }
}

function scoreTravelerCount(travelerCount: number): number {
  if (travelerCount <= 1) return 55;
  if (travelerCount === 2) return 75;
  if (travelerCount <= 4) return 90;
  return 85;
}

export function scoreUserProfile(travelerCount: number, transportMode: TransportMode): number {
  const transportScore = scoreTransportMode(transportMode);
  const travelerScore = scoreTravelerCount(travelerCount);

  return Math.round((transportScore + travelerScore) / 2);
}
