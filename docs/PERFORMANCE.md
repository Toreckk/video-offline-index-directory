# Performance engineering

This is an executable-workload and measurement contract, not a claim that release budgets are already achieved. See the [assessment](REPOSITORY_ASSESSMENT.md) for the 2026-09-05 baseline and limitations.

Implementation is assigned to **v0.5 work packages P01–P12** in the [roadmap](PRODUCT_ROADMAP.md#concrete-large-library-and-thumbnail-work-packages). v0.4 establishes correctness/invalidation; v0.6–v1.0 retain scale regression gates. Use that table for scope and sequencing and this document for measurements; do not treat performance as completed when virtualization exists.

## Instrument before optimizing

Record monotonic timestamps for launch → hydrated user metadata → restored catalog → first usable viewport; user action → committed paint; scan start → first batch → completed discovery; thumbnail request → disk read → IPC → decoded image. Correlate native jobs with scan/library IDs. Count full scans, catalog saves, serialized bytes, file-stat calls, queue depth/age, cancellations, thumbnail hits/misses, and active media elements.

Count thumbnail **payload reads** separately from cache metadata/existence checks, generation attempts and displayed-image loads. Track queued/running jobs by asset version and phase, obsolete viewport requests, retained Blob bytes, estimated decoded pixels and disk cache size. A cache hit can still cause avoidable disk I/O, IPC allocation and image decoding; a 256-entry limit is not a byte budget.

Diagnostics stay local. Export only with a preview; default to aggregate counts/timings and redact roots, filenames, tags, and watched titles. Do not log raw imported backups. Label dev versus packaged runs and cold versus warm cache.

Measure the optimized installed Windows app, including all WebView2 child processes, rather than the Rust host alone. Capture CPU, private bytes/working set, GPU/decoder behavior, disk reads/writes, and frame times. JS heap or a small host executable does not describe total desktop memory.

## Workload matrix and initial budgets

Choose and record a reference Windows x64 machine with integrated graphics, 16 GB RAM and SSD; retain its exact CPU, GPU driver, Windows/WebView2 versions, power mode, and display scaling with results. Add an HDD/removable-drive case and a lower-memory laptop. Budgets below are provisional engineering targets to calibrate with the first packaged baseline, not hardware-independent promises.

| Workload | Acceptance target |
| --- | --- |
| Warm startup, 5,000 videos / 300 tags | Usable catalog viewport within 2 s p95 over 20 launches; enrichment continues afterward |
| Search/filter and Explorer↔collection navigation | Action-to-paint within 100 ms p95 over 30 measured actions after warmup |
| Scroll during thumbnailing | At least 95% frames within 33 ms; separately report frames over 50/100 ms |
| Cancel/close/switch library | UI acknowledges within 100 ms; native jobs observe cancellation at a bounded checkpoint; ffprobe deadline initially 10 s with kill/reap evidence |
| Warm navigation thumbnails | No repeated persistent read for unchanged leased/retained keys; mounts bounded by viewport and overscan (existing fixture asserts fewer than 100) |
| Unchanged warm scan, 5,000 videos | Restore known metadata without reading all 5,000 thumbnail payloads to mark them ready; initial payload work follows viewport/prefetch demand, with bounded recovery checks |
| Rapid scroll with a cold image cache | Shared read/decode admission stays within its configured bound; current-viewport work overtakes obsolete prefetch; report time-to-image separately from usable-viewport time |
| Portrait/extreme-aspect thumbnail generation | Both dimensions and total output pixels stay within the chosen budget; compare density/quality on actual displays and report encoded bytes and decoded-memory impact |
| Cache quota, eviction and interruption | Memory/disk settle within documented budgets plus active-resource allowances; missing/corrupt images regenerate; clear/eviction cannot race stale writers into resurrecting entries |
| 30-minute play/navigation soak | No monotonic post-settle memory growth; investigate >10% retained-memory drift across three equivalent cycles, tracking WebView2/GPU separately |
| Idle after enrichment | No continuing full scans or catalog rewrites; inspect persistent CPU over 1% on the recorded reference machine |
| One changed file, large root | One coalesced reconciliation; unchanged metadata preserved; no repeated full-root scans absent overflow/uncertainty |

Use 100, 2,500 and 5,000-video fixtures; add 20,000 as a stress characterization rather than advertised support. Include 100 smart collections with nested rules, populated playback records, long filenames, deep folders, 1080p/4K, short/long clips, corrupt/unsupported codecs, and black first frames. Maintain a small distributable synthetic corpus with documented provenance; never commit personal media.

Include portrait/rotated and extreme-aspect clips; cold catalog versus warm catalog with cold/warm image cache; fast scrolling then immediate collection navigation; cache-clear during generation; one missing/corrupt cached image; same-path replacement; hidden/minimized windows; disconnect/reconnect during work; and duplicate scans with a large equal-size group. Repeat multi-library workloads once v0.8 exists. Validate visible-item priority without starving long-running background work.

## Optimization order

1. **Native main-thread I/O:** dispatch catalog/cache operations through bounded blocking workers. A library write coordinator prevents stale snapshots overwriting newer ones; report durable completion and failure. Avoid spawning unlimited independent blocking tasks.
2. **Cancellation and job ownership:** native scan/hash/probe handles, cancellation checkpoints, capped diagnostics/output, stale-generation guards. Separate thumbnail decode from ffprobe so a probe cannot occupy the only thumbnail worker. Start with conservative concurrency (one decoder, one or two probes) and measure disk/GPU contention before increasing it.
3. **Catalog write amplification:** batch enrichment updates and save checkpoints; eliminate repeated whole-library validation when safe per-asset revisions suffice. Measure before moving the media catalog from JSON snapshots to normalized SQL rows/delta upserts. Native user-authored data needs transactions regardless of the catalog choice.
4. **Thumbnail transfer:** compare current `number[]` IPC with binary response or a restricted cache URL. Preserve hashed keys, root scope, lease invalidation and cache-clear semantics. Add disk size/age limits and orphan cleanup; a 256-URL count cap does not bound disk cache or decoded GPU memory.
5. **Discovery/watchers:** structured scan results, native batches/channels and backpressure, trustworthy completeness, dirty-subtree processing, overflow rescan, startup catch-up. Optimize only after incomplete scans cannot remove valid catalog entries.
6. **Frontend invalidation:** separate watched/completion changes from frequently updated progress; memoize collection counts; batch asset patches; preserve queue-array identity. Keep virtualized grids. Introduce workers or indexes only when measured action latency warrants them.
7. **Visual/bundle cost:** profile blur, shadows, video previews, and decode cost. Lazy-load rarely visited heavy views if startup profiling supports it. Current JS bundle size alone does not justify framework replacement.

The follow-up code review on 2026-09-06 identifies additional concrete work within these categories:

- **Warm reads (P02):** the enrichment pipeline queues ready assets too and reads their cached Blob. Avoid payload reads merely to restore readiness, and share requests between enrichment and tile display. Recover misses on demand instead of trusting `ready` forever.
- **Image admission and size (P04–P07):** resource leases deduplicate a key but immediately start each new key's read. Add shared priority/concurrency limits, bounded generation admission and byte-aware cache policies. The generator caps width at 640px while deriving height from aspect ratio; bound both axes/pixels before measuring additional size variants. Keep refinement as a distinct job phase.
- **Duplicate analysis (P12):** keep size prefiltering and the existing two-worker limit. Remove repeated array copies within large groups, propagate cancellation into native hashes and evaluate versioned analysis-cache reuse. Cached analysis never substitutes for fresh keeper/candidate validation during cleanup.

Do not choose arbitrary parallelism or cache sizes as permanent defaults before collecting the baseline. Commit the selected limits, active-resource allowances and reference-hardware results with the implementation. If 5,000 videos misses the targets, fix the cause or explicitly revise the support envelope with evidence before publishing a capacity claim.

## Repeatable evidence

Run `pnpm bench:v0.2` for pure operations and `pnpm bench:v0.3.2` for mount/cache invariants. Existing render benches are single-sample jsdom smoke checks; do not publish their ratios as performance gains. Add repeated browser/packaged measurements with warmups, sample counts, median, p95, maximum, and raw results. Keep flaky timing thresholds out of ordinary unit tests.

Every performance PR includes the exact before/after commits, environment, fixture manifest, cold/warm state, repeated measurements, and correctness results. Store large traces as workflow artifacts, summarize results in the release evidence, and retain benchmark code here. A faster incomplete scan or a memory reduction caused by dropping metadata is a regression.
