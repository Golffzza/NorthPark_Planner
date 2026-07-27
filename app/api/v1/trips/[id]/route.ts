import { NextResponse } from "next/server";

import {
  AuthorizationError,
  NotFoundError,
  cancelTripForCurrentUser,
  getTripDetailForCurrentUser,
  updateTripForCurrentUser,
} from "@/lib/services/trip-service";
import { RequestValidationError } from "@/lib/validations/trip-create";
import { parseTripUpdateInput } from "@/lib/validations/trip-update";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const trip = await getTripDetailForCurrentUser(id);

    return NextResponse.json({ data: trip });
  } catch (error) {
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

export async function PATCH(request: Request, context: RouteContext) {
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

    const { id } = await context.params;
    const input = parseTripUpdateInput(body);
    const trip = await updateTripForCurrentUser(id, input);

    return NextResponse.json({ data: trip });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return validationErrorResponse(error);
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

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const trip = await cancelTripForCurrentUser(id);

    return NextResponse.json({ data: trip });
  } catch (error) {
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
