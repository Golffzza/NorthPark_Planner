import { normalizeEvaluationRoute, type EvaluationRoute, type RouteCoordinate } from "@/lib/evaluation-v2/route-sampling";

export type EvaluationRouteRequest = {
  origin: RouteCoordinate;
  destination: RouteCoordinate;
  transportMode: string;
  signal?: AbortSignal;
};

export class OsrmEvaluationRouteError extends Error {
  constructor(readonly code: "INVALID_INPUT" | "UNSUPPORTED_MODE" | "NO_ROUTE" | "TIMEOUT" | "UNAVAILABLE" | "INVALID_RESPONSE") {
    super(`OSRM Evaluation V2 route: ${code}`);
    this.name = "OsrmEvaluationRouteError";
  }
}

function validCoordinate(point: RouteCoordinate): boolean {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lng)
    && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
}

/** Separate E2 request; existing V1 route snapshot and its API contract stay untouched. */
export async function fetchOsrmEvaluationRoute(input: EvaluationRouteRequest): Promise<EvaluationRoute> {
  if (!validCoordinate(input.origin) || !validCoordinate(input.destination)) {
    throw new OsrmEvaluationRouteError("INVALID_INPUT");
  }
  if (input.transportMode !== "CAR") throw new OsrmEvaluationRouteError("UNSUPPORTED_MODE");
  if (input.signal?.aborted) throw new OsrmEvaluationRouteError("TIMEOUT");
  const base = (process.env.OSRM_BASE_URL || "http://router.project-osrm.org").replace(/\/+$/, "");
  const url = new URL(`/route/v1/driving/${input.origin.lng},${input.origin.lat};${input.destination.lng},${input.destination.lat}`, base);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "false");
  url.searchParams.set("annotations", "duration,distance");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  const onAbort = () => controller.abort();
  input.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const response = await fetch(url.toString(), {
      method: "GET", cache: "no-store", signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "NorthPark_Planner/1.0 (+https://github.com/Golffzza/NorthPark_Planner)" },
    });
    const data = await response.json() as { code?: string };
    if (data.code === "NoRoute" || data.code === "NoSegment") throw new OsrmEvaluationRouteError("NO_ROUTE");
    if (!response.ok) throw new OsrmEvaluationRouteError("UNAVAILABLE");
    try { return normalizeEvaluationRoute(data, input); }
    catch { throw new OsrmEvaluationRouteError("INVALID_RESPONSE"); }
  } catch (error) {
    if (error instanceof OsrmEvaluationRouteError) throw error;
    throw new OsrmEvaluationRouteError(controller.signal.aborted ? "TIMEOUT" : "UNAVAILABLE");
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", onAbort);
  }
}
