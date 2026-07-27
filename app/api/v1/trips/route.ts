import type { TripStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { NotFoundError, listTripsForCurrentUser, createTripForCurrentUser } from "@/lib/services/trip-service";
import { RequestValidationError, parseTripCreateInput } from "@/lib/validations/trip-create";

const TRIP_STATUSES = ["DRAFT", "EVALUATED", "CANCELLED", "COMPLETED"] as const;

function validationErrorResponse(error: RequestValidationError) {
  return NextResponse.json(
    {
      error: {
        code: "validation_error",
        message: error.message,
        details: error.details,
      },
    },
    { status: 422 },
  );
}

async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get("status");

    if (rawStatus !== null && !TRIP_STATUSES.includes(rawStatus as (typeof TRIP_STATUSES)[number])) {
      return NextResponse.json(
        {
          error: {
            code: "validation_error",
            message: "Request validation failed",
            details: [
              {
                field: "status",
                message: `Must be one of: ${TRIP_STATUSES.join(", ")}`,
                code: "invalid_enum",
              },
            ],
          },
        },
        { status: 422 },
      );
    }

    const trips = await listTripsForCurrentUser((rawStatus as TripStatus | null) ?? undefined);

    return NextResponse.json({ data: trips });
  } catch {
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

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request);

    if (body === undefined) {
      return NextResponse.json(
        {
          error: {
            code: "bad_request",
            message: "Malformed JSON request body",
          },
        },
        { status: 400 },
      );
    }

    const input = parseTripCreateInput(body);
    const trip = await createTripForCurrentUser(input);

    return NextResponse.json(
      { data: trip },
      {
        status: 201,
        headers: {
          Location: `/api/v1/trips/${trip.id}`,
        },
      },
    );
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return validationErrorResponse(error);
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
