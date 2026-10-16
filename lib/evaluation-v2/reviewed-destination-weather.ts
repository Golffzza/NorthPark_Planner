import "server-only";
import { alignHourlyForecast, fetchOpenMeteoHourlyBatch, type HourlyBatchPoint } from "@/lib/integrations/open-meteo/open-meteo-hourly-service";
import { loadReviewedEvidenceSnapshot, type EvidenceRepository } from "./evidence-data-contract";
import { resolveEntrance } from "./trusted-evidence";
import { scoreWeatherPoint } from "./weather-rubric";
import { evaluateWeatherV2Candidate } from "./weather-scoring";
import type { EvaluationRoute, RouteSamplingPlan } from "./route-sampling";

/** Server-side candidate adapter. Repository must be constructed from a server-owned DB,
 * never from request JSON. The registry validates audit consistency, not real-world truth.
 * No user-facing evaluation is wired to this candidate.
 */
export async function evaluateWeatherWithReviewedEntranceCandidate(input: {
  route: EvaluationRoute;
  plan: RouteSamplingPlan;
  repository: EvidenceRepository;
  parkId: string;
  entranceId: string;
  registryVersion: string;
  now?: Date;
  signal?: AbortSignal;
  fetchBatch?: typeof fetchOpenMeteoHourlyBatch;
}) {
  // Keep original route weather calculation independent of all destination claims.
  const base = await evaluateWeatherV2Candidate({
    route: input.route, plan: input.plan, destinationEvidence: null,
    now: input.now, signal: input.signal, fetchBatch: input.fetchBatch,
  });
  const unavailable = (reason: string) => ({
    ...base, destinationMissingReasons: [reason], WP: null, W: null,
  });
  const loaded = await loadReviewedEvidenceSnapshot({
    repository: input.repository, parkId: input.parkId,
    evaluatedAt: input.plan.arrivalAt, registryVersion: input.registryVersion,
  });
  if (loaded.status !== "READY") return unavailable(loaded.reasons[0] ?? "REGISTRY_UNAVAILABLE");
  const entrance = resolveEntrance(loaded.snapshot, input.parkId, input.entranceId);
  if (entrance.status !== "VERIFIED" || !entrance.record) {
    return unavailable(entrance.missingReasons[0] ?? "ENTRANCE_UNVERIFIED");
  }
  const endpoint = input.route.snappedEndpoints[1]?.coordinate;
  const location = entrance.record;
  if (!endpoint) return unavailable("ROUTE_DESTINATION_MISSING");
  const radians = Math.PI / 180;
  const deltaLat = (location.latitude - endpoint.lat) * radians;
  const deltaLng = (location.longitude - endpoint.lng) * radians;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(endpoint.lat * radians)
    * Math.cos(location.latitude * radians) * Math.sin(deltaLng / 2) ** 2;
  if (12_742_000 * Math.asin(Math.min(1, Math.sqrt(h))) > 200) {
    return unavailable("ENTRANCE_ROUTE_ENDPOINT_MISMATCH");
  }
  // Reserve a distinct provider request for the entrance. Never exceed the bounded request budget.
  if ((base.requestProvenance?.httpRequests ?? 12) >= 12) return unavailable("FORECAST_REQUEST_BUDGET_EXHAUSTED");
  const point: HourlyBatchPoint = {
    latitude: location.latitude, longitude: location.longitude, at: input.plan.arrivalAt,
  };
  let destinationWeather = null;
  let error = "DESTINATION_FORECAST_UNAVAILABLE";
  try {
    const fetched = await (input.fetchBatch ?? fetchOpenMeteoHourlyBatch)([point],
      { now: input.now, signal: input.signal });
    const result = fetched.results[0];
    if (result?.status === "OK" && result.forecast && result.index === 0
      && result.point.latitude === point.latitude
      && result.point.longitude === point.longitude
      && result.point.at.getTime() === point.at.getTime()) {
      destinationWeather = alignHourlyForecast(result.forecast, point.at);
    } else {
      error = result?.errorCode ?? "DESTINATION_FORECAST_INVALID_RESPONSE";
    }
  } catch {
    return unavailable("DESTINATION_FORECAST_UNAVAILABLE");
  }
  if (!destinationWeather) return unavailable(error);
  const destination = scoreWeatherPoint({
    at: point.at, latitude: point.latitude, longitude: point.longitude, weather: destinationWeather,
  });
  if (destination.status !== "KNOWN" || destination.score === null) {
    return { ...unavailable(destination.missingReasons[0] ?? "DESTINATION_WEATHER_UNKNOWN"),
      destination, hazards: [...base.hazards, ...destination.hazards] };
  }
  const W = base.WR === null ? null : 0.4 * base.WR + 0.6 * destination.score;
  return {
    ...base,
    status: W === null ? "UNKNOWN" as const : "KNOWN" as const,
    WP: destination.score, W, destination,
    destinationMissingReasons: [],
    hazards: [...base.hazards, ...destination.hazards],
    destinationEvidence: location,
    destinationEvidenceAudit: {
      ...base.destinationEvidenceAudit,
      claimMatchesSnappedEndpoint: true,
      verificationStatus: "VERIFIED" as const,
      effectiveFrom: location.review.effectiveFrom,
      trustedSource: location.review.sourceId,
      reason: null,
    },
  };
}
