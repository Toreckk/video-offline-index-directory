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

## Exclusions

- Thumbnail generation and the existing quick/refinement pass are unchanged.
- No eager pre-decoding of every thumbnail, new background service, native image database, or ffmpeg bundle is introduced.
- No collection matching, metadata schema, web deployment, automatic update, signing, or distribution-channel changes are included.
- The Insights workspace remains planned for v0.4.0.

## Sequence and progress

1. Done: create `release/v0.3.2` from the published v0.3.1 merge commit and align release intent.
2. Done: implement shared thumbnail resource leases, invalidation, and bounded retention.
3. Done: reuse the virtualized grid for smart-collection results and add 5,000-video coverage.
4. Done: normalize current product naming and release output to `VOID`.
5. Done: complete focused and full automated validation, performance evidence, and current-commit Windows packaging.
6. Pending: complete manual application and installer QA, freeze release notes/changelog, and obtain explicit merge approval.
7. Pending: merge the proposal and verify automated v0.3.2 publication.

## Acceptance gates

- Opening Explorer and a collection containing the same ready thumbnails performs no second persistent read for resources retained in the session cache.
- Concurrent consumers of one thumbnail key share one read and one object URL.
- Active thumbnail URLs are never revoked; unused retained URLs remain bounded at 256 entries and are revoked on eviction.
- Replacing or clearing a thumbnail invalidates future acquisitions while existing consumers remain safe until release.
- Explorer and a 5,000-video collection each mount fewer than 100 tile components at the standard 1,184 × 900 benchmark viewport.
- Collection matching and playback queue order remain unchanged.
- No legacy dotted product spelling remains in the repository, and new Windows installers and GitHub Release titles use `VOID`.
- Upgrading a v0.3.1 installation to v0.3.2 preserves settings, catalog data, annotations, collections, and cached thumbnails while presenting the new product name.
- Shared tests, lint, web/desktop UI builds, Rust gates, version verification, and optimized NSIS/MSI packaging pass.

## Publication behavior

The draft proposal targets `master`. Its merge changes `release-manifest.json` on `master`, which triggers the existing release workflow to rebuild, tag, and publish v0.3.2. Public web deployment remains excluded.

## Validation evidence

- `pnpm verify:version`, `pnpm test`, `pnpm lint`, `pnpm build:web`, and `pnpm build:desktop-ui` pass; 50 test files and 174 tests are green.
- Shared-resource coverage verifies one read/object URL for concurrent consumers, safe invalidation, failed-read cleanup, active-lease protection, and a 256-URL retention bound.
- Explorer and smart-collection 5,000-video regressions each mount fewer than 100 tiles while retaining the complete playback queue.
- `pnpm bench:v0.3.2` records 123.89 ms for a 2,500-video collection grid, 94.99 ms for a 5,000-video collection grid, and 2.88 ms for a 100-thumbnail Explorer → Collection reuse pass with exactly 100 persistent reads total. Single-iteration timings are smoke evidence; bounded mounts and read counts are the acceptance invariants.
- Rust formatting, Clippy with warnings denied, and native tests pass; 16 tests pass and the opt-in media corpus benchmark remains intentionally ignored.
- Current-worktree product metadata reports `VOID` version `0.3.2`, and normal NSIS/MSI packaging produces:
  - NSIS `VOID_0.3.2_x64-setup.exe`: 2,985,134 bytes; SHA-256 `5cd7a90d9b3c185c3a8571540601b384fad7d270b9e2ed62b97354de76041439`.
  - MSI `VOID_0.3.2_x64_en-US.msi`: 5,230,592 bytes; SHA-256 `321ef9d2f5d9b1ba3e4e332eda885d543ec76591fc026a92ded061384e58c886`.
