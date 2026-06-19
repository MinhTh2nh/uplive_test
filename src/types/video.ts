export type TransitionType = "CUT" | "FADE" | "SLIDELEFT";

export type ClipInput = {
  id: string;
  startMs: number;
  endMs: number;
};

export type VideoAssetDto = {
  id: string;
  title: string;
  durationSeconds: number;
  sourceUrl: string;
  sourceVideoId: string | null;
  thumbnailUrl: string | null;
  previewUrl: string;
};

export type ExportJobDto = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  transition: TransitionType;
  transitionDuration: number;
  outputUrl: string | null;
  errorMessage: string | null;
  clips: ClipInput[];
};
