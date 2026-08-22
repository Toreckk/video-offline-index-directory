# Windows Desktop MVP Plan

- Release: v0.1.0
- Status: Ready for release proposal
- Release branch: `release/v0.1.0`
- Supported desktop platform: Windows 10 and Windows 11, x86-64

## Release outcome

v0.1.0 proves that VOID can ship one shared product as both a web application and an installable Windows application, while the desktop application provides meaningful native performance and filesystem improvements rather than behaving as a simple website wrapper.

## MVP scope

### Shared product

- One React application and design system for web and desktop.
- Existing Explorer, collections, tagging, player, playback order, repeat, health, and duplicate-review behavior preserved.
- Platform capability descriptions drive the availability of native-only actions.
- Versioned metadata export/import remains portable between runtimes.

### Web adapter

- Existing Chromium File System Access integration retained.
- File-selection fallback retained for browsers without persistent handles.
- Existing IndexedDB catalog and thumbnail cache retained.
- No native-only capability is presented as available.

### Windows desktop adapter

- Tauri 2 application using the shared React frontend.
- Native folder picker and recursive filesystem discovery.
- SQLite catalog with explicit schema migrations and transactional replacement.
- Disk-backed thumbnail cache for faster successive loads and freedom from browser storage quotas.
- Native media URLs without reading an entire video into JavaScript memory.
- Reveal selected video in Windows Explorer.
- Streaming full SHA-256 verification for duplicate candidates.
- Restricted Tauri command permissions and library-root path validation.

### Distribution

- CI validates TypeScript, React tests, web production build, Rust tests, and Windows desktop packaging.
- Merging the reviewed release proposal into `master` creates tag `v0.1.0` and a GitHub Release.
- Windows installers, SHA-256 checksums, and release notes are release assets; generated binaries are ignored by Git.
- Releases are constructed as drafts and published only after every required artifact succeeds.

## Explicitly deferred

- File deletion or recycle-bin operations.
- Automatic mutation of a library-side `.void` metadata file.
- Filesystem watching and continuous background reconciliation.
- Native FFmpeg thumbnail extraction and bundled codec tooling.
- A custom VOID-themed desktop title bar with draggable regions and themed minimize, maximize/restore, and close controls. It must retain Windows snapping, keyboard/system-menu access, DPI scaling, and accessibility behavior before replacing native decorations.
- macOS, Linux, and Microsoft Store distribution.

These items require separate security, licensing, recovery, or platform work. They can be introduced in later `0.x` releases without blocking the first useful Windows desktop build.

## Migration sequence

1. Record the browser baseline and add architecture/release documentation.
2. Convert the repository into a pnpm workspace and move the current React application into `packages/app` without behavior changes.
3. Add thin web and desktop composition roots.
4. Introduce platform contracts and migrate direct browser dependencies behind the web adapter.
5. Add the Tauri shell and native Rust commands.
6. Add SQLite and disk-cache adapters with schema migration tests.
7. Add reveal and full-hash duplicate verification.
8. Add metadata migration, capability UI, fixture tests, and performance instrumentation.
9. Add CI, packaging, release automation, and the release manifest.
10. Complete manual Windows QA and merge the release proposal.

## Acceptance gates

- All existing automated tests remain green.
- Web production build succeeds and behaves as before.
- Desktop production build produces an installable Windows artifact.
- A clean installation can select, scan, browse, preview, and play a library.
- A warm launch restores the desktop catalog before reconciliation.
- The 5,000-video/300-tag fixture remains interactive while indexing work is running.
- Catalog writes are transactional and a failed scan does not erase the last valid catalog.
- Metadata export from web can be imported on desktop without dropping supported fields.
- Native commands reject paths outside the selected library.
- No workflow publishes a release if tests, packaging, or checksum generation fails.

## v0.1.0 validation record

- Shared TypeScript suite: 123 passing tests.
- Native Rust suite: path-boundary enforcement, schema initialization, cache-key safety, supported formats, and a real 5,000-file discovery fixture.
- Scale metadata fixture: 5,000 videos and 300 tags export, parse, remap, and merge successfully.
- Strict linting: ESLint and Rust Clippy with warnings denied.
- Production builds: web bundle, desktop UI bundle, x64 NSIS installer, and x64 MSI installer.
- Manual browser smoke test: startup, navigation, playback defaults, library settings, and a clean runtime console.

## v1.0.0 readiness

The project reaches v1.0.0 when the shared platform contracts and metadata schema are stable, migration and recovery are proven, supported native file operations are recoverable, performance targets are met on representative 5,000+ video libraries, installation/update behavior is reliable, and the documented v1 capability set is complete.
