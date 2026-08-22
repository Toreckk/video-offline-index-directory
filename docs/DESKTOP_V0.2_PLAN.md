# Windows Desktop v0.2.0 Plan

- Release: v0.2.0
- Status: In development
- Release branch: `release/v0.2.0`
- Supported desktop platform: Windows 10 and Windows 11, x86-64

## Release outcome

v0.2.0 hardens the Windows desktop edition for continuously changing, multi-thousand-video libraries. It keeps the web and desktop product UI shared while making media indexing a reusable domain boundary, adding safe incremental reconciliation, improving native visual integration, and producing evidence-based performance decisions.

## In scope

### Media-index architecture

- Move media assets, catalog persistence, thumbnail generation/cache, and queue contracts out of Explorer into a shared media-index feature.
- Extract discovery and thumbnail-enrichment pipelines from the React scanner hook.
- Keep React responsible for lifecycle, cancellation, progress projection, and presentation.
- Preserve current web and desktop behavior with characterization tests during the refactor.

### Desktop library reconciliation

- Watch the selected native library for added, changed, renamed, and removed supported videos.
- Coalesce bursts and reconcile changes off the UI thread.
- Validate every native event against the authorized library root.
- Preserve the last committed SQLite catalog until a reconciliation commits successfully.
- Regenerate only affected metadata and thumbnails.

### Windows integration

- Replace the default title bar with a VOID-themed desktop title bar.
- Preserve dragging, minimize, maximize/restore, close, Windows snapping, system-menu access, keyboard behavior, DPI scaling, and accessible names.
- Keep native decorations available as a safe fallback until the custom controls pass manual QA.

### Performance validation

- Record cold scan, warm restore, reconciliation, thumbnail throughput, and interaction latency for representative 2,500- and 5,000-video libraries with 300 tags.
- Measure Explorer rendering before deciding whether to add grid virtualization.
- Produce a documented go/no-go decision for native FFmpeg metadata and thumbnail extraction, including binary size, codec coverage, licensing, and packaging impact.

### Release quality

- Retain versioned metadata compatibility with v0.1.0 exports and catalogs.
- Add diagnostics for watcher and reconciliation failures without exposing absolute paths in exported reports.
- Run installer-based regression QA in addition to development-build checks.

## Explicitly out of scope

- Public web deployment or hosting automation.
- File deletion, Recycle Bin operations, or destructive duplicate actions.
- Automatic application updates, updater signing, or Authenticode signing.
- macOS, Linux, Microsoft Store, or ARM64 distribution.
- Bundled FFmpeg unless the performance and licensing decision is approved during this release.

## Delivery sequence

1. Align v0.2.0 versions, release notes, and proposal checklist.
2. Establish the shared media-index boundary with behavior-preserving tests.
3. Extract discovery and thumbnail-enrichment pipelines.
4. Add the native watcher port and Windows adapter.
5. Implement incremental reconciliation and transactional catalog updates.
6. Add the themed title bar behind a native-decoration fallback.
7. Capture scale benchmarks and make virtualization/FFmpeg decisions.
8. Complete installer QA and merge the release proposal to publish v0.2.0.

## Progress

- Done: v0.2.0 version alignment, draft release notes, and scoped release plan.
- Done: shared `features/media` ownership boundary with the v0.1.0 test and build baseline preserved.
- Done: store-free discovery pipeline with batched assets, progress events, cancellation, and isolated diagnostics.
- Done: store-free thumbnail-enrichment pipeline covering cache reuse, generation, black-frame refinement, diagnostics, and completion events.
- Next: themed Windows title bar with native-decoration fallback.

## Acceptance gates

- v0.1.0 metadata exports and existing desktop catalogs restore without loss.
- A warm launch paints the cached catalog before background reconciliation.
- Adding, changing, renaming, or removing a video updates the library without a full manual rescan.
- Watcher bursts do not freeze Explorer or corrupt the last valid catalog.
- Title-bar controls retain expected Windows behavior and accessibility.
- The 5,000-video/300-tag fixture remains interactive during scan and reconciliation.
- Web production build and browser behavior remain green even though web deployment is not part of this release.
- Windows NSIS and MSI installers build and pass the release smoke checklist.

## Release workflow

Focused implementation branches may target `release/v0.2.0`. The final release proposal targets `master` and uses a merge commit. Merging it runs the existing publication workflow, creates tag `v0.2.0`, builds both Windows installers, generates checksums, and publishes the GitHub Release only after every gate succeeds.
