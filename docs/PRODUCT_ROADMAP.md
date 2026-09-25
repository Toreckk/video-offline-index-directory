# Product roadmap: v0.3.2 → v1.0.0

This document contains **unreleased intent**, not shipped features or dates. The [product scope](PRODUCT_SCOPE.md) describes today; the [assessment](REPOSITORY_ASSESSMENT.md) explains priorities. Versions below are planning containers. Split a milestone when needed, insert patch releases for regressions, and never bundle unrelated work merely to reach a version number. There is no maximum number of 0.x releases.

## Direction and release rules

Make Windows VOID a dependable, fast local-video library: **choose folder → find → organize → play → recover**. Keep one shared product/domain layer and an honest local browser edition. No account, cloud upload, media server, mandatory telemetry, or transcoding service is required for 1.0.

Every milestone must ship independently with migration/recovery decisions, focused tests, proportional real-media QA, changelog/notes, and a release candidate. Do not carry a known data-loss, unsafe-cleanup, persistent-audio, or upgrade-continuity defect into a wider feature release. Work on prototypes and branding may overlap; changing persistence or publishing installers depends on its preceding gates.

| Version | User outcome | Depends on | Size / principal risk |
| --- | --- | --- | --- |
| v0.3.3, if needed | Immediate playback/reconciliation regression relief | Reproduced fixes against v0.3.2 | Small; avoid coupling to migration |
| v0.4.0 | Metadata and playback can be trusted | Baseline audit; migration fixtures | Large; data migration and identity |
| v0.5.0 | Desktop stays responsive under real work | v0.4 correctness contracts | Medium/large; native concurrency |
| v0.6.0 | New users understand the app; cohesive UI and identity | User sessions; v0.5 budgets | Large; accessibility and workflow regression |
| v0.7.0 | Comfortable everyday playback | v0.4 lifecycle; v0.6 controls | Medium; WebView media support |
| v0.8.0 | Libraries can move and recover predictably | Native registry and backup contract | Large; identity ambiguity |
| v0.9.0 | Local Insights answers useful questions honestly | Stable persistence and playback events | Medium; metric definitions/privacy |
| v0.10.0 | Signed, recoverable distribution and updates | Signing operations and upgrade fixtures | Medium; external provider/key custody |
| v0.11.0 | Release-candidate quality and sustainable support | Core milestones above | Medium; real-world compatibility |
| v1.0.0 | Stable supported workflow and data contract | Explicit readiness sign-off | Stabilization; unresolved blockers |

Sizes are relative planning judgments, not estimates or staffing commitments. The maintainer owns product/release decisions; each implementation PR should name its engineering and QA owner, evidence links, and dependencies. Limit work in progress to one release proposal and a few focused implementation PRs. Reassess optional scope after each release.

**v0.4 implementation follow-up:** development-tool and Rust vulnerability updates, supported toolchain pins and recurring CI audits are implemented in this candidate; [dependency review](DEPENDENCY_REVIEW.md) records zero reported vulnerabilities and the remaining upstream warnings, owner and v0.5 reassessment deadline. R17's stale enrichment has scan/reconciliation fixtures. This work does not wait for signing. The maintainer selected MIT and reported both installer formats passing on `ef5d818`, followed by the MIT-bearing `88cfddb` smoke pass. Third-party notices/source links now ship with the installers; final merge-artifact smoke and publication remain tracked in the release PR.

## Execution contract and unresolved-evidence tracker

Use this roadmap as the working route to 1.0, alongside the current scope, assessment, performance contract, design brief and release runbook. Before starting each release, turn its work packages into a release plan and focused PRs with an owner, dependencies, acceptance checks and evidence links. Mark an item complete only when implementation and its relevant evidence exist. Reassess scope after each release; passing a version number is not evidence that its outcomes were achieved.

The table records baseline findings and required completion evidence. [The v0.4 assembly plan](DESKTOP_V0.4_PLAN.md) is the current implementation/evidence tracker: reliability code, fixtures, candidate installer QA and dependency notices are complete; final-artifact smoke/publication remain open. GitHub settings are additional operations work, independent of the new explicit publication dispatch. A baseline defect is not automatically a remaining code defect, and a passing unit test does not close its runtime gate. Follow [the candidate testing guide](V0.4_TESTING.md) before marking those gates complete.

| Limitation or unresolved finding | Required release / timing | Concrete completion evidence |
| --- | --- | --- |
| 18 development-tool advisories reported on 2026-09-05 (R16) | Before next release; focused maintenance PR now, at latest v0.4 | Regenerate pnpm audit, inspect affected paths/reachability, upgrade compatible direct/transitive packages and lockfile, run frozen install and full checks. Resolve applicable high/critical findings; any nonapplicable exception names advisory, rationale, owner and expiry. Do not assume yesterday's count is current. |
| Native dependencies and third-party licenses not independently audited | Before v0.4; repeat each release and on dependency changes | Add validated Rust advisory and dependency-license checks, record the resolved lockfile and results, triage findings with the same policy. v0.10 adds distributable SBOM/provenance; it is not the first security review. |
| New GitHub workflows only validated locally | Before using the next release workflow | Land process changes, run the nonpublishing candidate workflow on a reviewed branch, verify its checks/artifacts/notes/hashes, then verify the publisher with the next authorized new release. Never republish v0.3.2 as a test. |
| Local Node 24 versus CI Node 22; stable Rust moves; no platform adapter contract suite (R14) | CI parity before next publication; contract suite v0.4 | Establish/document supported toolchain versions, use frozen/locked installs, obtain actual hosted CI results and exercise shared storage/discovery/media contracts against both adapters, including failures. Local checks alone do not prove runner parity. |
| GitHub branch/tag/environment protections and private reporting unverified | One-time operations setup; before relying on those protections | Maintainer verifies settings and required checks/reviewers; link evidence in the release proposal. Explicit manual dispatch already prevents automatic publication on merge. A workflow's environment name alone does not create an approval gate. Rehearse enforced immutability before enabling it. |
| MSI runtime upgrade QA waived historically; current audit only built installers | Next release candidate, then every release; migration expansion v0.4, signed expansion v0.10 | Real clean install, same-format upgrade and uninstall for **both** NSIS/MSI, with SHA, hashes, Windows/WebView2, tester/date, preserved data and source-file checks. The maintainer reports both passed on `ef5d818`; exact hashes/environment details and final license-bearing artifact smoke remain release evidence. Hosted WiX validation passed; local ICE access can vary by Windows session. |
| Audible playback/decoder stress and real-media probe corpus not exercised (R01/R06/R14) | v0.4 mandatory; broaden compatibility in v0.7 | Synthetic distributable MP4/WebM corpus, installed-player rapid-navigation/close stress and probe timeout/cancel checks; enable the configured real-media test lane. Keep JS media mocks for unit coverage, not runtime sign-off. |
| Desktop process memory, paint latency and I/O not measured representatively; additional cache/image/duplicate scale gaps (R07/R09/R12/R18–R21) | v0.5 baseline and optimization; regression gates v0.6–1.0 | Repeated installed-app cold/warm/scroll/watch/soak results including WebView2 processes, with fixture/hardware and p95 evidence. Full work packages below. |
| Metadata ownership, partial scans, rename/import isolation and stale enrichment (R02–R05/R08/R17) | v0.4 correctness; v0.8 extends portability | Migration/partial-failure/A–B equal-path/replacement fixtures, durable receipts and recovery tests. Preserve library-specific ownership and correct thumbnail/probe invalidation. |
| Concurrent changes during duplicate cleanup (R13) | v0.4 safety review/fixes before broader cleanup use | Keeper disappearance/replacement and candidate replacement tests across supported storage types; per-file identity checks and fail-closed behavior, with actual Recycle Bin evidence on disposable media. |
| Keyboard/screen-reader/scaling coverage incomplete (R10/R11/R14) | Critical dialog/flow defects v0.4; full UI suite v0.6; final matrix v0.11 | Real keyboard and assistive-technology task completion, focus return, virtualized-item focus, contrast, scaling and reduced-motion evidence. |
| No selected project license at baseline; stale About description (R15) | MIT selected for v0.4; third-party notices before publication; About/help v0.11 | MIT file and package metadata, relevant dependency notices/source-availability review, and current About text. Do not conflate VOID's license with dependency licenses. |
| Unsigned installers and manual updates | v0.10; unsigned/manual status remains explicit beforehand | Signing/provider/key-recovery and real signed install/update failure-path gates in the update design. |
| Narrow codec/container support, one active root, no historical watch-time events | Compatibility/error handling v0.7; multiple roots v0.8; opt-in history v0.9 | Published tested media matrix, isolated multi-library/relink fixtures, and metric definitions with a tracking start date. These boundaries expand only when their complete workflows pass. |
| New product direction has not been tested with users | Before v0.6 design decisions; repeat v0.11 beta | Formative task sessions, documented friction and resulting changes. Interest in Insights or advanced organization must be validated independently of implementation enthusiasm. |

Public hosting, accounts, remote streaming and other operating systems remain deliberate exclusions before 1.0. They do not need to be implemented to close the audit. External-document links and anchor checks are not exhaustive; check important user-facing links as part of each documentation/release review.

## v0.4.0 — Reliability and durable organization

Status: **candidate implementation complete; final release gates in progress**; see the [v0.4 assembly plan](DESKTOP_V0.4_PLAN.md). Versions are aligned to v0.4.0 and publication remains disabled during assembly. This replaces the previous three-outcome plan: Insights is moved to v0.9.0; trust defects R01–R06 take precedence.

### Implementation sequence

1. **Capture regression fixtures.** Add two libraries with identical relative paths but different videos; interleaved rename streams; partial/inaccessible discovery; late old-video events; unavailable/corrupt stores; interrupted import. Add a tiny MP4/WebM corpus and a migration fixture from an installed v0.3.2 origin. Establish a shared adapter contract suite for supported storage/discovery/media behavior and failure semantics, with platform-specific capability expectations. Backups must be available before migration experiments.
2. **Player lifecycle patch.** Capture and release the exact outgoing element; pause, detach and load it before replacing ownership. Flush outgoing progress once, cancel pending preparation, and ignore callbacks from prior generations. Distinguish preparing, buffering, unsupported media, missing file and failed play. Preserve shuffle/repeat, scope queue, resume and docked/fullscreen behavior. This work may ship as v0.3.3 first.
3. **Persistence ADR and port.** Define schema versions, transactions, library registry, tags/relations, favorites, collections, playback, durable preferences, revisions and migration receipts. Separate ephemeral selection/progress UI from persisted records. Shared domain calls a storage port; browser adapter retains IndexedDB compatibility. Native store is the authority only after a successful migration commit.
4. **Migration/recovery state machine.** Before any mutable UI is enabled, hydrate all required stores. Discover only the current installed origin's legacy data; snapshot/export it, validate, preview counts/conflicts, transactionally migrate and write a receipt. Reruns are idempotent. Never overwrite newer native data or erase legacy state on failure. Unknown schema opens recovery/read-only mode. Dev uses a separate native data namespace; portable import is the deliberate bridge. Preserve the production application identifier.
5. **Safe discovery, reconciliation and imports.** Return completeness plus diagnostics; incomplete scans cannot establish deletion. Validate rename identity and refuse ambiguous mappings. Preserve codecs/probe state for unchanged media. Make backup scope explicit and prevent all-library records from being remapped into one active library. Parse with size/depth/count limits; preview matched/unmatched/conflicting records; commit all affected metadata in one transaction with a durable result.
6. **Bound native work and explain errors.** Add ffprobe deadline/cancellation/output bounds and separate its queue. Put persistence failures into visible recovery/status UI; add Retry, reconnect, and export actions. Fix onboarding claims and critical keyboard focus defects without waiting for the redesign.
7. **Protect cache and cleanup correctness under change.** Make startup/manual scan enrichment merging obey the same size/mtime/version invalidation contract as watcher reconciliation. Preserve unchanged codec/probe fields. After cache eviction or a missing/corrupt cached image, transition to retry/regeneration instead of keeping a permanent `ready` placeholder. Verify keeper/candidate identity and availability around each cleanup operation; stop on concurrent change or uncertain recoverability. These correctness contracts precede the v0.5 cache/concurrency work.

### Exit gates

- Installed v0.3.2 → v0.4 migration retains library identity, tags/relations, favorites, collections, playback and durable settings; receipt, counts and representative contents verified on both installer paths.
- Failure before/during/after commit, repeat migration, older/newer native data, read-only disk, corruption, and legacy-origin separation have deterministic tests and documented recovery.
- A/B backup fixtures never merge unrelated equal-path records. Import success means durable commit; cancellation/failure leaves prior data recoverable.
- Unreadable/disconnected subtrees remain cataloged as unavailable; rapid/interleaved renames never silently reassign metadata.
- Rapid next/previous/open/close on installed WebView2 leaves exactly the selected video audible, resumes correctly and releases decoders after settling.
- Timed-out probes terminate and are reaped; following thumbnail work completes. Main workflows are usable with keyboard and visible errors.
- Same-path replacement cannot display stale enrichment; missing/corrupt cache recovers; concurrent cleanup changes cannot remove an unverified candidate or proceed after losing the keeper.
- Close the pre-release workflow, advisory and installer-evidence items in the tracker above; retain actual runtime evidence alongside unit results.

**Excluded:** Insights UI/events, auto-updates, sidecars, new containers, perceptual cleanup, 200% volume, full visual redesign. If migration is too large, split intermediate 0.x releases; retain all trust gates before declaring the reliability milestone complete.

## v0.5.0 — Measured desktop responsiveness

**Outcome:** browse/play a 5,000-video library while discovery and thumbnails run without recurring freezes.

- Establish packaged Windows baseline and workload matrix from [PERFORMANCE.md](PERFORMANCE.md), including cold/warm startup, HDD/removable storage, 100 collections, playback, watcher bursts and a 30-minute soak.
- Move synchronous catalog/cache I/O off Tauri's main thread; introduce bounded native jobs and serialized per-library writes with revision checks.
- Reduce thumbnail JSON copies and catalog write amplification. Introduce delta SQL storage only if measured benefit warrants a separate migration.
- Add native discovery progress/cancellation and trustworthy watcher catch-up/overflow handling; avoid a full-root traversal for every ordinary dirty-file event.
- Batch enrichment/store writes, decouple collection counts from progress ticks, and add disk cache quotas/orphan cleanup with source/metadata protection.
- Extend current background-work controls into a durable job-status model: separate discovery/probing/thumbnailing, expose queued/running/failed counts, cancel safely and retry failed items without restarting the whole library. v0.6 supplies the finished activity UI; a restart may requeue version-validated unfinished work rather than resume an unsafe partial operation.

### Concrete large-library and thumbnail work packages

These packages refer to current source files; paths are relative to the repository root. Preserve existing virtualization, URL leases, file-version cache keys and source safety. **Generating thumbnails**, **reading cached images**, **decoding/displaying images**, and **scanning/persisting catalog metadata** have different bottlenecks and need separate measurements and limits.

| ID / sequence | Current code and improvement opportunity | Change to implement or evaluate | Acceptance evidence |
| --- | --- | --- | --- |
| P01 · first | `benchmarks/*`, `docs/PERFORMANCE.md`: render benches are single-sample jsdom checks | Add repeatable real-browser and installed-Windows workloads, queue/IPC/disk counters and process-memory sampling. Measure 100/2,500/5,000 videos, 300 tags, 100 collections; characterize 20,000 as stress. | Baseline cold/warm viewport, action-to-paint, scroll frames and 30-minute soak; record machine, sample count, median/p95/max. |
| P02 · warm startup | `useLibraryScanner.ts` → `thumbnailEnrichmentPipeline.ts`: every asset is queued and its thumbnail Blob is read, including `ready` assets | Restore catalog immediately; trust versioned cache metadata provisionally, request images for visible/nearby tiles, and check other entries through bounded background metadata/existence checks where needed. Regenerate misses on demand; coalesce concurrent requests for the same key across enrichment and display. | An unchanged warm 5,000-video open does **not** read 5,000 JPEG payloads to establish readiness. Visible cache hit/miss and corrupted/missing-image recovery tests pass. |
| P03 · native image I/O | `commands.rs::read_thumbnail/write_thumbnail/clear_thumbnail_cache`, `platform-desktop/src/index.ts`, `thumbnailCache.ts`: synchronous disk commands and `number[]` copies across IPC | Isolate blocking cache I/O; compare a binary response versus restricted cache URLs; preserve hashed keys and narrow access. Serialize same-key writes, use unique temporary names and safe replacement, coordinate clear/eviction against writers. Evaluate cheaper durability for regenerable cache separately from durable user metadata. | Lower bytes/copies/latency on representative images; no main-thread stalls, path-scope regression, corrupt replacement or cleared-cache resurrection from stale jobs. |
| P04 · cached-image loading | `thumbnailResourceCache.ts`, `useThumbnailUrl.ts`: each new key starts a read immediately; generation-queue priority does not limit these reads | Add a bounded shared cache-read/decode scheduler with same-key deduplication, viewport priority, small adjacent-row prefetch and cancellation/discard when consumers leave. Preserve active leases and do not prefetch the whole result set. | Fast scroll and Explorer↔collection navigation keep in-flight work bounded and show current-viewport images ahead of obsolete requests; unchanged retained keys avoid rereads. |
| P05 · generation queue | `thumbnailQueue.ts`, `thumbnailEnrichmentPipeline.ts`, `nativeMetadataEnrichment.ts`: whole-library enqueue, array sort/shift, pending-only deduplication and one serial queue shared with probes/refinement | Keep separate budgets for image decode, probe and disk work; bound admitted jobs and track queued/running jobs by library + asset version + phase. Preserve visible-first/fair deferred work, terminal outcomes and bounded retries. Profile replacing sort/shift with priority buckets/heap before choosing an implementation. | Repeated enqueue/scroll/rescan cannot duplicate active work for the same version; cancellation settles counters; visible jobs are not trapped behind a hung probe; long background work eventually progresses. |
| P06 · thumbnail dimensions | `generateVideoThumbnail.ts`: 640px width cap but height scales with source aspect ratio; one JPEG size/quality for all densities | Bound **both** dimensions and total pixels, including tall/rotated sources. Measure size/quality choices at actual tile sizes and display scaling; add size variants only if worthwhile and version their cache keys. Keep fast first frame and deferred dark-frame refinement. | Portrait/landscape/4K and extreme-aspect fixtures stay inside the pixel budget; text/content remains recognizable; byte size/decode-memory savings do not cause thumbnail errors. |
| P07 · cache lifetime | `thumbnailResourceCache.ts` retains by URL count; native cache lacks disk quota/LRU/orphan policy; web clear uses unbounded `Promise.all` | Add byte-aware memory accounting alongside active leases, disk quota/age policy and bounded eviction, orphan/refinement cleanup, and bounded browser deletion batches. Show cache usage and safe reset; protect active work and user-authored metadata. | Repeated scans/replacements/library switching do not grow disk usage indefinitely. Clear/evict/restart restores missing images; source files and organization remain intact. GPU memory is measured separately from Blob accounting. |
| P08 · catalog persistence | `catalog.rs`, `commands.rs::save_catalog`, `mediaCatalogCache.ts`: whole catalog JSON, per-file validation and multiple save checkpoints | Move blocking work to a bounded worker and serialize revisioned library writes; batch updates and validate changed records appropriately. Profile normalized rows/delta upserts against snapshots; adopt schema migration only when justified. | One late save cannot overwrite a newer catalog; unchanged enrichment no longer causes repeated full rewrites/stat storms; interrupted writes retain valid data. |
| P09 · discovery and watchers | `commands.rs::scan_directory`, `discoveryPipeline.ts`, `useNativeLibraryWatcher.ts`, `LibraryRouteProvider.tsx`: full vector before frontend batching; whole-root rescan per event batch; watcher waits for thumbnails | Stream native discovery batches with backpressure/cancellation; make progress represent discovery separately from enrichment. Start watch/catch-up at a trustworthy discovery boundary; reconcile dirty subtrees and rescan fully on overflow/uncertainty. | First results precede full traversal; paused thumbnail work does not prevent change detection; a single-file change avoids repeated root scans; partial scans never establish removals. |
| P10 · frontend work | `mediaStore.ts`, `MediaGrid.tsx`, `Collections.tsx`, `playbackStore.ts`: map copies and whole-library derived counts on enrichment/progress changes | Batch asset patches/persistence; split frequent resume position from watched/count revisions; memoize collections by relevant changes, preserve queue-array identity and use indexed membership for large bulk selections where profiling supports it. | Scrolling/filtering and 100 collection counts remain responsive during playback/enrichment; changes to unrelated progress do not recompute all memberships. |
| P11 · visual/decoder coordination | `VirtualizedMediaTiles.tsx`, `MediaTile.tsx`, `useHoverPreview.ts`, `BackgroundWorkCoordinator.tsx`: bounded grid and playback pausing already exist | Retain virtualization; tune overscan/prefetch together, share visibility observations where beneficial, preserve focused items, and pause low-priority work when hidden/minimized or playing. Explicitly distinguish pausing queued work from cancelling/releasing active decode. | Bounded mounted elements and active decoders under resize/scroll/navigation; focus remains usable; pause/resume never loses queued work or retains old audio. |
| P12 · duplicate-analysis scale | `duplicateDetection.ts`: size prefilter and two hashing workers already exist, but groups grow through repeated array copies and full hashes are recomputed | Use mutable internal accumulators rather than copying growing groups. Add cancellable, storage-aware hashing and versioned analysis-cache reuse where safe; show actionable per-file errors. Keep cleanup's fresh full-content validation independent of analysis caching. | Benchmark many equal-sized/identical files as well as ordinary libraries; no quadratic group-copy growth, unbounded I/O or false “exact” classification; cleanup safety remains unchanged. |

Implement P01 first; follow with warm-start/image-path work (P02–P07), catalog/discovery/subscription work (P08–P10), then tune visual and analysis costs (P11–P12) against the same workloads. These are work packages, not a mandate to change every data structure or add every optimization speculatively. Split additional capability into subsequent minor releases and renumber later milestones if needed; do not overload a patch release with architectural features.

### Scale work carried into later releases

- **v0.6:** apply P04/P07/P11 budgets to the new mosaic/list layouts, sidebar, focus and display scaling; the redesign cannot remove virtualization or request every thumbnail.
- **v0.7:** maintain decoder/cache limits with Continue watching, queue/subtitle views, preview suspension and playback lifecycle stress.
- **v0.8:** scope cache jobs, query indexes and quotas by library; inactive libraries must not retain all active assets/URLs. If 20,000-video measurements exceed acceptable memory/latency, introduce paged native queries and a bounded frontend working set with stable sort/filter/queue semantics. This is conditional implementation, not claimed existing support.
- **v0.9:** keep Insights aggregation off interactive rendering and avoid loading all events/media into JS for each view; preserve existing navigation budgets.
- **v0.11 / v1.0:** rerun the entire installed-app matrix and soak. Advertise only measured supported capacity: 5,000 videos/300 tags remains the initial gate; 20,000 and 100,000 are not implicit promises. Raise the supported target only after measured evidence and any required follow-up minor release.

**Exit:** publish repeatable before/after evidence, meet calibrated p95 interaction budgets, retain bounded grid/cache behavior, show cancellation latency and stable post-settle memory. Empty synthetic files alone cannot sign off decoding performance. **Excluded:** format expansion, arbitrary worker-count increases, framework rewrite, and cloud benchmarking/telemetry.

## v0.6.0 — Product UI, accessibility and brand

**Outcome:** a new user can add a folder, find a clip, organize it, and resume playback with little explanation.

- Run formative sessions before finalizing navigation. Use [DESIGN.md](../DESIGN.md) as the brief: Browse, Collections, Library management, Settings; add Home only when real return-visit content exists.
- Build shared dialog/menu/field/feedback primitives, tokenized typography/spacing, focus/keyboard patterns, system-aware reduced motion and compact sidebar behavior. Add a readable list view alongside the mosaic.
- Simplify first run to “Add a video folder,” show first usable results early, distinguish empty folder/no matches/offline source/indexing error, and provide a direct next action for each.
- Make tags and selection understandable, put backups in Data & backup, keep collection presets/simple builder with an advanced expression option, and expose queue scope and progress clearly.
- Add a compact activity panel for v0.5 jobs with actionable errors and per-operation pause/cancel/retry semantics. Preserve browsing context per library/view: query, filters, sort, density and scroll anchor, with a visible Reset action and fallback if the anchored item disappears.
- Add transaction-backed Undo for bulk metadata changes and collection deletion, with clear scope and bounded history. Keep source-file cleanup confirmation/recovery separate; never imply that metadata Undo restores a trashed file.
- Create and compare original wordmark/icon directions. Deliver source vectors, monochrome/light/dark variants and legible 16–256px app icons; regenerate installer/favicon assets without changing app ID or upgrade identity. Capture consented/synthetic screenshots for README.

**Exit:** keyboard + screen-reader completion of core flows; visible focus, readable contrast and no essential hover-only controls; 1024×700 minimum desktop window, common laptop scaling and 200% content zoom checked; formative sessions show fewer assistance points; performance budgets survive the redesign. **Excluded:** brand-driven storage/package renames and promises of unimplemented formats.

## v0.7.0 — Everyday playback

**Outcome:** reliable watching is as polished as organization.

- Add Continue watching and explicit Resume/Start over, discoverable queue panel and shortcut help. Decide with users whether repeat-one should remain the initial session default.
- Add scoped subtitle support (start with explicit local WebVTT selection; assess SRT conversion separately), caption size/contrast and persisted playback preferences. Define language/track limitations honestly.
- Produce a real container/codec/audio/subtitle compatibility matrix on supported WebView2 versions. Extension recognition must not imply decoder support.
- Offer an explicitly invoked external-player fallback only after native executable/path validation and capability design; explain unsupported playback with useful recovery actions.
- Evaluate seek/keyboard collisions with native media controls, fullscreen behavior, background previews, deleted current item, and playback writes on exit.
- Validate persistent manual playlists alongside rule-based collections. If sessions establish demand, add ordered item IDs, keyboard reordering, queue handoff and missing-item states; keep identity library-scoped and define backup migration before shipping. This is recommended scope, not a reason to postpone essential playback fixes.

**Exit:** real-media corpus passes on supported Windows environments; unavailable codecs/subtitles have actionable states; progress/completions are correct under replay/seek/rate changes. **Excluded:** bundled transcoding/codec packs, 200% amplification, and automatic broad container claims. Approve additional formats only as complete end-to-end support work with a distribution/license decision.

## v0.8.0 — Multiple libraries and portability

**Outcome:** moving drives or switching libraries does not silently lose or misapply organization.

- Extend the native library registry into explicit library switching, offline roots and relink preview. Distinguish “forget source,” “remove index,” and “delete organization”; show scope and recovery.
- Introduce stable asset identity separate from paths. Use file IDs/fingerprints as evidence with version checks; ambiguous matches require review. Test drive-letter changes, external moves, same names and replacement bytes.
- Support clearly scoped per-library and full backups with schema/version/checksum manifest, match report, pre-import recovery snapshot and documented settings coverage. Preserve supported legacy JSON readers.
- Add restore rehearsal UI and last successful backup information. Optional sidecar snapshots require their own opt-in/write-preview/recovery design and may be postponed.
- Offer opt-in local automatic metadata backups to a user-selected destination, with bounded retention, checksums, free-space/error handling and last-success status. Schedule while the app runs and catch up at next launch; do not promise backups while it is closed. Use a consistent snapshot API, never an uncoordinated live SQLite copy. Explain that metadata backups do not contain the videos and that same-disk backups do not cover disk loss.
- If manual playlists shipped, include their order, ownership and unavailable entries in all portability fixtures. Keep offline metadata usable and make reconnect/relink a guided action rather than forcing a new empty library.

**Exit:** A/B equal paths remain distinct across switching, restore and relink; offline roots retain searchable metadata; import/export round trips and interrupted migration recover; no source media bytes are changed. **Excluded:** live sync, cloud accounts, shared network writers, automatic sidecar writes. Reassess database backup strategy for WAL consistency; copying a live DB file alone is insufficient.

## v0.9.0 — Honest local Insights

**Outcome:** users understand organization coverage and viewing activity without disclosing their library.

- Validate interest first. Start with snapshot metrics already supportable: library size/storage/duration coverage, tagged/untagged, watched/unwatched and collection membership. Every metric includes definition, unknown-data handling, scope and deterministic fixtures.
- Design opt-in local session/event collection separately from saved resume state. Record session ID, asset identity, event/revision, elapsed watched intervals, completion and timestamps; define seek gaps, buffering, speed, repeat, timezone/day boundaries, deletion and retention.
- Add daily/weekly trends and tag/collection breakdowns only after new events exist. Label the tracking start date; never reconstruct historical watch time from lastPlayedAt or playCount.
- Scope by library/collection, explain overlapping tag/collection totals, provide reset/export controls and deliberate backup inclusion. Keep expensive queries off interactive rendering.

**Exit:** fixture-derived totals match definitions; replays and seeks cannot inflate watched time accidentally; disabled collection produces no events; old backups work; retention and export/delete tests pass; v0.5 budgets remain met. **Excluded:** predictive recommendations, social rankings and remote telemetry. If user validation finds low value, defer Insights beyond 1.0; dependable organization is the mandatory outcome.

## v0.10.0 — Trusted distribution

**Outcome:** users can identify the publisher and update safely.

- Operationalize Authenticode provider/certificate and expiry/renewal/recovery ownership; document ongoing cost. Signing procurement can begin earlier without blocking UI work.
- Harden release environment/tag rules and enable repository-enforced immutability if available and tested. Add verified build provenance/SBOM plus dependency-license review.
- Implement updater key custody, signed artifacts and stable manifest, initially manual “Check for updates.” Follow [UPDATE_SIGNING_ARCHITECTURE.md](UPDATE_SIGNING_ARCHITECTURE.md).
- Exercise offline/tampered/interrupted updates, schema compatibility, bad-release withdrawal and manual recovery. Enable background notifications only after two signed release cycles and a recovery drill.

**Exit:** signed NSIS/MSI clean install, same-format upgrade and uninstall verified on the supported Windows matrix; keys restored in a drill; invalid signatures rejected; source media and organization preserved. **Excluded:** forced updates, silent downgrade, beta signing keys trusted by stable. If the provider is unavailable, keep 0.x manual downloads honest; do not silently waive the 1.0 signing gate.

## v0.11.0 — Beta, support and stabilization

**Outcome:** external users can install, understand, recover and report problems without maintainer handholding.

- Invite a small opt-in beta using non-sensitive diagnostic reports; triage by core task failure, data safety and reproducibility. Fix blockers in patch releases.
- Maintain the MIT project-license policy and finalize third-party notices, privacy/data-location guide, uninstall/recovery instructions, keyboard help and supported format/platform matrix.
- Add user-approved redacted diagnostics export; reproducible issue templates and clear maintenance/version-support policy. Do not collect content or full paths by default.
- Run full migration chain from supported older versions, both installer formats, clean accounts, real-media/accessibility suite and large-library soak. Address missing disk, low disk, damaged cache and unknown schema.
- Freeze stable schemas/ports, document deprecation policy, and resolve every open P1 plus P2 affecting the supported core workflow.

**Exit:** two consecutive candidates pass the full release matrix with evidence; no untriaged core blocker; backup restoration independently repeated; docs and screenshots match actual behavior. This may require v0.12+ stabilization milestones rather than rushing 1.0.

## Ranked additions and scope decisions before 1.0

These are missing capabilities or substantial extensions to partial capabilities in v0.3.2, not claims that the current app lacks all related controls. Rank by preventing lost work and enabling common tasks before adding richer catalog features. **Must** items are readiness requirements; **should** items are planned candidates that can move beyond 1.0 with a documented user/value decision; **optional** items need evidence before implementation. The order within each band is the recommended priority.

| Rank | Addition / user value | Release and dependency | Minimum useful completion |
| --- | --- | --- | --- |
| 1 · must | Durable recovery and guided restore: organization must not depend on understanding a browser storage origin | v0.4 durable receipts; v0.8 restore/backup UI | Failed migration/import remains recoverable; users can export, preview and restore a scoped backup and see the last successful result. |
| 2 · must | Visible background activity and selective retry: large libraries should not look frozen or require starting over | v0.5 job model → v0.6 activity panel | Distinguish scanning/probing/images, show reliable counts, pause/cancel where supported, retry failures, and recover pending work after restart without stale writes. Existing global pause controls are the starting point. |
| 3 · must | Accessible, understandable navigation and usable large-library views | v0.6, with critical fixes v0.4 | Keyboard-complete dialogs and selection; readable virtualized list/mosaic, clear empty/error/offline states, context restoration without losing focus. |
| 4 · must | Everyday playback recovery, captions and resuming | v0.7 after lifecycle fixes | Continue watching, explicit Resume/Start over, local WebVTT captions and compatibility-specific errors. Investigate audio/embedded-track selection through the supported player API; offer it only where actually supported, otherwise explain the limitation/external-player route. |
| 5 · must | Offline-root handling and guided relink: removable-drive users should retain their catalog | v0.4 preserves unavailable entries → v0.8 identity/relink | Search offline metadata; preview match/conflict counts before reconnecting moved roots; equal-path libraries remain separate. |
| 6 · must | Trustworthy updates and support without exposing the library | v0.10 signing/recovery → v0.11 diagnostics/help | Signed tested installers, explicit update/recovery status, user-previewed redacted diagnostic export, accessible help and support policy. |
| 7 · should | Automatic local metadata backups: reduce dependence on remembering to export | v0.8 after consistent snapshot/restore contract | Opt-in destination and retention, app-running schedule/next-launch catch-up, failure reporting and a tested restore. Manual backup/recovery remains mandatory regardless. |
| 8 · should | Undo for bulk organization: reduce the cost of a mistaken selection | v0.6 after v0.4 metadata transactions | Undo tag/favorite/bulk collection edits within a defined session/history window, with durable result and safe conflict behavior. Explicitly exclude source-file restoration. |
| 9 · should | Manual ordered playlists: curate a viewing sequence that rules cannot express | v0.7 if validated; portability completed v0.8 | Add/remove/reorder with keyboard, persist sequence across restart, handle missing assets, and export/restore order without crossing library ownership. |
| 10 · should | Save a useful browse configuration: return quickly to a working set | v0.6 context retention; named saved views only if existing smart collections cannot express the need | Restore filters/sort/density and scroll anchor; allow reset. Reuse collection rules instead of introducing a second incompatible filter language. |
| 11 · optional | Clip bookmarks/notes and custom title/cover frame: recognize and revisit important moments | Optional v0.12+ curation milestone before 1.0 **only if validated**, otherwise post-1.0 | Local metadata only; timestamp bounds, accessible editing, schema migration, backup/relink behavior and cache invalidation. Do not rename or rewrite source videos implicitly. |
| 12 · optional | Exclusion rules for folders/files: keep huge unrelated subtrees out of discovery | Evaluate during v0.5 stress work; optional v0.8 or v0.12+ after scan-completeness contract | Preview excluded scope, define path/case matching consistently, retain authored metadata and allow reversal. Reprioritize into core scale work only if representative users cannot otherwise select usable roots. |
| 13 · optional | Insights and richer organization summaries | v0.9 if validated, otherwise post-1.0 | Scope/unknown-data definitions, optional local event collection, retention/export/delete and bounded queries. Existing resume records are not historical watch-time evidence. |
| 14 · optional | Larger supported capacity, advanced search or indexed queries | Characterize 20,000 in v0.5; targeted v0.12+ capacity milestone only on evidence | Publish a measured support envelope; add paged queries/indexes only with consistent sorting, filtering, counts and playback queues. Do not promise 100,000 videos from a small virtualized DOM. |
| 15 · defer | Provider metadata, semantic/transcript search, perceptual duplicates, transcoding, remote streaming and TV/mobile clients | Post-1.0 discovery unless the product direction is explicitly revised | Separate value/privacy/licensing/resource/support decisions. Never promote perceptual similarity to automatic safe deletion. |

An optional v0.12+ release should choose one coherent validated outcome, with its own implementation plan, migration and measured exit gates; it is not a bucket for all optional features. Additional stabilization releases take precedence. Do not require users to wait for analytics, bookmarks or AI features to receive reliability fixes.

## v1.0.0 readiness contract

1. Core add/find/tag/collect/play/resume/export/restore flows are supported end to end on the documented Windows target, including actionable job status/retry, offline-source recovery and the scoped caption workflow, with honest browser parity and codec limits. All **must** additions above have completion evidence; deferred **should** items have a recorded scope decision.
2. User-authored data survives supported upgrades and common failure paths; schemas/migrations/identity rules are versioned, transactional and recoverable.
3. Cleanup is explicit, recoverable and protected against known identity/concurrent-change failures; no known data-loss or persistent-audio blocker remains.
4. Representative installed-app performance meets the calibrated 5,000-video/300-tag budgets with published evidence, including background work and memory soak.
5. Main workflows work with keyboard, screen reader, scaling and reduced motion; product naming/assets and support docs are coherent.
6. Publisher signing, release protection, immutable artifacts, checksums and update/recovery procedures have passed their operational gates.
7. License/distribution policy, support ownership, release evidence and a credible patch process are settled.

Insights, sidecars, perceptual matching, ratings, external metadata providers and extra operating systems are **not** reasons to delay an otherwise ready 1.0. Move them beyond 1.0 unless user evidence changes their priority. Stable reliability is the release boundary, not feature count.
