import type { Trip } from "@prisma/client";

type TravelField = "tripDate" | "departAt" | "originText" | "originLat" | "originLng" |
  "transportMode" | "travelerCount" | "weatherCondition" | "estimatedTravelMinutes";
type TripReadinessInput = Partial<{
  tripDate: Date | string | null; departAt: string | null; originText: string | null;
  originLat: Trip["originLat"] | number; originLng: Trip["originLng"] | number;
  transportMode: string | null; travelerCount: number | null;
  weatherCondition: string | null; estimatedTravelMinutes: number | null;
}>;
type ManualReady = { tripDate: Date; departAt: string; originText: string; transportMode: NonNullable<Trip["transportMode"]>; travelerCount: number; weatherCondition: NonNullable<Trip["weatherCondition"]>; estimatedTravelMinutes: number };
type LiveReady = { tripDate: Date; departAt: string; originText: string; originLat: NonNullable<Trip["originLat"]>; originLng: NonNullable<Trip["originLng"]>; transportMode: NonNullable<Trip["transportMode"]>; travelerCount: number };

export class IncompleteTripInformationError extends Error {
  readonly missingFields: TravelField[];
  constructor(missingFields: TravelField[]) {
    super("Travel information is incomplete");
    this.name = "IncompleteTripInformationError";
    this.missingFields = missingFields;
  }
}

export function missingTripEvaluationFields(trip: TripReadinessInput, mode: "manual" | "live"): TravelField[] {
  const missing: TravelField[] = [];
  if (!trip.tripDate || Number.isNaN(new Date(trip.tripDate).getTime())) missing.push("tripDate");
  if (!trip.departAt || !/^([01]\d|2[0-3]):[0-5]\d$/.test(trip.departAt)) missing.push("departAt");
  if (!trip.originText?.trim()) missing.push("originText");
  if (mode === "live") {
    const coordinate = (value: Trip["originLat"] | number | undefined) => value !== null && value !== undefined && Number.isFinite(Number(value));
    if (!coordinate(trip.originLat)) missing.push("originLat");
    if (!coordinate(trip.originLng)) missing.push("originLng");
  }
  if (!trip.transportMode) missing.push("transportMode");
  if (!Number.isInteger(trip.travelerCount) || (trip.travelerCount ?? 0) < 1) missing.push("travelerCount");
  if (mode === "manual") {
    if (!trip.weatherCondition) missing.push("weatherCondition");
    if (!Number.isInteger(trip.estimatedTravelMinutes) || (trip.estimatedTravelMinutes ?? 0) < 1) missing.push("estimatedTravelMinutes");
  }
  return missing;
}

export function assertTripEvaluationReady<T extends TripReadinessInput>(trip: T, mode: "manual"): asserts trip is T & ManualReady;
export function assertTripEvaluationReady<T extends TripReadinessInput>(trip: T, mode: "live"): asserts trip is T & LiveReady;
export function assertTripEvaluationReady(trip: TripReadinessInput, mode: "manual" | "live"): void {
  const missing = missingTripEvaluationFields(trip, mode);
  if (missing.length) throw new IncompleteTripInformationError(missing);
}
