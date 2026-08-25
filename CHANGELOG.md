# Changelog

All notable changes to V.O.I.D. are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Release notes remain the place for narrative highlights, downloads, supported systems, and safety notices; this changelog is the concise cross-release history.

## [Unreleased]

### Added

- An optional shared native-media-probe capability and desktop `ffprobe` adapter for duration, dimensions, video codec, and audio codec metadata.
- Native probe availability reporting, trusted-library path validation, bounded diagnostics, parser coverage, and an opt-in MP4/WebM corpus benchmark.
- Shared Explorer and smart-collection duration filtering with a library-scaled dual-handle range, precise bounds, explicit unknown-duration handling, and portable persisted collection rules.

## [0.2.0] - 2026-08-23

### Added

- Live desktop library watching and incremental reconciliation for added, changed, renamed, and removed videos.
- A VOID-themed Windows title bar with accessible controls and a persisted native-title-bar fallback.
- Virtualized Explorer rendering and repeatable 2,500/5,000-video performance benchmarks.

### Changed

- Rename reconciliation now carries tags, favorites, playback history, and play counts to the renamed media identity.
- Thumbnail work now uses a lower-overhead visible-first queue while retaining the existing decoder-concurrency limit.
- Shared media discovery, reconciliation, catalog, and thumbnail-enrichment boundaries keep web and desktop behavior aligned.

### Fixed

- Trusted native libraries reconnect correctly when automatic restoration is disabled.
- Thumbnail work interrupted by rapid watcher changes is safely replaced instead of remaining queued.
- Rename migration no longer leaves stale metadata at the original path.
- The themed desktop shell remains within one viewport without an extra title-bar-height overflow strip.

## [0.1.0] - 2026-08-22

### Added

- The first installable Windows desktop edition built with Tauri 2 while retaining the shared browser application.
- Native folder selection, recursive discovery, direct local-media delivery, Windows Explorer reveal, and full streaming SHA-256 verification.
- A persistent SQLite media catalog and disk-backed thumbnail cache for faster successive desktop launches.
- Portable versioned metadata export/import across browser and desktop editions.
- Automated NSIS/MSI packaging, SHA-256 checksums, and GitHub Release publication.

### Changed

- The project now uses a pnpm workspace with shared React product code and explicit web/desktop platform adapters.

### Fixed

- Desktop thumbnail generation no longer fails because canvas reads are tainted by native media URLs.
- Imported legacy annotations and favorites remap to the current native library identity when relative media paths still match.

[Unreleased]: https://github.com/Toreckk/video-offline-index-directory/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Toreckk/video-offline-index-directory/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Toreckk/video-offline-index-directory/releases/tag/v0.1.0
