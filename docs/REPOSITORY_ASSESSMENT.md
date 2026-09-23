# Repository assessment and decisions

Assessment date: **2026-09-05**; final local checks repeated **2026-09-06**. Baseline: **v0.3.2**, commit `f69cb8cd51e116bc86d228042ddbd7f492e0dc20`. This review includes the existing, uncommitted documentation consolidation on `codex/docs-v0.4-scope`. Application findings describe that baseline; release-tooling changes described below are new, unpublished work.

## v0.4 implementation follow-up

The findings and counts below remain a historical v0.3.2 baseline. Subsequent work on `release/v0.4.0` implements transactional storage/recovery, scoped imports, scan/rename safeguards, player lifecycle, probe limits, guarded cleanup and critical UX fixes. [The assembly plan](DESKTOP_V0.4_PLAN.md) links code evidence and pending gates; [the dependency review](DEPENDENCY_REVIEW.md) supersedes the baseline advisory/toolchain status. Broader performance and UI work remains scheduled in v0.5/v0.6. Do not interpret the baseline's missing tests or old advisories as freshly observed candidate failures.

## Where VOID stands

VOID is a useful early local-video organizer with a credible desktop architecture. It already goes beyond a prototype in tagging, nested smart collections, resume/shuffle behavior, browser fallbacks, and duplicate safeguards. It is not yet a dependable general-purpose local Plex replacement: compatibility is narrow, storage ownership is incomplete, some recovery paths can mislead users, and the interface asks new users to understand implementation concepts.

The next investment should be **trust → measured responsiveness → understandable everyday use**, followed by richer features. Retain the React/Tauri architecture. Neither a framework rewrite nor a native decoder rewrite is justified by the measurements gathered here.

The existing v0.4.0 proposal gets playback teardown and native metadata ownership right. Its five-part Insights workspace introduces an additional event model, retention decisions, queries, privacy controls, and backup semantics before those foundations are dependable. Move Insights to v0.9.0. Bring incomplete-scan protection, import isolation, rename correctness, and recovery errors into v0.4.0 instead. If player/audio fixes are ready earlier, release a focused v0.3.3 patch; do not hold them for a database migration.

## Evidence and limits

Reviewed workspace manifests, frontend routes/components/stores, platform contracts/adapters, all native modules, representative tests in each feature area, benchmarks, installer hooks, workflows, changelog, release history, current docs, and the existing docs diff. This is a broad engineering/product assessment, not a formal security audit or a claim that every code path was executed.

| Verification | Result in this workspace |
| --- | --- |
| TypeScript test check + Vitest | 50 files, 174 tests passed |
| ESLint; version verification | Passed |
| Web and desktop UI production builds | Passed; JS 440.37 / 459.57 kB, gzip 129.82 / 134.61 kB respectively |
| Rust fmt, locked Clippy with warnings denied | Passed |
| Locked Rust tests | 16 passed; 1 real-media probe benchmark explicitly ignored because it requires a configured corpus |
| Existing v0.2 and v0.3.2 benchmarks | Completed; interpretation below |
| Dependency advisory audit | pnpm reports 18 advisories: 10 high, 7 moderate, 1 low; all reported findings are development dependencies. Details below. Native advisories were not independently scanned. |
| New release tooling | 10 Node version-policy tests and 11 offline publisher scenarios passed; actionlint 1.7.12 validated all workflows |
| Documentation and new workflow execution | 42 local link/image paths checked across 20 Markdown files; external URLs/anchors not exhaustively checked. New workflows have not been run on GitHub or used to publish. |
| Optimized packaging | Native executable and NSIS built; MSI passed normal WiX validation after rerunning outside the sandbox, which initially could not access Windows Installer |
| Browser walkthrough | First-run Explorer, folder dialog, Settings at 1280×720; keyboard focus escape from folder dialog reproduced |
| GitHub public metadata | Latest release v0.3.2 targets baseline SHA; NSIS, MSI, checksums present; no open PRs returned by connector search |
| Installer/runtime verification | No install, upgrade, uninstall, real playback/audio stress, or representative desktop process-memory measurement performed in this audit |

Local versions: Node 24.11.1, pnpm 11.19.0, Rust 1.98.0. CI uses Node 22 and a moving stable Rust toolchain. Local passing results do not establish CI runner parity. v0.3.2 release notes explicitly record the MSI runtime upgrade QA waiver; a built MSI is not equivalent to a tested upgrade.

## What is good and should be preserved

- **Clear composition roots:** `packages/core/src/index.ts` expresses platform capabilities, with web/desktop adapters and shared product components. Continue this direction for persistence and native jobs.
- **Useful domain tests:** tag uniqueness/implications, rule-tree editing, duration semantics, shuffle, metadata merge, thumbnail leases, discovery, and guarded cleanup have targeted tests. These are more valuable than a coverage percentage alone.
- **Bounded rendering:** Explorer and Collections share `VirtualizedMediaTiles`; tiles use narrow annotation/playback subscriptions. `thumbnailResourceCache` leases prevent premature URL revocation and retain up to 256 URLs where consumers permit eviction.
- **Respect for user files:** canonical-path validation, streaming SHA-256, protected keeper, per-file cleanup results, and Recycle Bin use are sound starting controls. Keep exact, probable, and name-only evidence distinct.
- **Pragmatic media strategy:** direct desktop asset URLs avoid reading entire videos into JavaScript; optional ffprobe improves inspection without forcing a bundled media toolchain.
- **Release discipline already exists:** aligned versions, immutable-tag policy, pinned action SHAs, a stable installer identity, checksums, and written signing/update design. Improve these rather than replacing them with an elaborate release bot.

## Prioritized findings

P1 means address before expanding use or the next trust release; P2 means schedule before a stable public product. “Confirmed” means supported by code or reproduction, not that a user incident was observed.

| ID / priority | Evidence and impact | Required response / acceptance |
| --- | --- | --- |
| R01 · P1 · confirmed gap | `PlayerVideo.tsx` replaces keyed videos but has no outgoing pause/source-detach/load cleanup; `usePlayerMediaUrls.ts` only revokes URLs. Hover previews already implement explicit teardown. | Own each element's lifecycle, flush outgoing progress once, reject stale callbacks, and expose load/play errors. Test rapid navigation/close and measure audible/decoder behavior on installed WebView2. Persistent audio is a risk, not reproduced here. |
| R02 · P1 · confirmed | Tags, collections, playback, settings **and library identity** persist in IndexedDB. `App.tsx` gates library/settings hydration but not every user-data store. Storage failures mainly reach the console. | Native transactional user store; unified startup barrier; visible retry/export/recovery mode; installed-origin migration with receipt and retained source. Include library registry and hydration ordering, not just tags. |
| R03 · P1 · confirmed | `commands.rs::scan_directory` continues past WalkDir/canonicalization errors without returning diagnostics. `useNativeLibraryWatcher.ts` assumes a discovery result without diagnostics is complete. `useLibraryScanner.ts` retains only discovered IDs even after reported discovery errors. | Return completeness and bounded diagnostics. Never infer removals from an incomplete scan; preserve last-known records and mark unavailable. Test unreadable subtree, unplugged disk, disappearing file, and retry. This affects catalog visibility; source files are not deleted by reconciliation. |
| R04 · P1 · confirmed | `watcher.rs::WatchBatch` zips split From/To events by arrival order. `reconcileMediaAssets.ts` trusts hints for annotation/playback moves without identity verification. | Use tracker IDs where reliable; reconcile identity and ambiguous moves conservatively. Test interleaved renames, overwrite, case-only rename, directory rename, split batches, and two equal-size files. Never attach one video's metadata to another on an unverified hint. |
| R05 · P1 · confirmed | `AnnotationTransferPanel.tsx` exports global annotation/playback maps but labels one active library. `mergeLibraryMetadata` remaps every imported media ID into the active library. Switching A→B, then exporting/importing, can conflate equal relative paths. Import updates several stores independently and reports success before their asynchronous durable writes are acknowledged. | Explicit per-library versus full-backup scope, match/conflict preview, transaction with durable completion receipt, bounded parser size/depth, idempotence and A/B same-path fixtures. Preserve a recovery snapshot before merge. |
| R06 · P1 · confirmed | `media_probe.rs` uses `Command::output()` without timeout or bounded output collection. Probe jobs share the single serial thumbnail queue; JS abort stops applying results, not the native process. | Native deadlines, terminate/wait/reap, cancellation/job IDs, bounded stdout/stderr, independent low-concurrency probe queue. A hung probe must not stop later visible thumbnails. Also hide helper console windows on Windows. |
| R07 · P2 · confirmed | Catalog load/save and thumbnail read/write/clear are synchronous Tauri commands. Save validates every file and rewrites a whole JSON payload in one SQLite row; thumbnail writes fsync; byte arrays cross JSON IPC. | Move blocking work off the main thread; serialize writes per library; measure IPC bytes and latency before a normalized catalog migration. Evaluate binary responses/scoped cache URLs for thumbnails. See performance plan. |
| R08 · P2 · confirmed | `preserveEnrichment` keeps duration/dimensions/thumbnail but drops videoCodec, audioCodec, mediaProbeStatus for unchanged reconciled files. Only affected assets get enrichment scheduling. | Preserve all current enrichment when file version matches; invalidate it deliberately when bytes change. Add regression fixtures with native probe fields. |
| R09 · P2 · confirmed | Every watcher batch can cause a full-root scan; native scan returns one complete vector before the UI's batch pipeline starts. Watcher activation waits for initial thumbnail phase completion in `LibraryRouteProvider.tsx`. | Start watching around discovery with an explicit catch-up boundary, coalesce dirty paths, support native cancellation/progress and complete-scan fallback. Handle overflow/error without relying on a paths array being nonempty. |
| R10 · P2 · reproduced / code | Folder dialog leaves initial focus on the trigger and Shift+Tab escapes behind it. Player also lacks a shared focus trap/restore primitive. Sidebar removes outlines without a focus-visible replacement. | Shared accessible dialog, visible focus, inert background, Escape and focus return. Test real keyboard/screen reader behavior, including virtualized tiles and player controls. |
| R11 · P2 · confirmed | Onboarding says “Configure Library Route,” “Cinematography,” and MOV/MKV/R3D “coming soon.” Tiny 8–10px tile labels and always-present action overlays compete with video; 256px sidebar is fixed. | Plain folder/action copy, truthful supported formats, simpler navigation, readable list/details option, responsive sidebar, contextual actions. See `DESIGN.md`. |
| R12 · P2 · confirmed | Collections subscribes to entire playback map and computes each collection's count across all media. A progress update every two seconds copies/persists the whole playback map. Grid enrichment updates can invalidate whole-library derived calculations. | Separate progress from watched/count revisions; batch durable writes and enrichment patches; memoize counts by relevant revisions. Benchmark 100 collections during playback, not just static tiles. |
| R13 · P2 · confirmed gap | Cleanup hashes keeper once, hashes a candidate, then calls trash by path. Files may change between validation and mutation. Existing tests inject a trash callback; they do not prove OS behavior under concurrent replacement. | Define stable-file/handle checks and revalidate keeper availability per action; add concurrent-change and removable/network-volume tests. Fail closed if safe Recycle Bin behavior cannot be established. Keep source operations explicit. |
| R14 · P2 · confirmed gap | No end-to-end runner or platform adapter contract suite; jsdom media mocks cannot establish decoding, audio isolation, paint time, or installer continuity. | Add a small real-media browser/Windows smoke lane, storage-failure/migration fixtures and release evidence. Maintain focused unit tests; avoid testing every CSS class. |
| R15 · P2 · confirmed gap at baseline | No repository LICENSE or contributor/security guidance at baseline. GitHub About still describes a browser-only app under the dotted name. | The maintainer selected MIT on 2026-09-23; LICENSE, contribution and security guidance are present in the v0.4 candidate. Third-party notices and GitHub About still need review. |
| R16 · P1 tooling triage · registry evidence | `pnpm audit --json` reports 18 dev-tool advisories in the current lockfile, including Vite 8.0.11. Passing tests do not establish dependency security. | Patch/refresh the affected toolchain in a focused PR, reassess reachability, run frozen install/build/tests, and add recurring advisory review. Do not run blind audit-fix or claim the installed app is remotely exploitable from audit counts alone. |
| R17 · P2 · confirmed | `mediaStore.ts::addAssets` preserves prior thumbnails/probe fields by ID without checking size/mtime. Startup scans use this merge path, distinct from watcher reconciliation. A changed same-path video can retain obsolete enrichment. | Apply file-version invalidation consistently on startup, manual rescan and watcher updates; test same path with replacement bytes, not just newly added files. |
| R18 · P2 · confirmed, follow-up 2026-09-06 | `thumbnailEnrichmentPipeline.ts` skips queued-status patches for ready assets but still loops over every input asset, enqueues it and reads its cached Blob. Warm scans can read the entire thumbnail cache while display reads use a separate resource cache. | v0.5 P02: demand-led payload reads, shared same-key requests and bounded readiness/recovery checks. An unchanged warm 5,000-video scan must not read 5,000 JPEG payloads merely to restore readiness. Timing impact still requires measurement. |
| R19 · P2 · confirmed, follow-up 2026-09-06 | `thumbnailResourceCache.ts::createEntry` immediately calls `loadBlob` for each new key. Same-key leases and grid virtualization help, but there is no shared cross-key read limit, cancellation on viewport departure, byte budget or disk quota. | v0.5 P04/P07: bounded prioritized image admission, stale-request cancellation/discard and measured memory/disk retention. Exercise fast scrolling, eviction and cache-clear races without breaking active leases. |
| R20 · P2 · confirmed, follow-up 2026-09-06 | `generateVideoThumbnail.ts` sets `targetWidth = min(640, width)` and derives height proportionally. This is not a bound on height or total pixels for tall sources. | v0.5 P06: cap both axes and output pixels, measure readable quality at real tile densities, version cache keys when output policy changes. Test tall/rotated/extreme-aspect media; no specific memory incident was reproduced. |
| R21 · P2 · confirmed, follow-up 2026-09-06 | `duplicateDetection.ts` copies accumulated arrays while building size/fingerprint groups, giving quadratic copying for a large group. It already prefilters by size and limits hashing to two workers; native hash work is not interrupted by JS cancellation mid-call. | v0.5 P12: mutable local group accumulators, native cancellation and measured versioned analysis-cache reuse. Preserve fresh cleanup verification from R13; benchmark the large-equal-size case, not only diverse files. |

## Dependency and maintainability follow-up

The advisory scan is a dated registry snapshot, not proof of exploitability. All reported paths are marked development-only: Vite, brace-expansion, Babel core, PostCSS, undici, nanoid and browserslist. The [Vite Windows-path advisory](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) affects network-exposed development servers under its stated filesystem conditions and lists 8.0.16 as a patched version. Keep development serving local and update affected versions before the next release cycle. The local raw audit is saved under ignored `artifacts/audit/pnpm-audit.json`; regenerate it when triaging rather than treating counts as permanent. Cargo dependency advisories and third-party license compatibility still require a dedicated pass.

Maintainability hotspots are native `commands.rs` (627 lines), annotation store (466), library store (444), duplicate review (332), and library route provider (302). Length alone is not a defect, but these mix persistence, orchestration and UI concerns. Extract native scan/cache/cleanup services, a library-session coordinator, transaction-oriented metadata services and shared accessible controls as their behavior is changed. Keep explicit typed contracts, avoid duplicated desktop UI, and extend tests to adapters and error paths. Avoid a blanket reformat/rewrite that obscures the reliability fixes.

## Desktop performance: what the numbers actually say

At 5,000 synthetic videos / 300 tags, existing Node microbenchmarks measured means of **4.684 ms reconciliation**, **0.669 ms tag counts**, **1.236 ms filter/sort**, and **0.511 ms queue scheduling**. Those pure computations are currently small. Optimizing them alone is unlikely to explain or solve native desktop stalls.

The existing render benchmarks intentionally use one iteration with no warmup. The 5,000-item collection sample was 94.46 ms while the smaller 2,500 sample was 131.22 ms. Treat these as smoke evidence that virtualization bounds mounted elements, not stable timings or proof that larger libraries are faster. The benchmark runner's ratios compare different operations and are not before/after speedups. jsdom does not decode video, paint the grid, or execute desktop IPC.

First profile synchronous native commands, full catalog serialization/path stats, thumbnail IPC and fsync, ffprobe/process lifecycle, and watcher-driven work. Then measure subscriptions, collection counts and memory retention under real playback. The separate [performance plan](PERFORMANCE.md) defines instrumentation, workloads, and provisional budgets.

The 2026-09-06 follow-up adds R18–R21 after reviewing warm enrichment, resource loading, image dimensions and duplicate grouping. The [roadmap](PRODUCT_ROADMAP.md#concrete-large-library-and-thumbnail-work-packages) now assigns twelve concrete scale work packages to v0.5 and carries their gates into UI, playback, multi-library, Insights and stabilization releases. These are code-supported opportunities, not measured speedups. The roadmap's unresolved-evidence tracker also assigns the installer/runtime, dependency, CI, accessibility and product-validation limitations to specific release gates.

## Product, business, and feature direction

**Primary user hypothesis:** someone with thousands of personal clips, downloaded videos, or reference footage in ordinary folders who wants to find, organize, and resume them privately. The differentiated workflow is select folder → recognize clips visually → tag/filter → play → retain organization safely.

**Secondary hypothesis:** a casual viewer who mainly needs a Continue watching shelf, understandable playback errors, subtitles, and a reliable installer. Validate this group before turning VOID into a movie/TV metadata product.

Do not compete on server administration, streaming to televisions, transcoding farms, accounts, remote access, or catalog-provider breadth before 1.0. Each expands deployment, support, privacy, and licensing costs without proving the core workflow. Windows desktop should be the primary distribution focus; browser remains a useful local edition, portability path, and test surface. Preserve shared domain behavior while being honest about platform limits.

There is no usage, retention, market-size, or willingness-to-pay evidence in this repository. Do not infer traction from code completeness or install counts. Run five formative sessions on consented/disposable libraries: first playable video, find a remembered clip, tag 20 clips, create one collection, resume after restart, recover a backup. Record completion, assistance, confusing labels, and failures without collecting filenames/video contents. Repeat with new participants after the redesign; this is directional research, not statistical validation.

Track opt-in feedback and release regressions rather than installing telemetry by default. A later commercial model should fund signing, maintenance, support, and usability; do not promise subscriptions or paid tiers until license policy and user value are understood. Keep access to existing organization and exports independent of any future monetization experiment.

## Changes made by this assessment

- Replanned v0.4.0 and the path to v1.0.0 with dependencies, exclusions, recovery requirements, and acceptance gates.
- Replaced the old visual-reference document with an actionable UI/UX and brand brief; refreshed README and durable product/release/performance guidance.
- Added read-only Windows candidate packaging with retained artifacts and a separate protected publication job. The reviewed SHA, versions, notes, exact installer names, checksums, and draft/tag state are verified before publishing.
- Extended version verification to Cargo.lock, stable app identity, manifest/bundle targets, note headings, and publication changelog readiness; added automated release-policy checks and contributor entry points.

Application findings above remain scheduled work. This change does not implement the player, storage, scanner, or UI redesign, bump the release version, alter signing, publish a release, or change GitHub protection settings.

## External references

- [Tauri command execution](https://v2.tauri.app/develop/calling-rust/): synchronous commands run on the main thread; use asynchronous dispatch with blocking work isolated appropriately.
- [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): focus containment, initial focus, background inertness, and focus return inform the dialog acceptance tests.
- [GitHub artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations): provenance is distinct from publisher signing; the new plain build-info file is useful traceability, not an attestation.
- [Current release evidence](https://github.com/Toreckk/video-offline-index-directory/releases/tag/v0.3.2) and local [release notes](releases/v0.3.2.md): supported distribution and explicit MSI QA limitation.

Keep this assessment as the rationale for the current roadmap. When findings close, record implementation/evidence links here; move enduring decisions into ADRs and avoid accumulating another parallel implementation history.
