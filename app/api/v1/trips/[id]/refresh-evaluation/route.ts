import { NextResponse } from "next/server";

import { MissingLiveSnapshotError } from "@/lib/orchestration/trip-live-evaluation-orchestrator";
import { refreshTripEvaluationForCurrentUser } from "@/lib/orchestration/trip-refresh-evaluation-orchestrator";
import { AuthorizationError, NotFoundError } from "@/lib/services/trip-service";
import {
  RouteSyncUnavailableError,
  TripRouteContextError,
} from "@/lib/snapshots/route-snapshot-service";
import {
  SunsetSyncUnavailableError,
  TripSnapshotContextError as SunsetTripSnapshotContextError,
} from "@/lib/snapshots/sunset-snapshot-service";
import {
  TripSnapshotContextError as WeatherTripSnapshotContextError,
  WeatherSyncUnavailableError,
} from "@/lib/snapshots/weather-snapshot-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: {
            code: "bad_request",
            message: "Trip id is required",
          },
        },
        { status: 400 },
      );
    }

    const result = await refreshTripEvaluationForCurrentUser(id);

    return NextResponse.json({
      data: result,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        {
          error: {
            code: "not_found",
            message: error.message,
          },
        },
        { status: 404 },
      );
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        {
          error: {
            code: "forbidden",
            message: error.message,
          },
        },
        { status: 403 },
      );
    }

    if (error instanceof TripRouteContextError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: 422 },
      );
    }

    if (
      error instanceof WeatherTripSnapshotContextError ||
      error instanceof SunsetTripSnapshotContextError
    ) {
      return NextResponse.json(
        {
          error: {
            code: "trip_context_missing",
            message: error.message,
          },
        },
        { status: 422 },
      );
    }

    if (error instanceof WeatherSyncUnavailableError) {
      return NextResponse.json(
        {
          error: {
            code: "weather_sync_unavailable",
            message: error.message,
          },
        },
        { status: 502 },
      );
    }

    if (error instanceof RouteSyncUnavailableError) {
      return NextResponse.json(
        {
          error: {
            code: "route_sync_unavailable",
            message: error.message,
          },
        },
        { status: 502 },
      );
    }

    if (error instanceof SunsetSyncUnavailableError) {
      return NextResponse.json(
        {
          error: {
            code: "sunset_sync_unavailable",
            message: error.message,
          },
        },
        { status: 502 },
      );
    }

    if (error instanceof MissingLiveSnapshotError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: 422 },
      );
    }

    console.error("[refresh-evaluation] Unexpected error:", error);

    return NextResponse.json(
      {
        error: {
          code: "internal_error",
          message: error instanceof Error ? error.message : "Internal server error",
        },
      },
      { status: 500 },
    );
  }
}
