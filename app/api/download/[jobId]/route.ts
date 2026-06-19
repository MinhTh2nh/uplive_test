import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { AppError } from "@/lib/errors";
import { handleRouteError } from "@/lib/http";
import { getExportJob } from "@/services/video-export-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await context.params;
    const job = await getExportJob(jobId);

    if (!job || !job.outputPath || !job.outputFilename) {
      throw new AppError("Export is not ready yet.", 404);
    }

    const fileStat = await stat(job.outputPath);
    const stream = createReadStream(job.outputPath);

    return new Response(Readable.toWeb(stream) as never, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": fileStat.size.toString(),
        "Content-Disposition": `attachment; filename="${job.outputFilename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
