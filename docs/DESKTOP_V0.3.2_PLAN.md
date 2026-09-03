# VOID Desktop v0.3.2 Plan

## Outcome

Ship a compatible performance patch that reuses already-loaded thumbnails across library surfaces, keeps large smart collections responsive through virtualization, and standardizes the product name as `VOID`.

## Committed scope

### Shared thumbnail resources

- Add one asset-keyed, reference-aware in-memory object-URL cache above the existing IndexedDB or desktop disk thumbnail cache.
- Deduplicate concurrent reads for the same versioned thumbnail key.
- Retain a bounded least-recently-used set of unmounted thumbnails for fast navigation while preserving active leases.
- Invalidate a key when its thumbnail is replaced and clear the in-memory layer when the persistent cache is cleared.
- Keep the persistent thumbnail cache as the source of truth; no second disk cache or metadata migration is introduced.

### Collection scalability

- Extract Explorer's responsive virtualized grid into a shared component.
- Use it for opened smart-collection results so only visible rows and a small overscan window mount.
- Preserve collection matching, queue order, each surface's existing tile sizing, tagging, favorites, hover previews, and playback behavior.
- Cover 5,000-video Explorer and collection rendering, shared-resource reads, invalidation, and retention bounds with automated regressions and repeatable benchmarks.

### Product naming

- Replace the legacy dotted product styling with `VOID` in web and desktop titles, the themed title bar, product metadata, installer names, release titles, application copy, and repository documentation.
- Keep stable technical identifiers such as `@void/*` packages, `void-*` storage keys, `com.toreckk.void`, environment variables, and the repository slug unchanged.
- Preserve already-published v0.1.0–v0.3.1 tags and release assets unchanged; their remote filenames are immutable historical artifacts.

### Installer continuity

- Pin the MSI upgrade code generated for the v0.3.1 dotted product name so v0.3.2 is recognized as the same installed application.
- Add a one-time NSIS pre-install migration that passively removes the legacy installation and dotted-name shortcuts without deleting stable application data.
- Abort the NSIS installation if the legacy uninstaller cannot be located or completed rather than leaving two partial or competing installations.
- Enforce both installer identities through version verification and document same-format upgrade and cross-format switching behavior.

## Exclusions

- Thumbnail generation and the existing quick/refinement pass are unchanged.
- No eager pre-decoding of every thumbnail, new background service, native image database, or ffmpeg bundle is introduced.
- No collection matching, metadata schema, web deployment, automatic update, signing, or new distribution channel is included.
- The Insights workspace remains planned for v0.4.0.

## Sequence and progress

1. Done: create `release/v0.3.2` from the published v0.3.1 merge commit and align release intent.
2. Done: implement shared thumbnail resource leases, invalidation, and bounded retention.
3. Done: reuse the virtualized grid for smart-collection results and add 5,000-video coverage.
4. Done: normalize current product naming and release output to `VOID`.
5. Done: preserve v0.3.1 MSI and NSIS installer continuity across the product rename and add automated release invariants.
6. Done: repeat full automated validation, performance evidence, and current-commit Windows packaging with the migration enabled.
7. In progress: application and NSIS upgrade QA pass; freeze release notes/changelog, complete the remaining MSI installer smoke test, and obtain explicit merge approval.
8. Pending: merge the proposal and verify automated v0.3.2 publication.

## Acceptance gates

- Opening Explorer and a collection containing the same ready thumbnails performs no second persistent read for resources retained in the session cache.
- Concurrent consumers of one thumbnail key share one read and one object URL.
- Active thumbnail URLs are never revoked; unused retained URLs remain bounded at 256 entries and are revoked on eviction.
- Replacing or clearing a thumbnail invalidates future acquisitions while existing consumers remain safe until release.
- Explorer and a 5,000-video collection each mount fewer than 100 tile components at the standard 1,184 × 900 benchmark viewport.
- Collection matching and playback queue order remain unchanged.
- Legacy dotted product spelling remains only where compatibility code and historical documentation must identify the prior installation; all current UI, installers, and GitHub Release titles use `VOID`.
- Same-format upgrades from v0.3.1 to v0.3.2 leave one installed application and preserve settings, catalog data, annotations, collections, playback state, and cached thumbnails while presenting the new product name.
- The MSI upgrade code and NSIS legacy migration hook are checked by the release version verifier.
- Shared tests, lint, web/desktop UI builds, Rust gates, version verification, and optimized NSIS/MSI packaging pass.

## Publication behavior

The draft proposal targets `master`. Its merge changes `release-manifest.json` on `master`, which triggers the existing release workflow to rebuild, tag, and publish v0.3.2. Public web deployment remains excluded.

## Validation evidence

- `pnpm verify:version`, `pnpm test`, `pnpm lint`, `pnpm build:web`, and `pnpm build:desktop-ui` pass; 50 test files and 174 tests are green.
- Shared-resource coverage verifies one read/object URL for concurrent consumers, safe invalidation, failed-read cleanup, active-lease protection, and a 256-URL retention bound.
- Explorer and smart-collection 5,000-video regressions each mount fewer than 100 tiles while retaining the complete playback queue.
- `pnpm bench:v0.3.2` records 123.89 ms for a 2,500-video collection grid, 94.99 ms for a 5,000-video collection grid, and 2.88 ms for a 100-thumbnail Explorer → Collection reuse pass with exactly 100 persistent reads total. Single-iteration timings are smoke evidence; bounded mounts and read counts are the acceptance invariants.
- Rust formatting, Clippy with warnings denied, and native tests pass; 16 tests pass and the opt-in media corpus benchmark remains intentionally ignored.
- Current-worktree product metadata reports `VOID` version `0.3.2`; generated installer source contains the legacy NSIS pre-install hook and the pinned MSI upgrade code `71ad7b99-f1e4-5189-90f0-1eb90aa8c545`.
- Continuity-enabled packaging produces:
  - NSIS `VOID_0.3.2_x64-setup.exe`: 2,983,752 bytes; SHA-256 `00e4dad085b733937ac7fa43fe7464ed2e0b0740daf30af9bec5562252874493`.
  - MSI `VOID_0.3.2_x64_en-US.msi`: 5,230,592 bytes; SHA-256 `ef04868ade2c754c216c85dd872f20f9ece1bc20551c5aa4e2c4e18259c1ec99`.
