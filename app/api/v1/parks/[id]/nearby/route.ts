import { NextResponse } from "next/server";

import { AuthenticationError, getCurrentUser } from "@/lib/auth/current-user";
import {
  nearbyCategorySchema,
  nearbySearchSchema,
  searchNearbyPlacesForPark,
} from "@/lib/services/nearby-places-service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await getCurrentUser();
    const { id } = await context.params;
    if (!id || id.length > 100) return error("validation_error", "Invalid park identity", 422);
    const params = new URL(request.url).searchParams;
    const allowed = new Set(["categories", "radiusMeters", "limit"]);
    if ([...params.keys()].some((key) => !allowed.has(key) || params.getAll(key).length !== 1)) {
      return error("validation_error", "Invalid nearby search parameters", 422);
    }
    const categoriesRaw = params.get("categories");
    const parsed = nearbySearchSchema.safeParse({
      categories: categoriesRaw === null
        ? nearbyCategorySchema.options
        : categoriesRaw.split(",").map((category) => category.trim()),
      ...(params.has("radiusMeters") ? { radiusMeters: Number(params.get("radiusMeters")) } : {}),
      ...(params.has("limit") ? { limit: Number(params.get("limit")) } : {}),
    });
    if (!parsed.success) return error("validation_error", "Invalid nearby search parameters", 422);

    const result = await searchNearbyPlacesForPark(id, parsed.data, {}, request.signal);
    const status = result.status === "PARK_NOT_FOUND" ? 404
      : result.status === "COORDINATE_REVIEW_REQUIRED" ? 409
      : result.status === "INVALID_COORDINATES" ? 422
      : result.status.startsWith("UPSTREAM_") ? 503 : 200;
    return NextResponse.json({ data: result }, { status });
  } catch (cause) {
    if (cause instanceof AuthenticationError) return error("unauthorized", cause.message, 401);
    return error("internal_error", "Nearby places are temporarily unavailable", 503);
  }
}
