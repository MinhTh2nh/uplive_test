import { getPrisma } from "@/lib/prisma";

import type { CreateExportInput } from "@/features/video-editor/schema";

export const exportJobRepository = {
  create(input: CreateExportInput) {
    return getPrisma().exportJob.create({
      data: {
        videoAssetId: input.videoAssetId,
        transition: input.transition,
        transitionDuration: input.transitionDuration,
        clips: {
          create: input.clips.map((clip, index) => ({
            sortOrder: index,
            startMs: clip.startMs,
            endMs: clip.endMs,
          })),
        },
      },
      include: {
        clips: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  },

  getById(id: string) {
    return getPrisma().exportJob.findUnique({
      where: { id },
      include: {
        clips: {
          orderBy: { sortOrder: "asc" },
        },
        videoAsset: true,
      },
    });
  },

  updateStatus(
    id: string,
    data: {
      status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
      outputPath?: string | null;
      outputFilename?: string | null;
      errorMessage?: string | null;
    },
  ) {
    return getPrisma().exportJob.update({
      where: { id },
      data,
      include: {
        clips: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  },
};
