import { NextResponse } from "next/server";

import { clearSessionCookie, revokeCurrentSession } from "@/lib/auth/session-service";

export async function POST() {
  try {
    await revokeCurrentSession();

    const response = NextResponse.json({
      data: {
        loggedOut: true,
      },
    });

    clearSessionCookie(response);

    return response;
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
