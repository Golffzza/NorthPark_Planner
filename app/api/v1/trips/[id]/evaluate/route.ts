import { NextResponse } from "next/server";

import { evaluateTripForCurrentUser } from "@/lib/services/evaluation-service";
import { AuthorizationError, NotFoundError } from "@/lib/services/trip-service";

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

    const result = await evaluateTripForCurrentUser(id);

    return NextResponse.json({
      data: {
        tripId: result.tripId,
        evaluation: result.data,
      },
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

    console.error("[api/v1/trips/[id]/evaluate POST] Unexpected error:", error);
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
