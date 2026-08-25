# Windows Desktop v0.3.0 Plan

- Release: v0.3.0
- Status: In development
- Release branch: `release/v0.3.0`
- Supported desktop platform: Windows 10 and Windows 11, x86-64

## Release outcome

v0.3.0 adds trustworthy media intelligence and the foundations for recoverable library cleanup. It keeps the web and desktop UI shared, keeps web file operations non-destructive, and introduces native-only capabilities behind explicit platform ports.

The release must improve duplicate decisions without turning a probable match into an unsafe delete action. Native media probing and Recycle Bin operations are therefore separate capabilities with separate readiness gates.

## Committed scope

### Native media-analysis prototype

- Add a shared media-probe contract without coupling the React application to FFmpeg or Tauri.
- Add an optional desktop `ffprobe` adapter that validates every media path against the selected library root.
- Parse duration, dimensions, and codec metadata with isolated diagnostics and no change to the current playback or thumbnail path.
- Benchmark probe success rate, warm/cold throughput, process overhead, installer-size impact, and thumbnail quality against the current WebView implementation.
- Record an explicit ship/defer decision before any FFmpeg binary is added to release packaging.

### Duplicate intelligence

- Preserve current same-name and sampled-fingerprint review behavior.
- Distinguish exact full-hash matches from probable matches in the UI and explain the evidence used for each group.
- Use available duration, dimensions, codecs, size, and normalized filename evidence to improve probable grouping.
- Keep metadata merging additive and require a user-selected preferred copy.

### Duration filtering

- Add shared minimum/maximum duration filtering to Explorer and smart collections after duration enrichment is reliable.
- Scale a dual-handle minimum/maximum selector from the shortest to the longest known video in the current library, with synchronized numeric inputs for precise ranges.
- Treat unknown duration explicitly instead of interpreting it as zero, and show users when unknown videos are excluded by an active numeric range.
- Keep Explorer duration filters session-scoped while persisting duration predicates inside saved smart collections.

### Recoverable desktop cleanup

- Add a desktop-only Recycle Bin port; the browser edition remains non-destructive.
- Permit removal only after full streaming SHA-256 confirmation of the selected duplicate set.
- Prevent removal of the final surviving copy, revalidate the file immediately before mutation, and require explicit confirmation.
- Merge supported metadata into the preferred copy before moving other exact copies to the Recycle Bin.
- Report every moved, skipped, and failed file without claiming atomic filesystem behavior.

### Distribution groundwork

- Document the desktop update trust model, signing keys, release-channel metadata, rollback expectations, and compromised-key response.
- Do not enable automatic updates until signing and recovery are proven in a later release.

## Explicitly excluded

- Permanent deletion or bypassing the Windows Recycle Bin.
- Destructive actions for probable or same-name-only duplicate groups.
- Browser file deletion.
- Public web deployment.
- Automatic application updates in production.
- macOS, Linux, or Microsoft Store packages.
- Bundled FFmpeg unless the prototype passes the documented licensing, size, reliability, and performance gates.

## Delivery sequence

1. Align v0.3.0 versions, release notes, and this plan.
2. Add the media-probe port, optional desktop adapter, parser tests, and availability diagnostics.
3. Add a representative probe/thumbnail benchmark corpus and capture evidence.
4. Make and document the FFmpeg packaging decision.
5. Add technical metadata persistence and incremental enrichment if the adapter is approved.
6. Add the shared Explorer/smart-collection duration predicate and controls.
7. Improve duplicate evidence classification and comparison UI.
8. Add the guarded desktop Recycle Bin workflow with complete-hash revalidation.
9. Document update/signing architecture and v1 implications.
10. Complete automated, large-library, destructive-safety, and installer QA.
11. Merge the final release proposal to publish v0.3.0.

## Progress

- Done: v0.2.0 published with live reconciliation, virtualized Explorer rendering, shared media boundaries, and validated Windows installers.
- Done: v0.3.0 release branch created from the published v0.2.0 merge commit.
- Done: v0.3.0 version alignment, draft release notes, and optional native media-probe contract.
- Done: path-validated desktop `ffprobe` invocation, availability reporting, metadata parsing, bounded diagnostics, and an opt-in corpus benchmark test without changing current media behavior.
- Done: shared Explorer and persisted smart-collection duration filtering with library-derived slider bounds, precise numeric inputs, explicit unknown-duration matching, and portable backup support.
- Next: provide an approved LGPL test binary, exercise the probe against a representative corpus, and record the FFmpeg go/no-go evidence.

## Acceptance gates

- Existing web and desktop behavior remains green when no native probe binary is available.
- Native commands reject probe, hash, and cleanup paths outside the selected library.
- Corrupt, unsupported, slow, or metadata-free media produces bounded diagnostics and does not block library use.
- Probe benchmarks include at least MP4 and WebM samples and compare success rate and elapsed time with the current path.
- Explorer and saved collections apply identical inclusive duration bounds, derive the selector scale from current library metadata, and keep unknown-duration behavior visible and tested.
- Probable duplicate evidence is visibly distinct from complete-hash equality.
- No destructive action is offered until complete hashes match and at least one preferred copy will remain.
- Cleanup uses the Windows Recycle Bin and accurately reports partial failure.
- Metadata remains recoverable through the existing portable export before and after cleanup.
- The 5,000-video/300-tag fixture remains interactive during enrichment and duplicate analysis.
- Web production behavior remains green; public deployment is not part of this release.
- NSIS and MSI installers build and pass the release smoke checklist.

## Future release placement

- v0.4.0 is the recommended home for an offline viewing-statistics workspace, after v0.3 stabilizes duration, technical metadata, duplicate evidence, and cleanup semantics.
- Use `Insights` or `Stats` as the user-facing label. The recommended first layout is a `Collections | Insights` tab pair with whole-library/collection scope and Overview, Watch activity, Tags, Collections, and Library composition views.
- Historical charts require timestamped playback events or durable daily aggregates; current last-played and play-count fields are insufficient for accurate trends.
- Detailed candidates and sequencing live in `docs/PRODUCT_ROADMAP.md`.

## Release workflow

Focused implementation branches may target `release/v0.3.0`. The final release proposal targets `master` and uses a merge commit. Merging it changes `release-manifest.json`, which runs the existing publication workflow to create tag `v0.3.0`, validate both applications, build the Windows installers, generate checksums, and publish the GitHub Release only after every gate succeeds.
