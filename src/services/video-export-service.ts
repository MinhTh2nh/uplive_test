import { promises as fs } from "node:fs";
import path from "node:path";

import { createExportSchema } from "@/features/video-editor/schema";
import { AppError } from "@/lib/errors";
import { getFfmpegCommand, buildClipOutputPath, buildConcatCommandArgs, buildTransitionCommandArgs, buildTrimCommandArgs } from "@/services/ffmpeg-command-builder";
import { ensureStorageLayout, resolveStoragePath } from "@/lib/storage";
import { runCommand } from "@/lib/process";
import { exportJobRepository } from "@/repositories/export-job-repository";
import { videoAssetRepository } from "@/repositories/video-asset-repository";

let queueTail = Promise.resolve();

export async function createExportJob(rawInput: unknown) {
  const input = createExportSchema.parse(rawInput);
  const videoAsset = await videoAssetRepository.findById(input.videoAssetId);

  if (!videoAsset) {
    throw new AppError("Video asset not found.", 404);
  }

  for (const clip of input.clips) {
    if (clip.endMs > videoAsset.durationSeconds * 1000) {
      throw new AppError("Clip range exceeds the imported video duration.", 422);
    }
  }

  const job = await exportJobRepository.create(input);

  queueTail = queueTail.then(() => processExportJob(job.id)).catch((error) => {
    console.error("Export queue error", error);
  });

  return job;
}

export async function getExportJob(jobId: string) {
  return exportJobRepository.getById(jobId);
}

async function processExportJob(jobId: string) {
  const job = await exportJobRepository.getById(jobId);
  if (!job) {
    return;
  }

  await ensureStorageLayout();
  await exportJobRepository.updateStatus(jobId, {
    status: "PROCESSING",
    errorMessage: null,
  });

  const workingDirectory = resolveStoragePath("jobs", jobId);
  await fs.mkdir(workingDirectory, { recursive: true });

  try {
    const clipPaths: string[] = [];

    for (const [index, clip] of job.clips.entries()) {
      const clipPath = buildClipOutputPath(workingDirectory, index);
      clipPaths.push(clipPath);
      await runCommand(
        getFfmpegCommand(),
        buildTrimCommandArgs(
          job.videoAsset.localPath,
          { id: clip.id, startMs: clip.startMs, endMs: clip.endMs },
          clipPath,
        ),
      );
    }

    const outputFilename = `${job.id}.mp4`;
    const outputPath = resolveStoragePath("exports", outputFilename);

    if (job.transition === "CUT" || clipPaths.length === 1) {
      const args = await buildConcatCommandArgs(clipPaths, workingDirectory, outputPath);
      await runCommand(getFfmpegCommand(), args);
    } else {
      const args = buildTransitionCommandArgs(
        clipPaths,
        job.clips.map((clip) => ({ id: clip.id, startMs: clip.startMs, endMs: clip.endMs })),
        outputPath,
        job.transition,
        job.transitionDuration,
      );
      await runCommand(getFfmpegCommand(), args);
    }

    await exportJobRepository.updateStatus(jobId, {
      status: "COMPLETED",
      outputPath,
      outputFilename,
      errorMessage: null,
    });
  } catch (error) {
    await exportJobRepository.updateStatus(jobId, {
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : "Export failed.",
      outputPath: null,
      outputFilename: null,
    });
  } finally {
    await fs.rm(workingDirectory, { recursive: true, force: true });
  }
}
