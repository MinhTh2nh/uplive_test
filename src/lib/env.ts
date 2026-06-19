import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  STORAGE_ROOT: z.string().min(1).default("./data"),
  YT_DLP_BIN: z.string().min(1).default("yt-dlp"),
  FFMPEG_BIN: z.string().min(1).default("ffmpeg"),
  FFPROBE_BIN: z.string().min(1).default("ffprobe"),
});

export function getEnv() {
  const fileEnv = loadEnvFile();

  return envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL ?? fileEnv.DATABASE_URL,
    APP_URL: process.env.APP_URL ?? fileEnv.APP_URL,
    STORAGE_ROOT: process.env.STORAGE_ROOT ?? fileEnv.STORAGE_ROOT,
    YT_DLP_BIN: process.env.YT_DLP_BIN ?? fileEnv.YT_DLP_BIN,
    FFMPEG_BIN: process.env.FFMPEG_BIN ?? fileEnv.FFMPEG_BIN,
    FFPROBE_BIN: process.env.FFPROBE_BIN ?? fileEnv.FFPROBE_BIN,
  });
}

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return {} as Record<string, string>;
  }

  const raw = readFileSync(envPath, "utf8");
  const entries = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) {
        return null;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, "$1");
      return [key, value] as const;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);

  return Object.fromEntries(entries);
}
