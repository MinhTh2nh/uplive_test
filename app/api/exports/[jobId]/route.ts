import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import { handleRouteError } from "@/lib/http";
import { toExportJobDto } from "@/services/dto-mappers";
import { getExportJob } from "@/services/video-export-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await context.params;
    const job = await getExportJob(jobId);

    if (!job) {
      throw new AppError("Export job not found.", 404);
    }

    return NextResponse.json({ job: toExportJobDto(job) });
  } catch (error) {
    return handleRouteError(error);
  }
}
