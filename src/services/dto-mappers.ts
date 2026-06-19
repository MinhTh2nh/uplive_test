import type { ClipSegment, ExportJob, VideoAsset } from "@prisma/client";

import type { ExportJobDto, VideoAssetDto } from "@/types/video";

export function toVideoAssetDto(video: VideoAsset): VideoAssetDto {
  return {
    id: video.id,
    title: video.title,
    durationSeconds: video.durationSeconds,
    sourceUrl: video.sourceUrl,
    sourceVideoId: video.sourceVideoId,
    thumbnailUrl: video.thumbnailUrl,
    previewUrl: `/api/videos/${video.id}/stream`,
  };
}

export function toExportJobDto(
  job: ExportJob & {
    clips: ClipSegment[];
  },
): ExportJobDto {
  return {
    id: job.id,
    status: job.status,
    transition: job.transition,
    transitionDuration: job.transitionDuration,
    outputUrl: job.outputFilename ? `/api/download/${job.id}` : null,
    errorMessage: job.errorMessage,
    clips: job.clips.map((clip) => ({
      id: clip.id,
      startMs: clip.startMs,
      endMs: clip.endMs,
    })),
  };
}
