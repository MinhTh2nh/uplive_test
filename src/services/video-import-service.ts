import path from "node:path";

import { youtubeImportSchema } from "@/features/video-editor/schema";
import { AppError } from "@/lib/errors";
import { ensureStorageLayout, resolveStoragePath } from "@/lib/storage";
import { fetchYoutubeMetadata, downloadYoutubeVideo } from "@/services/media-introspection-service";
import { videoAssetRepository } from "@/repositories/video-asset-repository";

export async function importYoutubeVideo(rawInput: unknown) {
  const input = youtubeImportSchema.parse(rawInput);

  await ensureStorageLayout();

  const metadata = await fetchYoutubeMetadata(input.url);
  if (!metadata.durationSeconds) {
    throw new AppError("Could not determine the video duration.", 422);
  }

  const filenameBase = `${Date.now()}-${metadata.sourceVideoId ?? "video"}`;
  const outputPath = resolveStoragePath("imports", `${filenameBase}.mp4`);

  const localPath = await downloadYoutubeVideo(input.url, outputPath);

  return videoAssetRepository.create({
    sourceUrl: input.url,
    title: metadata.title,
    durationSeconds: metadata.durationSeconds,
    sourceVideoId: metadata.sourceVideoId,
    localPath: path.resolve(localPath),
    thumbnailUrl: metadata.thumbnailUrl,
  });
}
