# Design Write-Up

> Important limitation: I was not able to get live YouTube importing working reliably in this environment. Because of that, the end-to-end path that depends on a real imported YouTube source is still incomplete, and transition processing and final export can still fail when tested against live YouTube URLs.

## What I built

I built a small video editor MVP where the user can paste a YouTube link, preview the imported video, define clip ranges, export a merged result, and download the final MP4.

The goal was not to build a production-scale media platform in 2 hours. The goal was to deliver a complete user experience with a clean end-to-end path:

* paste a link
* select clips
* export
* download result

## System design

I chose a single Next.js application with route handlers, Prisma, PostgreSQL, yt-dlp, and FFmpeg.

I broke the problem into five parts:

* import a YouTube video and persist its metadata
* preview the imported source file
* collect clip ranges in the client UI
* create and process an export job
* stream the finished output back to the user

The architecture is intentionally simple:

* UI handles link input, clip selection, loading states, polling, and download actions
* route handlers expose the import, export, status, preview, and download endpoints
* services own validation and media-processing orchestration
* repositories isolate Prisma access
* PostgreSQL stores imported videos, export jobs, and clip segments

I used this structure because it keeps the code readable and maintainable without introducing extra moving parts that would slow down MVP delivery.

## Tradeoffs and engineering judgment

I intentionally did not build:

* authentication
* multi-user isolation
* background workers
* Redis or a real queue
* S3 or external object storage
* advanced editing UX like drag-and-drop timelines or waveform editing
* retries, resumability, or long-term media retention policies

I skipped these because they are not required to prove the core product flow. In a 2-hour window, they would increase surface area much faster than they would improve the quality of the actual demo experience.

I chose a single app process with local disk storage because it is the smallest setup that still demonstrates sound separation of concerns and a working product.

## Resource management under 0.5 vCPU and 1GB RAM

The main resource risk is video processing, not request handling.

To fit the constraint, I designed around CPU and memory pressure:

* exports are serialized so only one FFmpeg-heavy job runs at a time
* FFmpeg works from files on disk instead of loading full videos into memory
* temporary working directories are deleted after each export
* the simplest path, `CUT`, avoids some of the cost of re-encoding transitions
* the UI polls job status instead of holding open a more complex realtime channel

Under these constraints, performance will degrade mainly through slower export time rather than memory explosion. That is a deliberate tradeoff: predictable slowness is better than unstable concurrency in a constrained container.

## What would break first

The first thing to break would be CPU availability during concurrent exports.

FFmpeg is the dominant cost in this system. If multiple exports ran at once on a Fargate task with 0.5 vCPU and 1GB RAM:

* export latency would spike
* active jobs would pile up
* request-to-result time would become unacceptable
* temporary storage would also grow as jobs wait longer

I designed around that by forcing export work through a single in-process queue. That does not make the system highly scalable, but it makes behavior predictable and prevents the container from thrashing itself under load.

## Code quality and maintainability

I optimized for straightforward code organization:

* validation is centralized with Zod
* Prisma access is kept out of UI code
* services contain the business flow
* repositories are persistence-only
* the client store is limited to transient editor state

This keeps the core flows easy to trace:

* import request -> validation -> yt-dlp/metadata -> database record
* export request -> validation -> job creation -> queued FFmpeg processing -> downloadable output

That structure is intentionally modest, but it is readable and easy to extend.

## Product sense

I focused on making the experience feel complete instead of partially implementing a larger system.

A user can:

* paste a YouTube URL
* import and preview the source video
* define clip ranges
* choose a transition
* export the result
* download the finished file

That flow is the product. Everything else was treated as secondary unless it directly improved that happy path.

## Scaling answer: 1,000 simultaneous users

If 1,000 users submitted videos at the same time, the first bottleneck would be media-processing capacity, especially CPU, followed by temporary storage pressure.

This current design would not handle that load well because the export queue is in-process and tied to a single application container. The queue would grow immediately, export times would become extremely long, and local storage usage would rise as more imported and intermediate files accumulate.

The fix would be:

* split request handling from video processing
* store jobs in a durable queue
* move FFmpeg work to dedicated worker containers
* move imported and exported media to S3
* scale workers horizontally based on queue depth
* enforce per-worker concurrency limits so FFmpeg does not overwhelm each container

At that point, the API layer stays lightweight while the compute-heavy part of the system scales independently.

## Why this design

If 1,000 users submitted videos simultaneously, the first bottleneck would be FFmpeg processing capacity.

Video editing operations such as clipping, merging, and applying transitions are CPU-intensive workloads. Under the target environment (0.5 vCPU and 1GB RAM), CPU utilization would reach saturation long before the API layer becomes a bottleneck.

As CPU usage increases:

* Export jobs take longer to complete
* Processing queues grow
* User-perceived latency increases

To address this, I would first introduce a job queue and limit concurrent FFmpeg executions. This prevents resource exhaustion and provides predictable system behavior under load.

If demand continues to increase, I would scale the worker layer independently by increasing available CPU resources and running multiple worker containers. This allows video processing capacity to grow without affecting the API layer.
