import path from "node:path";

import { AppError } from "@/lib/errors";
import { getEnv } from "@/lib/env";
import { runCommand } from "@/lib/process";

type YtDlpMetadata = {
  id?: string;
  title?: string;
  duration?: number;
  thumbnail?: string;
};

function normalizeCommandError(commandName: string, error: unknown) {
  if (!(error instanceof Error)) {
    return `${commandName} failed unexpectedly.`;
  }

  if ("code" in error && error.code === "ENOENT") {
    return `${commandName} is not installed or not available on PATH.`;
  }

  return error.message;
}

export async function fetchYoutubeMetadata(url: string) {
  const { YT_DLP_BIN } = getEnv();
  let stdout: string;

  try {
    ({ stdout } = await runCommand(YT_DLP_BIN, ["--dump-single-json", "--no-playlist", url]));
  } catch (error) {
    throw new AppError(`yt-dlp metadata fetch failed: ${normalizeCommandError("yt-dlp", error)}`, 500);
  }

  const metadata = JSON.parse(stdout) as YtDlpMetadata;

  return {
    sourceVideoId: metadata.id ?? null,
    title: metadata.title ?? "Imported video",
    durationSeconds: Math.max(1, Math.floor(metadata.duration ?? 0)),
    thumbnailUrl: metadata.thumbnail ?? null,
  };
}

export async function downloadYoutubeVideo(url: string, outputPath: string) {
  const { YT_DLP_BIN } = getEnv();

  try {
    await runCommand(YT_DLP_BIN, [
      "--no-playlist",
      "-f",
      "mp4[height<=720]/mp4/bestvideo[height<=720]+bestaudio/best",
      "-o",
      outputPath,
      url,
    ]);
  } catch (error) {
    throw new AppError(`yt-dlp download failed: ${normalizeCommandError("yt-dlp", error)}`, 500);
  }

  return path.resolve(outputPath);
}
