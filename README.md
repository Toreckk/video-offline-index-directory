<div align="center">
  <img src="apps/desktop/icon.svg" alt="" width="88" height="88" />
  <h1>VOID</h1>
  <p><strong>Your videos. Your folders. Your library.</strong></p>
  <p>A local video organizer and player for Windows, with a shared browser edition.</p>

  <a href="https://github.com/Toreckk/video-offline-index-directory/releases/latest">Download for Windows</a> ·
  <a href="docs/PRODUCT_SCOPE.md">Features & limits</a> ·
  <a href="docs/PRODUCT_ROADMAP.md">Road to 1.0</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</div>

---

**Current release: v0.3.2 · Windows x86-64 · Early development**

Point VOID at a folder of MP4 and WebM videos. Browse a visual grid, preview clips, find them with tags and filters, build smart collections, and pick up playback where you left off. Your source files stay in their folders. No account or media upload is required.

## What you can do today

| Find | Organize | Watch |
| --- | --- | --- |
| Virtualized grid and hover previews | Tags, favorites and bulk tagging | Resume progress and watched state |
| Filename/path, folder and duration filters | Nested smart-collection rules | Displayed order, shuffle and smart shuffle |
| Cached thumbnails and media details | Portable JSON metadata backups | Repeat modes, fullscreen and tagging workspace |

The Windows edition adds native folder scanning/watching, a SQLite media catalog, a disk thumbnail cache, file reveal, streaming hashes, and confirmed Recycle Bin cleanup for verified duplicate copies. [Compare editions and data ownership](docs/PRODUCT_SCOPE.md).

## Get started

1. Download the [latest Windows release](https://github.com/Toreckk/video-offline-index-directory/releases/latest). Choose the NSIS `.exe` for a straightforward per-user install, or the `.msi` for the MSI installation path. Installers are currently **unsigned**; checksums accompany each release.
2. Open VOID and choose **Configure Library Route** to select your video folder. Subfolders can be included.
3. Browse, tag, create collections, and play. Export organization from **Settings → Tags → Library metadata backup** before important maintenance.

Windows 10/11 x86-64 is the documented target. MP4/WebM decoding depends on the available browser/WebView2 codecs; not every codec inside those containers is guaranteed. ffprobe is optional and is not bundled. Automatic updates, hosted web deployment, media serving and transcoding are not included.

For upgrades, keep the same installer format. [v0.3.2 release notes](docs/releases/v0.3.2.md) explain continuity and the outstanding MSI runtime QA limitation. Development and installed builds currently use different metadata origins. See [data ownership and recovery limits](docs/PRODUCT_SCOPE.md#data-ownership-and-current-persistence).

## Where the project is going

The foundation is useful; reliability, desktop performance, and UI clarity come next. The [repository assessment](docs/REPOSITORY_ASSESSMENT.md) records concrete findings and validation evidence.

**v0.4: reliable playback and durable metadata → v0.5: measured desktop performance → v0.6: UI and brand → everyday playback, portability, optional local Insights, trusted updates → v1.0.**

The [detailed roadmap](docs/PRODUCT_ROADMAP.md) gives each milestone dependencies and acceptance gates. These are plans, not shipped capabilities or delivery dates.

## Develop locally

Use Node.js **24.11.1** from `.node-version` and the exact **pnpm 11.19.0** recorded in `packageManager`. Desktop builds require **Rust 1.98+** (CI: 1.98.0), Microsoft C++ Build Tools and WebView2; see [Tauri's Windows prerequisites](https://v2.tauri.app/start/prerequisites/#windows).

```sh
pnpm install --frozen-lockfile
pnpm dev:web          # Local browser edition
pnpm dev:desktop      # Windows Tauri application
```

```sh
pnpm check            # Version/release tests, shared tests, lint, both UI builds
pnpm check:native     # Rust format, locked Clippy and tests
pnpm build:desktop -- --locked  # Optimized Windows installers
```

Web output: `dist/web`. Desktop UI: `apps/desktop/dist`. Installers: `apps/desktop/src-tauri/target/release/bundle`. Generated installers, caches and personal videos do not belong in Git.

```text
apps/web                   Browser composition root
apps/desktop               Tauri composition root, Windows shell and Rust backend
packages/app               Shared React UI, domain state and feature workflows
packages/core              Platform contracts
packages/platform-web      Browser adapter
packages/platform-desktop  Tauri adapter
benchmarks                 Executable scale/render/cache checks
scripts                    Release validation and publication tooling
```

## Project guide

- [Assessment](docs/REPOSITORY_ASSESSMENT.md): strengths, risks, product decisions and measured baseline.
- [v0.4 candidate](docs/DESKTOP_V0.4_PLAN.md), [testing instructions](docs/V0.4_TESTING.md), [data recovery](docs/DATA_RECOVERY.md): implementation status, migration and checks before publication.
- [Roadmap](docs/PRODUCT_ROADMAP.md), [UI/brand brief](DESIGN.md), [performance plan](docs/PERFORMANCE.md): what to build and how to judge it.
- [Architecture](docs/adr/0001-platform-ports-and-adapters.md), [manual QA](docs/MANUAL_QA.md), [contribution guide](CONTRIBUTING.md): how to change it safely.
- [Release process](docs/RELEASE_PROCESS.md), [signing/update design](docs/UPDATE_SIGNING_ARCHITECTURE.md), [changelog](CHANGELOG.md): how work reaches users.
- [Security reporting](SECURITY.md): report sensitive issues without exposing private media or paths.

**License:** [MIT](LICENSE), copyright 2026 Juan Coret. Third-party dependencies retain their own licenses; see the [dependency review](docs/DEPENDENCY_REVIEW.md).
