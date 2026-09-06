# VOID Manual QA

This is an evergreen regression checklist for the current supported product. Version-specific evidence belongs in `docs/releases/`, not here.

For the current candidate, follow [v0.4 testing instructions](V0.4_TESTING.md) and record results against [the assembly gates](DESKTOP_V0.4_PLAN.md).

Use a disposable library containing nested folders, `.mp4` and `.webm` files, duplicate and same-name examples, short and long videos, black opening frames, one corrupt file, and unsupported files. For scale checks, use representative 2,500- and 5,000-video fixtures with at least 300 tags. Never run cleanup tests against irreplaceable media.

## Test matrix

- Current Chromium browser build.
- Firefox fallback behavior where called out.
- Windows 10 or 11 x86-64 desktop development build.
- Clean and same-format upgrade installations of both NSIS and MSI packages before a release.

The hosted web edition is not currently published, so browser QA uses the local web build.

## Library access and discovery

- Select a library, cancel a selection, reconnect it, restore it after restart where supported, and disable automatic restoration.
- Scan with subfolders enabled and disabled. Confirm only supported video files appear and folder/video counters remain accurate.
- Run a scan in the background, navigate between views, cancel it, and confirm discovered partial results remain usable.
- Confirm corrupt files and unreadable folders produce bounded diagnostics without stopping the rest of the scan.
- For a previously indexed library, deny subtree access or disconnect its drive during scanning. Existing entries must remain recoverable/unavailable rather than being inferred deleted from an incomplete scan. This is a known baseline gap; record failures honestly.
- On desktop, add, rename, modify, and remove files externally; confirm the watcher reconciles the library and preserves metadata on recognized renames.
- Interleave two renames, replace a destination, rename a folder and do a case-only rename. Tags/playback must never transfer based on an ambiguous pairing. Confirm unchanged codec/probe fields survive reconciliation.
- In Firefox, confirm the session-source fallback asks for reconnection after restart and never silently attaches a different folder to an existing library identity.

## Explorer, thumbnails, and performance

- Confirm placeholders render immediately, visible thumbnails are prioritized, black-frame candidates receive a later refinement pass, and cached thumbnails survive restart/rescan.
- Navigate Explorer → large collection → Explorer. Confirm already-loaded thumbnails are reused, mounted tiles remain bounded, and the UI does not freeze.
- Clear the thumbnail cache and confirm source videos and user metadata are untouched.
- Exercise filename/path search; folder, favorite, untagged, tag, and duration filters; sort modes; densities; and clear-filters behavior in combination.
- Confirm the duration slider derives its endpoints from measured library durations, direct values stay synchronized, and reset controls jump to the corresponding endpoint.
- Verify hover previews are delayed, muted, single-owner, and disabled by the autoplay-preview preference.
- Run automated performance benchmarks for the 2,500/5,000-video fixtures and investigate regressions before manual sign-off.

## Tags, favorites, and transfer

- Create, rename, recolor, favorite, search, merge, link, and delete tags; verify case-insensitive uniqueness, usage counts, assignment migration, and implication-cycle rejection.
- Exercise tile quick tagging, bulk assignment, player tagging, and the docked workspace with at least 300 tags. Confirm menus remain searchable, bounded, correctly positioned, and keyboard accessible.
- Favorite videos and tags, restart the same environment, and confirm they persist.
- Export a populated metadata backup, make local changes, and import it. Confirm tags, favorites, collections, and playback records merge without replacing unrelated data.
- Import a backup into the same library through another supported environment and confirm library-relative paths map to the intended files; report matched and unmatched records accurately.
- Switch between two libraries with equal relative paths before export/import. Confirm backup scope and conflict preview prevent cross-library metadata assignment; test disk-full/interrupted import and durable completion reporting. These are v0.4 acceptance checks, not claims about v0.3.2.

## Smart collections

- Build and verify `A AND B`, `A AND NOT C`, `A OR B`, and `(A OR B) AND G AND NOT E` using nested All/Any groups.
- Bulk-wrap selected rules into a new group, move one rule between groups, change group operators, and confirm live counts update without recreating the collection.
- Add, remove, or rename tags after saving a collection and confirm the collection remains a live query.
- Create duration and watched-state rules and confirm they match the same domain semantics as Explorer.
- Open a 5,000-video collection and confirm the viewer uses a virtualized grid and the player queue remains limited to that collection's current matches.

## Player

- Open MP4 and WebM videos and verify play/pause, seeking, volume, speed, resume, watched state, completion counts, favorite, tagging, and video information.
- Verify previous/next controls and Left/Right keys use the visible filtered/sorted scope; verify Displayed order, Shuffle, and Smart shuffle with Repeat off, one, and all.
- Confirm Smart shuffle does not repeat until the current scope is exhausted, Repeat all starts a new cycle, and Repeat one records completion before restarting.
- Exercise maximized, fullscreen, and docked-tagging layouts. Confirm native media controls remain clickable, navigation arrows are centered and visible, overlays hide after inactivity, and title-bar spacing is correct.
- Rapidly open and close videos and navigate while media is playing or buffering. Confirm only the selected video remains audible and decoder/resource use returns after closing the player.
- Verify Space, `f`, Escape, focus handling, tooltips, and reduced-motion behavior without triggering shortcuts inside form controls.

## Health, duplicates, and cleanup

- Confirm Library Health reports discovery, thumbnail, duration, and analysis coverage consistently with the source screen.
- Run duplicate analysis and verify exact-content groups, probable groups, and filename-only collisions are visibly distinct and naturally ordered.
- Select a keeper and merge metadata. Confirm tags, favorite state, playback history, and completed-play counts are added to it while all source records and files remain unchanged.
- Copy a candidate filename and confirm only the filename plus extension is copied and the control reports `Copied!` until refresh.
- On desktop with disposable exact duplicates, select redundant copies, review the confirmation, and run cleanup. Confirm VOID revalidates full hashes, protects the keeper, rejects changed/non-exact files, reports per-file results, and moves successful files to the Windows Recycle Bin.
- Confirm the browser never offers native reveal, streaming-hash cleanup, or source-file deletion.

## Desktop shell, persistence, and installers

- Toggle the themed and native title bars across restart, maximize, restore, fullscreen, and the docked player. Confirm exactly one title bar is visible and controls work.
- Restart the same installed build and confirm its catalog, thumbnails, tags, favorites, collections, playback records, and settings remain available.
- Upgrade NSIS → newer NSIS and MSI → newer MSI. Confirm one application registration remains and installed-to-installed user data is retained.
- Treat `pnpm dev:desktop` and an installed package as separate metadata environments until the v0.4.0 native metadata migration ships; use JSON export/import when comparing them.
- Switch installer formats only by uninstalling without deleting application data, then installing the other format; verify data remains before removing the old package.
- Confirm uninstall offers an explicit application-data choice and never removes source videos.
- Verify installer filenames, product name, version, checksums, unsigned status, and release notes agree with the release manifest.

## Accessibility and release sign-off

- Complete primary navigation, collection editing, tagging, playback, dialogs, and cleanup confirmation using only the keyboard.
- Confirm focus is visible, controls have meaningful accessible names, contrast remains readable in active/hover/disabled states, and reduced motion suppresses nonessential movement.
- Open each modal by keyboard: initial focus moves inside, Tab/Shift+Tab stay inside, background is inert, Escape closes, and focus returns sensibly. Keep focused player controls visible and check virtualized-grid focus after scrolling/filtering.
- Resize to representative laptop and desktop viewports; confirm no content is hidden behind the title bar, sidebar, player, or tagging panel.
- Run `pnpm test`, `pnpm lint`, `pnpm build:web`, `pnpm build:desktop`, and `pnpm verify:version`.
- Record installer smoke-test results and known limitations in the version's release notes. A known data-loss, unsafe cleanup, persistent-audio, migration, or installer-continuity failure blocks release.
- Record candidate and final merge SHA, Actions run/artifact, installer hashes, Windows/WebView2 versions, tester/date and pass/fail/pending per installer. Test final merge-SHA bytes before environment approval; then independently verify hashes of public downloads.

## Native jobs and migration acceptance (v0.4 onward)

- Simulate ffprobe hanging, failing, or returning excessive output. Confirm deadline/cancel kills and reaps the child and later thumbnails proceed. Cancel scan/hash work and switch libraries; stale jobs must not write into the new library.
- Exercise installed-origin migration from v0.3.2, repeated migration, newer native data, unknown schema, corruption, read-only/full disk and interruption around commit. Verify receipts, retained legacy data, recovery export and idempotence.
- Check all required metadata stores finish hydration before mutable UI becomes available; failures show recovery actions. Dev and installed native namespaces must remain deliberately separate after migration.
- Follow [PERFORMANCE.md](PERFORMANCE.md) for packaged-app p95 and memory evidence; synthetic/jsdom timings alone cannot satisfy release responsiveness gates.
