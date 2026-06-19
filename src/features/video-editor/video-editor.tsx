"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TRANSITION_OPTIONS } from "@/lib/video-constants";
import { formatDuration } from "@/lib/time";
import { useVideoEditorStore } from "@/store/video-editor-store";
import type { ExportJobDto, VideoAssetDto } from "@/types/video";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}

const MAX_CLIPS = 8;
const DEMO_SOURCE_URL = "demo://uplive/fargate-friendly-workflow";
const DEMO_YOUTUBE_URL = "https://www.youtube.com/watch?v=6r7jzy1LABY";
const DEMO_VIDEO: VideoAssetDto = {
  id: "demo-video",
  title: "Creator Workflow Demo Reel",
  durationSeconds: 94,
  sourceUrl: DEMO_SOURCE_URL,
  sourceVideoId: "demo-video",
  thumbnailUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f59e0b"/>
            <stop offset="45%" stop-color="#ea580c"/>
            <stop offset="100%" stop-color="#111827"/>
          </linearGradient>
        </defs>
        <rect width="1280" height="720" fill="url(#bg)"/>
        <circle cx="980" cy="150" r="160" fill="rgba(255,255,255,0.12)"/>
        <circle cx="240" cy="620" r="220" fill="rgba(255,255,255,0.08)"/>
        <text x="80" y="150" fill="#fff7ed" font-family="Segoe UI, sans-serif" font-size="32" letter-spacing="6">UPLIVE DEMO PROJECT</text>
        <text x="80" y="250" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="86" font-weight="700">Paste, clip, export.</text>
        <text x="80" y="320" fill="#ffedd5" font-family="Segoe UI, sans-serif" font-size="30">A local mock flow for UI validation and walkthroughs.</text>
        <rect x="80" y="430" width="280" height="120" rx="28" fill="rgba(17,24,39,0.55)" stroke="rgba(255,255,255,0.22)"/>
        <polygon points="190,460 190,520 245,490" fill="#fbbf24"/>
        <text x="80" y="610" fill="#fff7ed" font-family="Segoe UI, sans-serif" font-size="24">Simulated preview card for offline demos</text>
      </svg>
    `),
  previewUrl: "",
};
const DEMO_CLIPS = [
  { id: "demo-clip-1", startMs: 4000, endMs: 18000 },
  { id: "demo-clip-2", startMs: 24000, endMs: 47000 },
  { id: "demo-clip-3", startMs: 61000, endMs: 86000 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function extractYouTubeVideoId(url: string) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.replace("/", "") || null;
    }

    if (parsedUrl.hostname.includes("youtube.com")) {
      return parsedUrl.searchParams.get("v");
    }
  } catch {
    return null;
  }

  return null;
}

function buildFallbackVideo(url: string): VideoAssetDto {
  const videoId = extractYouTubeVideoId(url);
  const isFiveMinuteSample = videoId === "6r7jzy1LABY";

  return {
    ...DEMO_VIDEO,
    id: `demo-${videoId ?? "video"}`,
    title: isFiveMinuteSample ? "5-Minute Sample Import" : "Imported YouTube Demo",
    durationSeconds: isFiveMinuteSample ? 300 : DEMO_VIDEO.durationSeconds,
    sourceUrl: url,
    sourceVideoId: videoId,
    thumbnailUrl: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : DEMO_VIDEO.thumbnailUrl,
  };
}

function buildFallbackClips(durationSeconds: number) {
  const durationMs = durationSeconds * 1000;
  const presets =
    durationSeconds >= 240
      ? [
          { startMs: 12000, endMs: 48000 },
          { startMs: 76000, endMs: 136000 },
          { startMs: 182000, endMs: 244000 },
        ]
      : DEMO_CLIPS;

  return presets.map((clip) => ({
    id: crypto.randomUUID(),
    startMs: clamp(clip.startMs, 0, durationMs),
    endMs: clamp(clip.endMs, 1000, durationMs),
  }));
}

function getClipDuration(clip: { startMs: number; endMs: number }) {
  return Math.max(0, clip.endMs - clip.startMs);
}

function getClipErrors(
  clip: { startMs: number; endMs: number },
  durationMs: number,
) {
  const errors: string[] = [];
  if (!Number.isFinite(clip.startMs) || !Number.isFinite(clip.endMs)) {
    errors.push("Clip range must use numeric values.");
    return errors;
  }

  if (clip.startMs < 0) {
    errors.push("Start time cannot be negative.");
  }

  if (clip.endMs > durationMs) {
    errors.push("End time cannot exceed the source duration.");
  }

  if (clip.endMs <= clip.startMs) {
    errors.push("End time must be greater than start time.");
  }

  return errors;
}

export function VideoEditor() {
  const store = useVideoEditorStore();
  const exportJobId = store.exportJob?.id;
  const exportStatus = store.exportJob?.status;
  const importedVideo = store.importedVideo;
  const durationMs = importedVideo ? importedVideo.durationSeconds * 1000 : 0;
  const totalSelectedMs = store.clips.reduce((sum, clip) => sum + getClipDuration(clip), 0);
  const clipValidation = store.clips.map((clip) => getClipErrors(clip, durationMs));
  const hasClipErrors = clipValidation.some((errors) => errors.length > 0);
  const isClipLimitReached = store.clips.length >= MAX_CLIPS;

  useEffect(() => {
    if (
      !exportJobId ||
      store.isDemoProject ||
      exportStatus === "COMPLETED" ||
      exportStatus === "FAILED"
    ) {
      return;
    }

    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/exports/${exportJobId}`);
      const payload = await parseJsonResponse<{ job: ExportJobDto }>(response);
      store.setExportJob(payload.job);

      if (payload.job.status === "COMPLETED" || payload.job.status === "FAILED") {
        store.setExporting(false);
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [exportJobId, exportStatus, store]);

  async function handleImport() {
    store.setImporting(true);
    store.setError(null);
    store.setNotice(null);
    store.setExportJob(null);

    try {
      const response = await fetch("/api/videos/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: store.videoUrl }),
      });

      const payload = await parseJsonResponse<{ video: VideoAssetDto }>(response);
      store.loadProject({
        videoUrl: store.videoUrl,
        importedVideo: payload.video,
        clips: [
          {
            id: crypto.randomUUID(),
            startMs: 0,
            endMs: Math.min(payload.video.durationSeconds * 1000, 15000),
          },
        ],
      });
    } catch (error) {
      const fallbackVideo = buildFallbackVideo(store.videoUrl);

      store.loadProject({
        videoUrl: store.videoUrl,
        importedVideo: fallbackVideo,
        clips: buildFallbackClips(fallbackVideo.durationSeconds),
        transition: "FADE",
        transitionDuration: 0.8,
        isDemoProject: true,
      });
      store.setError(
        error instanceof Error
          ? `Live import failed: ${error.message}`
          : "Live import failed.",
      );
      store.setNotice(
        "Live import is unavailable in this runtime, so a mock video project was loaded from the URL instead.",
      );
    } finally {
      store.setImporting(false);
    }
  }

  function handleLoadDemo() {
    store.loadProject({
      videoUrl: DEMO_SOURCE_URL,
      importedVideo: DEMO_VIDEO,
      clips: DEMO_CLIPS.map((clip) => ({ ...clip, id: crypto.randomUUID() })),
      transition: "FADE",
      transitionDuration: 0.8,
      isDemoProject: true,
    });
    store.setNotice("Loaded the guided demo project so you can test the full UI flow locally.");
  }

  async function handleExport() {
    if (!store.importedVideo) {
      return;
    }

    if (hasClipErrors) {
      store.setError("Please fix the highlighted clip ranges before exporting.");
      return;
    }

    if (store.isDemoProject) {
      store.setExporting(true);
      store.setError(null);
      store.setNotice(null);
      const demoJobBase = {
        id: `demo-export-${Date.now()}`,
        transition: store.transition,
        transitionDuration: store.transitionDuration,
        outputUrl: null,
        errorMessage: null,
        clips: store.clips,
      } as const;

      store.setExportJob({
        ...demoJobBase,
        status: "QUEUED",
      });

      window.setTimeout(() => {
        useVideoEditorStore.getState().setExportJob({
          ...demoJobBase,
          status: "PROCESSING",
        });
      }, 900);

      window.setTimeout(() => {
        const currentStore = useVideoEditorStore.getState();
        currentStore.setExportJob({
          ...demoJobBase,
          status: "COMPLETED",
        });
        currentStore.setExporting(false);
        currentStore.setNotice(
          "The current environment is running in demo mode. Real MP4 download only works when the live yt-dlp and FFmpeg export pipeline is available.",
        );
      }, 2600);
      return;
    }

    store.setExporting(true);
    store.setError(null);

    try {
      const response = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoAssetId: store.importedVideo.id,
          transition: store.transition,
          transitionDuration: store.transitionDuration,
          clips: store.clips,
        }),
      });

      const payload = await parseJsonResponse<{ job: ExportJobDto }>(response);
      store.setExportJob(payload.job);
    } catch (error) {
      store.setExporting(false);
      store.setError(error instanceof Error ? error.message : "Export failed.");
    }
  }

  function renderPreview() {
    if (!importedVideo) {
      return (
        <div className="flex aspect-video items-center justify-center rounded-[28px] border border-dashed border-stone-700 bg-stone-900/70 p-6 text-center text-sm text-stone-400">
          Import a source video or load the guided demo to unlock clip editing and export controls.
        </div>
      );
    }

    if (store.isDemoProject || !importedVideo.previewUrl) {
      return (
        <div
          className="relative aspect-video overflow-hidden rounded-[28px] border border-stone-800 bg-stone-950"
          style={{
            backgroundImage: importedVideo.thumbnailUrl ? `url("${importedVideo.thumbnailUrl}")` : undefined,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-stone-950/15 via-stone-950/30 to-stone-950/80" />
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-200/90">Demo preview</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Walk through the editing flow even when live video import is unavailable.</h3>
            </div>
            <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur">
              Offline-safe sample
            </div>
          </div>
        </div>
      );
    }

    return (
      <video
        className="aspect-video w-full rounded-[28px] border border-stone-800 bg-black object-cover"
        controls
        src={importedVideo.previewUrl}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_40%),linear-gradient(180deg,_#0c0a09_0%,_#1c1917_100%)] text-stone-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10 md:px-6">
        <section className="grid gap-6 rounded-[32px] border border-white/8 bg-stone-950/75 p-6 shadow-2xl shadow-black/30 backdrop-blur md:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Internal creator tool</p>
              <h1 className="text-4xl font-semibold tracking-tight text-stone-50">Video Editor Mini App</h1>
              <p className="max-w-2xl text-sm leading-6 text-stone-300">
                Paste a YouTube link, choose clip ranges, merge them, and export a single downloadable video.
              </p>
            </div>

            <form
              className="flex flex-col gap-3 md:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void handleImport();
              }}
            >
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={store.videoUrl}
                onChange={(event) => store.setVideoUrl(event.target.value)}
              />
              <Button type="submit" disabled={store.isImporting || !store.videoUrl}>
                {store.isImporting ? "Importing..." : "Import video"}
              </Button>
            </form>

            <div className="flex flex-wrap gap-3 text-sm">
              <button
                className="rounded-full border border-stone-700/80 bg-stone-900/70 px-4 py-2 text-stone-200 transition hover:border-amber-400 hover:text-white"
                onClick={() => store.setVideoUrl(DEMO_YOUTUBE_URL)}
                type="button"
              >
                Paste demo URL
              </button>
              <button
                className="rounded-full border border-stone-700/80 bg-stone-900/70 px-4 py-2 text-stone-200 transition hover:border-amber-400 hover:text-white"
                onClick={handleLoadDemo}
                type="button"
              >
                Load guided demo
              </button>
              {(importedVideo || store.videoUrl) ? (
                <button
                  className="rounded-full border border-stone-700/80 bg-stone-900/70 px-4 py-2 text-stone-200 transition hover:border-red-400 hover:text-white"
                  onClick={() => store.clearProject()}
                  type="button"
                >
                  Clear project
                </button>
              ) : null}
            </div>

            {store.notice ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                {store.notice}
              </div>
            ) : null}

            {store.error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {store.error}
              </div>
            ) : null}

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {importedVideo ? importedVideo.title : "No source loaded yet"}
                  </h2>
                  <p className="text-sm text-stone-400">
                    {importedVideo
                      ? `Duration ${importedVideo.durationSeconds}s${store.isDemoProject ? " - demo mode" : ""}`
                      : "Start by importing a YouTube video or loading the demo project."}
                  </p>
                </div>
                {importedVideo ? (
                  <Button
                    variant="ghost"
                    onClick={() => store.addClip(importedVideo.durationSeconds)}
                    disabled={isClipLimitReached}
                  >
                    {isClipLimitReached ? "Clip limit reached" : "Add clip"}
                  </Button>
                ) : null}
              </div>

              {renderPreview()}
            </div>
          </div>

          <div className="rounded-[28px] border border-stone-800 bg-stone-950/80 p-5">
            <p className="text-sm font-semibold text-stone-200">Constrained-runtime profile</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-400">
              <li>Single export job at a time to stay inside 0.5 vCPU and 1GB RAM.</li>
              <li>Disk-based temp files instead of in-memory buffers.</li>
              <li>720p cap on downloads to reduce encode pressure.</li>
              <li>Transitions re-encode output; cut is the cheapest option.</li>
            </ul>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Flow</p>
                <p className="mt-2 text-sm text-stone-200">Paste link {"->"} preview {"->"} clip ranges {"->"} export {"->"} download</p>
              </div>
              <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Current state</p>
                <p className="mt-2 text-sm text-stone-200">
                  {store.isImporting
                    ? "Importing source video..."
                    : store.isExporting
                      ? `Export ${store.exportJob?.status?.toLowerCase() ?? "starting"}...`
                      : importedVideo
                        ? "Ready to export"
                        : "Awaiting source import"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[28px] border border-stone-800 bg-stone-950/75 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Source length</p>
            <p className="mt-3 text-3xl font-semibold text-stone-50">
              {importedVideo ? formatDuration(durationMs) : "--:--"}
            </p>
          </div>
          <div className="rounded-[28px] border border-stone-800 bg-stone-950/75 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Selected clips</p>
            <p className="mt-3 text-3xl font-semibold text-stone-50">{store.clips.length}</p>
          </div>
          <div className="rounded-[28px] border border-stone-800 bg-stone-950/75 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Output length</p>
            <p className="mt-3 text-3xl font-semibold text-stone-50">{formatDuration(totalSelectedMs)}</p>
          </div>
          <div className="rounded-[28px] border border-stone-800 bg-stone-950/75 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Transition</p>
            <p className="mt-3 text-3xl font-semibold text-stone-50">{store.transition}</p>
          </div>
        </section>

        {importedVideo ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-[32px] border border-stone-800 bg-stone-950/80 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Clip ranges</h2>
                <p className="text-sm text-stone-400">{store.clips.length} of {MAX_CLIPS} segment(s)</p>
              </div>

              <div className="mt-5 space-y-4">
                {store.clips.map((clip, index) => (
                  <div
                    key={clip.id}
                    className={`grid gap-3 rounded-3xl border p-4 md:grid-cols-[100px_1fr_1fr_auto] md:items-center ${
                      clipValidation[index].length > 0
                        ? "border-red-500/40 bg-red-500/5"
                        : "border-stone-800 bg-stone-900/80"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-stone-300">Clip {index + 1}</div>
                      <div className="mt-2 text-xs text-stone-500">
                        Duration {formatDuration(getClipDuration(clip))}
                      </div>
                    </div>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-stone-500">Start ms</span>
                      <Input
                        type="number"
                        min={0}
                        max={importedVideo.durationSeconds * 1000}
                        value={clip.startMs}
                        onChange={(event) =>
                          store.updateClip(clip.id, {
                            startMs: clamp(Number(event.target.value), 0, durationMs),
                          })
                        }
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-stone-500">End ms</span>
                      <Input
                        type="number"
                        min={0}
                        max={importedVideo.durationSeconds * 1000}
                        value={clip.endMs}
                        onChange={(event) =>
                          store.updateClip(clip.id, {
                            endMs: clamp(Number(event.target.value), 0, durationMs),
                          })
                        }
                      />
                    </label>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <Button
                        variant="ghost"
                        onClick={() => store.duplicateClip(clip.id)}
                        disabled={isClipLimitReached}
                      >
                        Duplicate
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => store.removeClip(clip.id)}
                        disabled={store.clips.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="md:col-span-4">
                      <div className="h-2 overflow-hidden rounded-full bg-stone-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                          style={{
                            marginLeft: `${(clip.startMs / durationMs) * 100}%`,
                            width: `${(getClipDuration(clip) / durationMs) * 100}%`,
                          }}
                        />
                      </div>
                      {clipValidation[index].length > 0 ? (
                        <div className="mt-3 space-y-1 text-sm text-red-200">
                          {clipValidation[index].map((error) => (
                            <p key={error}>{error}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-stone-400">
                          {formatDuration(clip.startMs)} to {formatDuration(clip.endMs)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6 rounded-[32px] border border-stone-800 bg-stone-950/80 p-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Export settings</h2>
                <p className="text-sm text-stone-400">Choose a transition and launch a single queued export.</p>
              </div>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.2em] text-stone-500">Transition</span>
                <Select value={store.transition} onChange={(event) => store.setTransition(event.target.value as never)}>
                  {TRANSITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <p className="text-sm text-stone-500">
                  {TRANSITION_OPTIONS.find((option) => option.value === store.transition)?.description}
                </p>
              </label>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.2em] text-stone-500">Transition duration (seconds)</span>
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={store.transitionDuration}
                  onChange={(event) =>
                    store.setTransitionDuration(clamp(Number(event.target.value), 0, 2))
                  }
                />
              </label>

              <Button
                className="w-full"
                onClick={handleExport}
                disabled={store.isExporting || store.clips.length === 0 || hasClipErrors}
              >
                {store.isExporting ? "Exporting..." : "Export merged video"}
              </Button>

              {store.exportJob ? (
                <div className="rounded-3xl border border-stone-800 bg-stone-900/80 p-4">
                  <p className="text-sm font-semibold text-stone-200">Export status: {store.exportJob.status}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        store.exportJob.status === "QUEUED"
                          ? "w-1/3 bg-amber-400"
                          : store.exportJob.status === "PROCESSING"
                            ? "w-2/3 bg-orange-400"
                            : store.exportJob.status === "COMPLETED"
                              ? "w-full bg-emerald-400"
                              : "w-full bg-red-400"
                      }`}
                    />
                  </div>
                  {store.exportJob.outputUrl ? (
                    <a
                      className="mt-3 inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-stone-950"
                      href={store.exportJob.outputUrl}
                      download
                    >
                      Download result
                    </a>
                  ) : null}
                  {store.isDemoProject && store.exportJob.status === "COMPLETED" ? (
                    <p className="mt-3 text-sm text-amber-200">
                      Demo mode can simulate export progress, but MP4 download is only available from the live backend pipeline.
                    </p>
                  ) : null}
                  {store.exportJob.errorMessage ? (
                    <p className="mt-3 text-sm text-red-300">{store.exportJob.errorMessage}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-3xl border border-stone-800 bg-stone-900/70 p-4 text-sm text-stone-400">
                <p className="font-medium text-stone-200">Quick tips</p>
                <ul className="mt-3 space-y-2">
                  <li>Use millisecond values for precise trims.</li>
                  <li>Shorter source videos keep memory and CPU spikes predictable.</li>
                  <li>Choose Cut when you want the fastest export under Fargate limits.</li>
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {importedVideo ? (
          <section className="rounded-[32px] border border-stone-800 bg-stone-950/70 p-6 text-sm text-stone-300">
            <h2 className="text-xl font-semibold text-stone-50">Selected clip summary</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {store.clips.map((clip, index) => (
                <div key={clip.id} className="rounded-3xl border border-stone-800 bg-stone-900/70 p-4">
                  <p className="font-medium text-stone-100">Clip {index + 1}</p>
                  <p className="mt-2 text-stone-400">
                    {formatDuration(clip.startMs)} to {formatDuration(clip.endMs)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">
                    {getClipDuration(clip)} ms selected
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
