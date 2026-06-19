# MVP Spec

## Product Goal

Deliver a small internal video editing tool that can:

* accept a YouTube URL
* import the source video
* let the user define clip ranges
* merge clips with a basic transition
* generate a downloadable MP4

## Functional Requirements

### User Flow

1. User pastes a YouTube URL.
2. System validates the URL and imports the video.
3. User previews the imported source video.
4. User creates one or more clip segments.
5. User chooses a transition and transition duration.
6. User starts export.
7. System processes the export and exposes a download link when complete.

### Empty, Loading, and Error States

* Empty state before any video is imported
* Import loading state while yt-dlp work is in progress
* Export loading state while FFmpeg processing is in progress
* Error banner for user-safe import and export failures
* Export status panel for queued, processing, completed, and failed states

## Engineering Design

### Layering

* UI: `app/`, `src/components`, `src/features`
* Feature logic and validation: `src/features/video-editor`
* Services: `src/services`
* Repositories: `src/repositories`
* Shared runtime utilities: `src/lib`
* Client store: `src/store`

### Persistence

* `VideoAsset` persists imported source metadata and preview stream source
* `ExportJob` persists export lifecycle and output metadata
* `ClipSegment` persists ordered clip ranges for each export

### Queueing Strategy

Exports are serialized in-process with a promise chain. This protects the runtime from spawning multiple heavy FFmpeg jobs at once and fits the MVP requirement better than adding Redis or a worker tier.

## Validation Design

### Import

Schema: `youtubeImportSchema`

Rules:

* `url` must be a valid URL
* `url` must match `youtube.com` or `youtu.be`

### Export

Schema: `createExportSchema`

Rules:

* `videoAssetId` must be a UUID
* `transition` must be one of `CUT`, `FADE`, `SLIDELEFT`
* `transitionDuration` must be between `0` and `2`
* `clips` must contain `1..8` items
* each clip must have `endMs > startMs`
* each clip must stay within source video duration

## API Contract

### `POST /api/videos/import`

Purpose:
Create a `VideoAsset` from a YouTube URL and download the source video locally.

Success:
Returns `200` with `video`.

Failure:
Returns user-safe validation or processing errors.

### `POST /api/exports`

Purpose:
Create an `ExportJob`, persist clip segments, and queue background processing.

Success:
Returns `201` with initial job payload.

Failure:
Returns validation errors, missing source asset errors, or export setup errors.

### `GET /api/exports/:jobId`

Purpose:
Poll export status from the client.

Success:
Returns `200` with current job state.

### `GET /api/videos/:videoId/stream`

Purpose:
Preview the locally stored imported source video.

### `GET /api/download/:jobId`

Purpose:
Download the final completed export.

## Zustand Store

Store: `useVideoEditorStore`

Why Zustand here:

* the editor is client-driven
* clip editing spans multiple UI regions
* the state is ephemeral and local to the active session

What should stay out of Zustand:

* Prisma entities outside the current editing flow
* background job infrastructure concerns
* historical exports list

## Manual Test Plan

1. Start PostgreSQL and configure `.env`.
2. Run `npm run prisma:generate`.
3. Run `npm run db:push`.
4. Run `npm run dev`.
5. Import a valid YouTube URL.
6. Confirm the video preview loads.
7. Add or edit clip ranges.
8. Export with `CUT`.
9. Poll until status becomes `COMPLETED`.
10. Download the MP4.
11. Repeat with a transition such as `FADE`.

## Known Tradeoffs

* No auth
* No cloud storage
* No resumable or distributed processing
* No advanced editor UX
* No job retries or dead-letter workflow

## Next Logical Improvements

* move media storage to S3
* replace in-process queue with a real job system
* split API and worker responsibilities
* add retention cleanup for imported and exported files
* add integration tests around route handlers
