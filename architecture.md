# Architecture Diagram Templates

## MVP Architecture

```mermaid
flowchart LR

    U[User]

    UI[Next.js UI]

    API[API Routes]

    YT[yt-dlp]

    TMP[Temporary Storage]

    FF[FFmpeg]

    OUT[Exported Video]

    U --> UI

    UI --> API

    API --> YT

    YT --> TMP

    TMP --> FF

    FF --> OUT

    OUT --> U
```

---

## Video Processing Flow

```mermaid
flowchart TD

    A[Paste YouTube URL]

    B[Download Video]

    C[Store Temporary File]

    D[Select Segments]

    E[Trim Clips]

    F[Merge Clips]

    G[Apply Transition]

    H[Generate Output]

    I[Download Result]

    A --> B

    B --> C

    C --> D

    D --> E

    E --> F

    F --> G

    G --> H

    H --> I
```

---

## Resource Bottlenecks

```mermaid
flowchart TD

    U[Users]

    API[API Layer]

    DL[Video Download]

    FF[FFmpeg Processing]

    DISK[Temporary Storage]

    OUT[Export]

    U --> API

    API --> DL

    DL --> FF

    FF --> DISK

    DISK --> OUT

    FF -. CPU Bottleneck .-> X[High CPU Usage]

    DISK -. Storage Bottleneck .-> Y[Disk Growth]
```

---

## Future Scalable Architecture

```mermaid
flowchart LR

    U[Users]

    API[API Service]

    Q[Job Queue]

    W[Worker Service]

    S3[S3 Storage]

    FF[FFmpeg]

    U --> API

    API --> Q

    Q --> W

    W --> FF

    FF --> S3

    API --> S3
```

---

## Scaling Discussion

```mermaid
flowchart TD

    A[1000 Concurrent Users]

    B[CPU Saturation]

    C[Long Processing Time]

    D[Queue Backlog]

    E[Storage Growth]

    F[User Delays]

    A --> B

    B --> C

    C --> D

    D --> E

    E --> F
```

---

## Design Tradeoffs

### Chosen For MVP

* Local storage
* Single service
* Synchronous processing
* Simple deployment
* Minimal infrastructure

### Deferred

* Job queue
* Worker fleet
* Distributed storage
* Auto scaling
* Multi-tenant architecture

Reason:

The challenge prioritizes a working MVP within 2 hours rather than production-scale infrastructure.
