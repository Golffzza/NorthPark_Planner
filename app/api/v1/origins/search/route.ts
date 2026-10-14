import { NextResponse } from "next/server";

import { AuthenticationError, getCurrentUser } from "@/lib/auth/current-user";
import { OriginGeocodingError, searchOriginPlaces } from "@/lib/services/origin-geocoding-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await getCurrentUser();
    const query = new URL(request.url).searchParams.get("q") ?? "";
    const results = await searchOriginPlaces(query);
    return NextResponse.json({ data: results }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
    if (error instanceof OriginGeocodingError) {
      const status = error.code === "invalid_query" ? 422 : error.code === "busy" ? 429 : 503;
      return NextResponse.json({ error: { code: error.code } }, { status });
    }
    console.error("[origins/search] Unexpected error", error);
    return NextResponse.json({ error: { code: "internal_error" } }, { status: 500 });
  }
}
