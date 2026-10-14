// ./app/api/v1/trips/[id]/evaluate/route.ts

import { NextResponse } from "next/server";

import { evaluateTripForCurrentUser } from "@/lib/services/evaluation-service";
import { AuthorizationError, CancelledTripEvaluationError, NotFoundError } from "@/lib/services/trip-service";
import { IncompleteTripInformationError } from "@/lib/services/trip-evaluation-readiness";

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
    if (error instanceof IncompleteTripInformationError) {
      return NextResponse.json({ error: { code: "incomplete_trip_information", message: error.message, missingFields: error.missingFields } }, { status: 422 });
    }
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
