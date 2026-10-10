import { NextResponse } from "next/server";

import {
  MissingLiveSnapshotError,
  StaleLiveSnapshotError,
} from "@/lib/orchestration/trip-live-evaluation-orchestrator";
import { refreshTripEvaluationForCurrentUser } from "@/lib/orchestration/trip-refresh-evaluation-orchestrator";
import { AuthorizationError, CancelledTripEvaluationError, NotFoundError } from "@/lib/services/trip-service";
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
  WeatherForecastNotAvailableYetError,
  WeatherSyncUnavailableError,
  WeatherTripDateInPastError,
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
    if (error instanceof CancelledTripEvaluationError) {
      return NextResponse.json({ error: { code: "trip_cancelled", message: error.message } }, { status: 409 });
    }
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

    if (error instanceof WeatherForecastNotAvailableYetError) {
      return NextResponse.json(
        {
          error: {
            code: "weather_forecast_not_available_yet",
            message: error.message,
            details: {
              tripDate: error.tripDate,
              lastSupportedDate: error.lastSupportedDate,
            },
          },
        },
        { status: 422 },
      );
    }

    if (error instanceof WeatherTripDateInPastError) {
      return NextResponse.json(
        {
          error: {
            code: "trip_date_in_past",
            message:
              "ไม่สามารถประเมินพยากรณ์อากาศสำหรับวันเดินทางที่ผ่านมาแล้ว",
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

    if (error instanceof StaleLiveSnapshotError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message:
              "ข้อมูลที่ใช้ประเมินไม่ตรงกับแผนการเดินทางปัจจุบัน กรุณาอัปเดตข้อมูลและประเมินใหม่",
          },
        },
        { status: 422 },
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
          message:
            error instanceof Error ? error.message : "Internal server error",
        },
      },
      { status: 500 },
    );
  }
}
