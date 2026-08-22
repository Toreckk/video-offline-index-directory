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
- Done: VOID-themed Windows title bar with drag regions, accessible window controls, maximize/restore state, and a persisted native-decoration fallback in Settings.
- Verified: live Windows development build, themed layout, and maximize/restore round trip at the original window bounds.
- Done: native watcher port and Tauri adapter with 400 ms burst coalescing, root-relative diagnostics, recursive/non-recursive modes, and paired rename events.
- Done: atomic media reconciliation that commits SQLite before replacing Explorer state, preserves enrichment for unchanged/renamed files, migrates rename metadata, and queues thumbnails only for new or changed videos.
- Verified: native watcher backend event test, split-rename test, 5,000-file native scan fixture, and shared reconciliation/store tests.
- Done: release-review hardening explicitly restores trusted native roots, replaces thumbnail work interrupted by later watcher events, moves rename metadata without stale source IDs, and keeps the themed title bar within one viewport.
- Done: repeatable 2,500/5,000-video benchmark harness and native discovery/catalog timings in `docs/performance/v0.2.md`.
- Decision: virtualize Explorer rows in v0.2; live desktop QA confirms scrolling and responsive columns with 2,436 real videos.
- Decision: defer bundled FFmpeg, document the licensing/size tradeoff, and prototype it behind the media port for v0.3.
- Verified locally: v0.2.0 application binary and NSIS/MSI artifacts are produced with matching product versions and SHA-256 hashes. Both installers completed their normal production build paths, including WiX ICE validation for the MSI.
- Verified locally: the current-commit NSIS and MSI packages install, register version 0.2.0, launch successfully, and uninstall without leaving the application registration or executable behind. Manual release testing is also complete.
- Next: merge the final release proposal and monitor the publication workflow that creates the tag, installers, checksums, and GitHub Release.

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
