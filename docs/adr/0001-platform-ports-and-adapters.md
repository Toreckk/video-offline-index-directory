# ADR 0001: Platform ports and adapters

- Status: Accepted
- Date: 2026-08-22
- Target release: v0.1.0

## Context

VOID currently runs as a browser-only React application. Browser APIs are used directly for directory selection, recursive discovery, media file access, IndexedDB persistence, thumbnail storage, and clipboard access. That keeps the current application offline and easy to deploy, but it also couples product behavior to browser permission and storage constraints.

The Windows application must retain one shared user interface while adding capabilities that require a trusted native process: faster filesystem indexing, durable SQLite catalog storage, a disk-backed thumbnail cache, full-file hashing, and revealing files in Windows Explorer.

## Decision

VOID will use a ports-and-adapters architecture with two composition roots:

```text
apps/web          Browser entry point
apps/desktop      Tauri entry point and Rust native backend
packages/app      Shared React product UI and feature orchestration
packages/core     Platform-neutral contracts and domain values
packages/platform-web
packages/platform-desktop
```

Within the shared application, `features/media` owns normalized media state, media-source access, catalog persistence, and thumbnail processing. Explorer consumes that domain for presentation and filtering; Library consumes it for discovery and reconciliation workflows. This prevents platform-neutral media processing from depending on a route-level UI feature.

The shared application depends on capability-oriented ports, not on Tauri or browser globals. Each entry point installs one platform adapter before rendering the application.

The initial platform boundary covers:

- Runtime identity and capability discovery.
- Library selection and reconnection.
- Media discovery and source URLs.
- Catalog and thumbnail persistence.
- File reveal and content hashing.

Native commands are coarse-grained and validate every path against a library root selected by the user. The frontend is not given arbitrary SQL or unrestricted shell access.

## Storage ownership

- Web keeps its working state in IndexedDB and uses File System Access APIs where supported.
- Desktop stores its catalog in SQLite under the application data directory.
- Desktop stores generated thumbnails under the application cache directory.
- Source videos remain in their original folders and are never copied into the repository or application installation.
- Portable user metadata uses a versioned JSON export/import contract shared by both applications.

## Consequences

- Web and desktop share the same React components, routes, stores, filtering, playback rules, tagging behavior, and collection behavior.
- Desktop can improve scanning and persistence without forking the UI.
- Platform behavior can be tested with contract suites and in-memory fakes.
- Adding a new platform requires a new adapter rather than changes throughout the product.
- File deletion was deliberately outside v0.1.0. The later desktop implementation follows this boundary: it is limited to redundant members of exact-duplicate groups, revalidates complete hashes, protects the selected keeper, asks for confirmation, and uses the Windows Recycle Bin.

## Current implementation note (v0.3.2)

The platform split remains accepted and is now implemented. Desktop owns discovery, change watching, the SQLite media catalog, disk thumbnail storage, direct media URLs, Explorer reveal, hashing, and guarded cleanup. The shared application owns UI, filtering, tagging, collections, playback, and portable backup behavior.

One boundary is intentionally incomplete: user-authored tags, favorites, collections, playback records, and settings still persist through the shared WebView/IndexedDB store. Moving those records behind a versioned persistence port with a transactional desktop adapter and a non-destructive migration is planned for v0.4.0. This extends the decision; it does not justify a desktop-only fork of the shared domain or UI.

