import type { TransitionType } from "@/types/video";

export const TRANSITION_OPTIONS: Array<{
  value: TransitionType;
  label: string;
  description: string;
}> = [
  { value: "CUT", label: "Cut", description: "Fastest export and lowest CPU cost." },
  { value: "FADE", label: "Fade", description: "Soft cross-fade between segments." },
  { value: "SLIDELEFT", label: "Slide", description: "Directional slide transition." },
];

export const DEFAULT_TRANSITION: TransitionType = "CUT";
export const DEFAULT_TRANSITION_DURATION = 0.6;
