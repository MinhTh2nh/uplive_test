import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { handleRouteError } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { videoAssetRepository } from "@/repositories/video-asset-repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ videoId: string }> },
) {
  try {
    const { videoId } = await context.params;
    const video = await videoAssetRepository.findById(videoId);

    if (!video) {
      throw new AppError("Video not found.", 404);
    }

    const fileStat = await stat(video.localPath);
    const stream = createReadStream(video.localPath);

    return new Response(Readable.toWeb(stream) as never, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": fileStat.size.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
