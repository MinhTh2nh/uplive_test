import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors";

export function handleRouteError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  console.error(error);
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
