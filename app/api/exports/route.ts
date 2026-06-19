import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/http";
import { toExportJobDto } from "@/services/dto-mappers";
import { createExportJob } from "@/services/video-export-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const job = await createExportJob(body);
    return NextResponse.json({ job: toExportJobDto(job) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
