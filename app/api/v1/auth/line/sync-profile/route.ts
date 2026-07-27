import { NextResponse } from "next/server";

import { InvalidLineTokenError, syncLineProfile } from "@/lib/auth/line-auth-service";
import { issueUserSession, setSessionCookie } from "@/lib/auth/session-service";
import { RequestValidationError, parseSyncProfileInput } from "@/lib/validations/line-sync-profile";

async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return undefined;
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

    const input = parseSyncProfileInput(body);
    const user = await syncLineProfile(input);
    const sessionToken = await issueUserSession(user.id);
    const response = NextResponse.json({
      data: {
        user,
      },
    });

    setSessionCookie(response, sessionToken);

    return response;
  } catch (error) {
    if (error instanceof RequestValidationError) {
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

    if (error instanceof InvalidLineTokenError) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_token",
            message: error.message,
          },
        },
        { status: 401 },
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
