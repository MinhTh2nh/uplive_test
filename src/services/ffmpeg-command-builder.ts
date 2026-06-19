import { promises as fs } from "node:fs";
import path from "node:path";

import { getEnv } from "@/lib/env";
import { msToSeconds } from "@/lib/time";
import type { ClipInput, TransitionType } from "@/types/video";

export function buildClipOutputPath(jobWorkingDirectory: string, clipIndex: number) {
  return path.join(jobWorkingDirectory, `clip-${clipIndex}.mp4`);
}

export function buildTrimCommandArgs(inputPath: string, clip: ClipInput, outputPath: string) {
  return [
    "-y",
    "-ss",
    msToSeconds(clip.startMs).toString(),
    "-to",
    msToSeconds(clip.endMs).toString(),
    "-i",
    inputPath,
    "-vf",
    "scale='min(1280,iw)':-2",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "28",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    outputPath,
  ];
}

export async function buildConcatCommandArgs(
  clipPaths: string[],
  jobWorkingDirectory: string,
  outputPath: string,
) {
  const listFile = path.join(jobWorkingDirectory, "concat.txt");
  const contents = clipPaths.map((clipPath) => `file '${clipPath.replace(/'/g, "'\\''")}'`).join("\n");
  await fs.writeFile(listFile, contents, "utf8");

  return ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outputPath];
}

function mapTransition(transition: TransitionType) {
  if (transition === "SLIDELEFT") {
    return "slideleft";
  }

  return "fade";
}

export function buildTransitionCommandArgs(
  clipPaths: string[],
  clips: ClipInput[],
  outputPath: string,
  transition: TransitionType,
  transitionDuration: number,
) {
  const inputArgs = clipPaths.flatMap((clipPath) => ["-i", clipPath]);

  const filterParts: string[] = [];
  let currentVideoLabel = "0:v";
  let currentAudioLabel = "0:a";
  let cumulativeOffset = msToSeconds(clips[0].endMs - clips[0].startMs) - transitionDuration;

  for (let index = 1; index < clipPaths.length; index += 1) {
    const outputVideoLabel = `v${index}`;
    const outputAudioLabel = `a${index}`;

    filterParts.push(
      `[${currentVideoLabel}][${index}:v]xfade=transition=${mapTransition(transition)}:duration=${transitionDuration}:offset=${cumulativeOffset}[${outputVideoLabel}]`,
    );
    filterParts.push(
      `[${currentAudioLabel}][${index}:a]acrossfade=d=${transitionDuration}[${outputAudioLabel}]`,
    );

    currentVideoLabel = outputVideoLabel;
    currentAudioLabel = outputAudioLabel;
    const clipDuration = msToSeconds(clips[index].endMs - clips[index].startMs);
    cumulativeOffset += clipDuration - transitionDuration;
  }

  return [
    "-y",
    ...inputArgs,
    "-filter_complex",
    filterParts.join(";"),
    "-map",
    `[${currentVideoLabel}]`,
    "-map",
    `[${currentAudioLabel}]`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "28",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    outputPath,
  ];
}

export function getFfmpegCommand() {
  return getEnv().FFMPEG_BIN;
}
