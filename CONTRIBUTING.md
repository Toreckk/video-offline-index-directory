# Contributing to VOID

Read the [current scope](docs/PRODUCT_SCOPE.md), [roadmap](docs/PRODUCT_ROADMAP.md), and [architecture](docs/adr/0001-platform-ports-and-adapters.md) before proposing a feature. The maintainer has not selected a project license yet; agree on the contribution/licensing policy before submitting substantial external work. No contributor agreement is implied by this guide.

## Local setup and checks

Use Node 24.11.1 (recorded in `.node-version`) and the pnpm version in `packageManager` (11.19.0). Run `pnpm install --frozen-lockfile`, then `pnpm dev:web` or `pnpm dev:desktop`. Desktop development requires Rust 1.98 or newer; release CI pins 1.98.0. Install the [Windows Tauri prerequisites](https://v2.tauri.app/start/prerequisites/#windows).

Development builds use a separate native `development` data/cache subdirectory. On first v0.4 launch, review the legacy-origin migration. If a remembered folder lacks a catalog, Reconnect Library opens the native picker to reauthorize the same path. Do not delete app data to fix a reconnect problem.

Run `pnpm check` for shared tests, release validation, lint and both UI builds; run `pnpm check:native` for native changes. Use `pnpm build:desktop -- --locked` for installer validation. The [manual QA](docs/MANUAL_QA.md) and [performance plan](docs/PERFORMANCE.md) explain when real-media/installed-app checks are required.

Use disposable fixture libraries. Do not commit generated installers, personal videos, absolute private paths, databases, signing keys, or diagnostic dumps containing user information. Browser development and installed desktop metadata currently have distinct origins.

## Focused changes

- Keep shared behavior in `packages/app`; add platform contracts in `packages/core` and implementations in adapters/native modules. Shared UI must not invoke Tauri directly.
- Put business rules in testable services; keep components focused on presentation and interaction. Extract complex orchestration when changing it, rather than rewriting unrelated code.
- Add regression tests for actual failure paths and domain invariants. Media mocks do not prove audio, decoder, or installer behavior; record those checks explicitly.
- Explain the user-visible problem, resulting behavior, validation and limitations. Include before/after evidence for performance and UI changes. Mark unperformed QA as pending.
- Use Conventional Commits (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`); record compatibility changes explicitly during 0.x.
- Update current scope only when capability lands; plans go in the roadmap and notable completed changes in `[Unreleased]`. Preserve historical release evidence through tagged links when old plans are removed.

For ordinary work use a focused branch and PR. During release assembly, implementation PRs target `release/vX.Y.Z`; the draft proposal targets `master`. See [release process](docs/RELEASE_PROCESS.md) before changing the manifest: merging an authorized new manifest on master can publish installers.

## Reporting problems

Use the bug report form with edition, version, Windows/browser version, installer format and a minimal reproduction. Redact filenames and paths; share synthetic media only when necessary. Report sensitive issues using [SECURITY.md](SECURITY.md). Feature proposals should name a user task, current friction, smallest useful outcome, and how success could be checked.
