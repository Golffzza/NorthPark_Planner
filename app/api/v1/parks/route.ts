import { NextResponse } from "next/server";

import { listParks } from "@/lib/services/park-service";
import { BadRequestError, parseParkListQuery } from "@/lib/validations/park-query";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = parseParkListQuery(searchParams);
    const result = await listParks(query);

    return NextResponse.json({
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json(
        {
          error: {
            code: "bad_request",
            message: error.message,
          },
        },
        { status: 400 },
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
