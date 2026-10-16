import type { EvaluationRoute } from "./route-sampling";

/** Experimental E1.1 travel-burden index, not a safety probability. */
export const DURATION_RUBRIC_VERSION = "E1.1-DURATION-CANDIDATE-600M";
export type DurationResult = {
  status: "KNOWN" | "UNKNOWN";
  D: number | null;
  minutes: number | null;
  transportMode: string;
  routeProfile: "driving" | null;
  source: "OSRM" | null;
  rubricVersion: typeof DURATION_RUBRIC_VERSION;
  missingReasons: string[];
};

/** D depends on provider total duration, not hourly weather or segment timing. */
export function scoreDurationV2(input: {
  transportMode: string;
  route: Pick<EvaluationRoute, "durationSeconds" | "profile" | "provenance"> | null;
}): DurationResult {
  const reasons: string[] = [];
  if (input.transportMode !== "CAR") reasons.push("UNSUPPORTED_TRANSPORT_MODE");
  if (!input.route) reasons.push("ROUTE_UNAVAILABLE");
  else {
    if (input.route.profile !== "driving" || input.route.provenance.provider !== "OSRM") {
      reasons.push("UNSUPPORTED_ROUTE_PROVIDER_OR_PROFILE");
    }
    if (!Number.isFinite(input.route.durationSeconds) || input.route.durationSeconds < 0) {
      reasons.push("INVALID_ROUTE_DURATION");
    }
  }
  const minutes = input.route && Number.isFinite(input.route.durationSeconds)
    && input.route.durationSeconds >= 0 ? input.route.durationSeconds / 60 : null;
  return { status: reasons.length ? "UNKNOWN" : "KNOWN",
    D: reasons.length || minutes === null ? null : 100 * Math.max(0, Math.min(1, 1 - minutes / 600)),
    minutes, transportMode: input.transportMode,
    routeProfile: input.route?.profile ?? null,
    source: input.route?.provenance.provider === "OSRM" ? "OSRM" : null,
    rubricVersion: DURATION_RUBRIC_VERSION, missingReasons: reasons };
}
