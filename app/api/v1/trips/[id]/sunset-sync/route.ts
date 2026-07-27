import { NextResponse } from "next/server";

import { AuthorizationError, NotFoundError } from "@/lib/services/trip-service";
import {
  SunsetSyncUnavailableError,
  TripSnapshotContextError,
  syncSunsetSnapshotForCurrentUser,
} from "@/lib/snapshots/sunset-snapshot-service";

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

    const snapshot = await syncSunsetSnapshotForCurrentUser(id);

    return NextResponse.json({
      data: snapshot,
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

    if (error instanceof TripSnapshotContextError) {
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

    return NextResponse.json(
      {
        error: {
          code: "internal_error",
          message: "Internal server error",
        },
      },
      { status: 500 },
    );
  }
}
