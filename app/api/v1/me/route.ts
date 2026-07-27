import { NextResponse } from "next/server";

import { AuthenticationError, getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  try {
    const user = await getCurrentUser();

    return NextResponse.json({
      data: user,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
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
