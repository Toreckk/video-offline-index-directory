# V.O.I.D.

V.O.I.D. (Video Offline Index Directory) is an offline-first local video organizer. It provides Explorer, collections, tagging, playback queues, library health tools, and non-destructive duplicate review as both a browser application and a native Windows desktop application.

The desktop edition is not a thin web wrapper: it adds native scanning, a persistent SQLite catalog, a disk-backed thumbnail cache, direct local-media delivery, Windows Explorer integration, and streaming file hashes. The product UI and domain behavior are shared between editions through ports and adapters.

## Repository layout

```text
apps/web                  Browser composition root
apps/desktop              Tauri desktop composition root and Rust backend
packages/app              Shared React product and feature code
packages/core             Platform contracts
packages/platform-web     Browser adapters
packages/platform-desktop Tauri adapters
```

## Development

Requirements: Node.js 22+, pnpm 11+, and, for desktop work, the current stable Rust toolchain plus Microsoft C++ Build Tools.

```bash
pnpm install
pnpm dev:web
pnpm dev:desktop
```

Quality and production commands:

```bash
pnpm test
pnpm lint
pnpm build:web
pnpm build:desktop
pnpm verify:version
```

The browser build is written to `dist/web`. Tauri installers are generated below `apps/desktop/src-tauri/target/release/bundle` and are never committed.

## Releases

VOID follows Semantic Versioning and Conventional Commits. Release work is assembled on `release/vX.Y.Z`; merging its proposal into `master` triggers validation, Windows packaging, checksum generation, and GitHub Release publication from `release-manifest.json`.

See the [changelog](CHANGELOG.md), [product roadmap](docs/PRODUCT_ROADMAP.md), [desktop MVP plan](docs/DESKTOP_MVP_PLAN.md), [architecture decision](docs/adr/0001-platform-ports-and-adapters.md), and [release process](docs/RELEASE_PROCESS.md).

## Privacy and safety

Video files remain on the user's machine. v0.1.0 can reveal files in Explorer but intentionally has no delete command. Metadata exports contain organization data and filesystem-relative identifiers, not video contents.
