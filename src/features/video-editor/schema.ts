import { z } from "zod";

import { DEFAULT_TRANSITION, DEFAULT_TRANSITION_DURATION } from "@/lib/video-constants";

export const youtubeImportSchema = z.object({
  url: z.url().refine((value) => value.includes("youtube.com/") || value.includes("youtu.be/"), {
    message: "Please provide a valid YouTube URL.",
  }),
});

export const clipSchema = z
  .object({
    id: z.string().min(1),
    startMs: z.number().int().min(0),
    endMs: z.number().int().min(1),
  })
  .refine((value) => value.endMs > value.startMs, {
    message: "Clip end time must be after the start time.",
    path: ["endMs"],
  });

export const createExportSchema = z.object({
  videoAssetId: z.string().uuid(),
  transition: z.enum(["CUT", "FADE", "SLIDELEFT"]).default(DEFAULT_TRANSITION),
  transitionDuration: z.number().min(0).max(2).default(DEFAULT_TRANSITION_DURATION),
  clips: z.array(clipSchema).min(1).max(8),
});

export type YoutubeImportInput = z.infer<typeof youtubeImportSchema>;
export type CreateExportInput = z.infer<typeof createExportSchema>;
