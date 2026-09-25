# Product Scope

This document distinguishes the published v0.3.2 capability set from the v0.4.0 candidate. Shipped changes belong in `CHANGELOG.md`; future work belongs in `PRODUCT_ROADMAP.md`.

## v0.4.0 candidate delta (not yet published)

The release branch implements transactional native user data, current-origin migration and retained recovery, scoped atomic imports, conservative scan/rename identity, player teardown, bounded probes, safer cleanup, critical-dialog focus and reconnect recovery. The browser uses a corresponding transactional IndexedDB adapter. Development native data is separated from installed data. See [candidate notes](releases/v0.4.0.md), [data recovery](DATA_RECOVERY.md) and [implementation/evidence status](DESKTOP_V0.4_PLAN.md).

The persistence limitations below describe **published v0.3.2**, not the candidate implementation. The maintainer has reported candidate migration and both installer formats passing; final merge-artifact smoke and publication remain open. Candidate validation is not a claim of released support.

## Product purpose

VOID (Video Offline Index Directory) is an offline-first organizer and player for personal video libraries. It is designed for people who keep the original files in ordinary folders and need a fast visual index, flexible tags and smart collections, useful playback controls, library-health evidence, and safe assistance with duplicate copies.

Core principles:

- **Local first:** source videos are not uploaded, copied into the application, or sent to a service.
- **User-owned organization:** tags, favorites, collections, playback state, and backups remain under the user's control.
- **Shared product, capable platforms:** browser and desktop use the same React UI and domain rules; native capabilities are exposed through explicit ports.
- **Evidence before mutation:** health checks explain problems, duplicate matching distinguishes certainty levels, and desktop cleanup is recoverable and confirmed.
- **Large-library usability:** the engineering target is at least 5,000 videos and 300 tags. Synthetic benchmarks exist; representative installed-app latency and memory budgets still need validation. See [PERFORMANCE.md](PERFORMANCE.md).

## Current capability set (v0.3.2)

### Library and Explorer

- Select and recursively scan a folder containing `.mp4` and `.webm` videos.
- Restore or reconnect a known library and reconcile added, changed, renamed, and removed files.
- Generate progressive thumbnails with black-frame refinement and persistent caching.
- Search filenames and relative paths; filter by folder, favorites, untagged state, tags, and a library-scaled duration range.
- Sort and browse a virtualized grid with multiple densities, hover previews, bulk selection, and direct file reveal where supported.

### Organization

- Create, rename, color, favorite, search, merge, link, and remove reusable tags.
- Assign tags from tiles, the quick picker, bulk actions, the player, or the docked tagging workspace.
- Favorite videos and retain playback progress, watched state, completed-play counts, and recent activity.
- Create live smart collections from nested `All`/`Any` groups containing positive or negative tag rules, watched rules, and duration ranges.
- Export and merge portable, versioned JSON backups containing tags, favorites, smart collections, and playback history. Media paths are library-relative so a backup can be mapped onto the same library in another supported environment.

### Playback

- Play the currently displayed Explorer or collection scope with previous/next navigation, keyboard controls, fullscreen, and a maximized tagging layout.
- Choose displayed order, random shuffle, or non-repeating smart shuffle independently from repeat off, repeat one, or repeat all.
- Resume saved progress and apply saved defaults for volume and playback speed.

### Health and duplicate safety

- Report discovery, thumbnail, duration, and media-analysis coverage with bounded diagnostics.
- Separate exact-content candidates from probable matches and same-name collisions; show the evidence behind every group.
- Merge supported metadata into a selected keeper without removing source metadata or files.
- On desktop only, move selected redundant files from an exact group to the Windows Recycle Bin after full streaming-hash revalidation and explicit confirmation. VOID prevents deletion of the selected keeper and does not silently permanently delete files.

## Edition boundaries

| Capability | Browser | Windows desktop |
| --- | --- | --- |
| Shared UI, filtering, tags, collections, playback, and backups | Yes | Yes |
| Folder access | Browser File System Access API in Chromium; session file access fallback elsewhere | Native folder picker and trusted library root |
| Discovery and change detection | Rescan through browser permissions | Native recursive scan, watcher, and reconciliation |
| Media catalog | Browser IndexedDB | SQLite in the application-data directory |
| Thumbnail cache | Browser storage | Disk-backed application cache |
| Reveal in Windows Explorer and streaming full-file hashes | No | Yes |
| Verified duplicate cleanup through Recycle Bin | No | Yes |
| Public hosted deployment | Not currently maintained | Not applicable |

The shared application must feature-detect capabilities. Desktop-only actions must never be simulated in the browser, and common behavior must not fork merely because the storage or filesystem adapter differs.

## Data ownership and current persistence

This section records the published v0.3.2 baseline. The candidate's replacement contract is documented in [data recovery](DATA_RECOVERY.md).

- Source videos stay in the selected library folders.
- Desktop media-index records live in SQLite under the stable application identifier; generated thumbnails live in the application cache.
- Browser library state and cached assets live in browser-managed storage and remain subject to browser permission and storage rules.
- Tags, favorites, collections, playback records, and settings currently use the shared WebView/IndexedDB persistence layer in both editions. Development (`pnpm dev:desktop`) and an installed desktop build use different web origins, so their browser-owned stores are separate even when they point at the same video folder.
- Portable JSON export/import is the supported cross-environment transfer and recovery mechanism in v0.3.2.

Current recovery limits found in the [assessment](REPOSITORY_ASSESSMENT.md): backups omit durable settings, exports collect global annotation/playback records while identifying one active library, and import remaps records onto the selected library. Cross-library transfers can misapply metadata when different libraries share relative filenames. Imports merge multiple stores without a cross-store durable transaction. v0.4.0 must resolve these scope and durability gaps before broader portability is advertised.

The application currently has one active library root; recent-source information is not a fully independent multi-library workspace. MP4/WebM discovery does not guarantee playback of every codec inside those containers. Native scan progress is delivered after the native traversal returns; some native discovery failures are not yet surfaced. These limitations are scheduled in the reliability/performance milestones.

Moving user-authored desktop metadata to a native, migration-aware store is a required v0.4.0 outcome. Until that ships, users should export a backup before changing development/installed environments or performing maintenance that may affect browser storage.

## Supported and unsupported scope

The supported desktop target is Windows 10/11 x86-64. Installers are currently unsigned, manual-download NSIS and MSI packages. Use the same installer format for in-place upgrades; switching formats requires uninstalling without deleting application data and then installing the other format.

VOID is not currently:

- a cloud library, streaming service, media server, or account-based sync product;
- a transcoder, codec pack, or video editor;
- a replacement for filesystem backups;
- a mobile, macOS, or Linux application;
- an automatic duplicate remover;
- automatically updated or Authenticode-signed;
- guaranteed to preserve metadata after external file moves unless reconciliation can identify the rename.

These boundaries can change only through an explicit roadmap/release decision and the relevant safety, migration, and QA work.
