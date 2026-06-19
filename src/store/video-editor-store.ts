"use client";

import { create } from "zustand";

import { DEFAULT_TRANSITION, DEFAULT_TRANSITION_DURATION } from "@/lib/video-constants";
import type { ClipInput, ExportJobDto, TransitionType, VideoAssetDto } from "@/types/video";

type VideoEditorState = {
  videoUrl: string;
  importedVideo: VideoAssetDto | null;
  clips: ClipInput[];
  transition: TransitionType;
  transitionDuration: number;
  exportJob: ExportJobDto | null;
  isDemoProject: boolean;
  isImporting: boolean;
  isExporting: boolean;
  error: string | null;
  notice: string | null;
  setVideoUrl: (videoUrl: string) => void;
  setImportedVideo: (video: VideoAssetDto | null) => void;
  setImporting: (value: boolean) => void;
  setExporting: (value: boolean) => void;
  setError: (value: string | null) => void;
  setNotice: (value: string | null) => void;
  addClip: (durationSeconds: number) => void;
  updateClip: (id: string, patch: Partial<ClipInput>) => void;
  removeClip: (id: string) => void;
  setTransition: (value: TransitionType) => void;
  setTransitionDuration: (value: number) => void;
  setExportJob: (job: ExportJobDto | null) => void;
  duplicateClip: (id: string) => void;
  loadProject: (project: {
    videoUrl?: string;
    importedVideo: VideoAssetDto;
    clips: ClipInput[];
    transition?: TransitionType;
    transitionDuration?: number;
    isDemoProject?: boolean;
  }) => void;
  resetEditor: () => void;
  clearProject: () => void;
};

function buildDefaultClip(durationSeconds: number): ClipInput {
  return {
    id: crypto.randomUUID(),
    startMs: 0,
    endMs: Math.min(durationSeconds * 1000, 15000),
  };
}

export const useVideoEditorStore = create<VideoEditorState>((set) => ({
  videoUrl: "",
  importedVideo: null,
  clips: [],
  transition: DEFAULT_TRANSITION,
  transitionDuration: DEFAULT_TRANSITION_DURATION,
  exportJob: null,
  isDemoProject: false,
  isImporting: false,
  isExporting: false,
  error: null,
  notice: null,
  setVideoUrl: (videoUrl) => set({ videoUrl }),
  setImportedVideo: (importedVideo) => set({ importedVideo }),
  setImporting: (isImporting) => set({ isImporting }),
  setExporting: (isExporting) => set({ isExporting }),
  setError: (error) => set({ error }),
  setNotice: (notice) => set({ notice }),
  addClip: (durationSeconds) =>
    set((state) => ({
      clips: [...state.clips, buildDefaultClip(durationSeconds)],
    })),
  updateClip: (id, patch) =>
    set((state) => ({
      clips: state.clips.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)),
    })),
  removeClip: (id) =>
    set((state) => ({
      clips: state.clips.filter((clip) => clip.id !== id),
    })),
  setTransition: (transition) => set({ transition }),
  setTransitionDuration: (transitionDuration) => set({ transitionDuration }),
  setExportJob: (exportJob) => set({ exportJob }),
  duplicateClip: (id) =>
    set((state) => {
      const clip = state.clips.find((entry) => entry.id === id);
      if (!clip) {
        return state;
      }

      return {
        clips: [
          ...state.clips,
          {
            ...clip,
            id: crypto.randomUUID(),
          },
        ],
      };
    }),
  loadProject: (project) =>
    set({
      videoUrl: project.videoUrl ?? "",
      importedVideo: project.importedVideo,
      clips: project.clips,
      transition: project.transition ?? DEFAULT_TRANSITION,
      transitionDuration: project.transitionDuration ?? DEFAULT_TRANSITION_DURATION,
      exportJob: null,
      isDemoProject: project.isDemoProject ?? false,
      isImporting: false,
      isExporting: false,
      error: null,
      notice: null,
    }),
  resetEditor: () =>
    set({
      importedVideo: null,
      clips: [],
      transition: DEFAULT_TRANSITION,
      transitionDuration: DEFAULT_TRANSITION_DURATION,
      exportJob: null,
      isDemoProject: false,
      error: null,
      notice: null,
    }),
  clearProject: () =>
    set({
      videoUrl: "",
      importedVideo: null,
      clips: [],
      transition: DEFAULT_TRANSITION,
      transitionDuration: DEFAULT_TRANSITION_DURATION,
      exportJob: null,
      isDemoProject: false,
      isImporting: false,
      isExporting: false,
      error: null,
      notice: null,
    }),
}));
