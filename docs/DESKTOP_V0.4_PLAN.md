# v0.4.0 release assembly

Status (2026-09-25): reliability implementation and candidate QA are complete on `release/v0.4.0`. The maintainer reported the full NSIS/MSI matrix and tag-input/Close regressions passing on `ef5d818`, then the MIT-bearing installer smoke passing in both formats on `88cfddb`. MIT is selected; distributable third-party notices and automated release verification are implemented. The manifest is finalized with `publish: true`; merge only builds artifacts. The release PR tracks current CI, followed by one final master-artifact smoke pass and a separate publication dispatch.

Includes the repository assessment, consolidated documentation, roadmap, README,
contributor guidance and release-tooling improvements already prepared, together
with the reliability milestone in [the roadmap](PRODUCT_ROADMAP.md).

## Implementation and evidence

- [x] Player lifecycle, stale callback protection, close-time progress flush and actionable media errors. Evidence: `PlayerVideo.test.tsx`, `PlayerModal.test.tsx` and isolated browser playback of both synthetic formats.
- [x] Complete-scan contract, unavailable records, conservative file-identity rename handling and versioned enrichment. Evidence: discovery, reconciliation, catalog and native scan tests, including 5,000 entries.
- [x] Native transactional user-data port, unified hydration and visible recovery. Evidence: `userData.test.ts`, browser/desktop adapter contracts and Rust `user_data` rollback/revision fixtures. Architecture: [ADR 0002](adr/0002-durable-user-data.md).
- [x] Current-origin migration preview, retained snapshot, idempotent receipt and failure fixtures. Migrated native roots without a trusted catalog can be reauthorized using the same full path; cancellation and mismatch are visible. Evidence: `libraryStore.test.ts`.
- [x] Scoped, bounded imports with preview and durable atomic completion; concurrent edits fail visibly and remain exportable. Evidence: transfer and user-data tests. Supported recovery: [DATA_RECOVERY.md](DATA_RECOVERY.md).
- [x] Native probe deadlines, output/cancellation bounds, local-file/container restrictions and independent scheduling. Evidence: native helper lifecycle tests and an actual ffprobe run over [the synthetic MP4/WebM corpus](../fixtures/media/README.md).
- [x] Critical dialog focus/onboarding fixes and bounded missing/corrupt-thumbnail regeneration. Evidence: focus/thumbnail tests and fresh-profile browser smoke.
- [x] Cleanup locks verified file handles, journals recoverable staging and uses Recycle Bin operations. Metadata flush precedes filesystem mutation. Evidence: native lock/race fixtures and a real disposable-file recycle/restore round trip in the Windows user session.
- [x] Dependency upgrades, advisory checks, declared-license inventory, pinned toolchains and adapter contract tests. [Dependency review](DEPENDENCY_REVIEW.md) records zero reported vulnerabilities and remaining upstream warnings. The maintainer selected MIT for VOID source.
- [x] Full local automated checks and both optimized installer builds passed. See the evidence table below. WiX validation remained enabled.
- [x] Maintainer reports the other tested application changes working and QA passed (2026-09-07); the reported Manage video tags input regression is corrected with focus/typing and Escape regression coverage.
- [x] Maintainer reports both tag inputs in normal/fullscreen player and desktop Close during idle/playback/pending save passed on `ef5d818` (2026-09-23).
- [x] Maintainer reports clean install, same-format v0.3.2 upgrade, migration, playback and uninstall passed for **both** NSIS and MSI on `ef5d818` (2026-09-23).
- [x] Maintainer reports the MIT notice, launch/playback and saved tags after restart passed for both `88cfddb` installers (2026-09-25). The agent downloaded the retained artifact, verified its archive digest and both installer hashes (below). Historical tester-machine versions were not supplied; do not infer them from the agent's machine.
- [x] Hosted shared/native checks and NSIS/MSI candidate packaging passed on tested candidate `ef5d8184ff390b7167e70b7316b55451fdda6208`; rerun on the final proposal head after any further changes.
- [x] Third-party notice/source review completed with versioned upstream texts/source links and CI drift checks; notices are included in both installer configurations and release assets. GitHub settings remain an operations follow-up; the explicit manual dispatch prevents merge-triggered publication without depending on reviewers.
- [ ] Current proposal CI and packaging pass after the final tooling/notices changes; see the PR for exact run/SHA evidence.
- [ ] Actual merge-SHA installer smoke and publication dispatch. Use `pnpm release:inspect` for hashes/environment details; carry forward the completed full QA matrix.

### Evidence and its limits

| Check | Local result / remaining evidence |
| --- | --- |
| Shared checks | Latest `pnpm check`: 56 files / 205 tests, 10 release-policy tests, local documentation/version validation, ESLint and both production UI builds passed. |
| Release policy | 12 Node policy/notice tests and 35 offline PowerShell preflight/publisher scenarios passed on 2026-09-25. Workflow syntax passed actionlint. |
| Native checks | Locked Clippy with warnings denied, formatting, and 24 tests passed; 2 opt-in tests executed separately as below. |
| Real-media probe | Two generated MP4/WebM files probed successfully using the checksum-verified optional helper. This tiny corpus is correctness evidence, not a large-library performance result. |
| Browser runtime | Isolated Edge 152.0.4191.66 profile: fresh hydration, real folder files, thumbnails, MP4/WebM playback, navigation and close passed without JavaScript errors. Browser smoke does not prove installed WebView2/audio behavior. |
| Filesystem recovery | One newly created disposable copy was recycled and restored with bytes verified; keeper/lock fixtures passed. No personal media was used. |
| Workflow syntax / fixtures | actionlint passed; fixture regeneration script produced both formats in an ignored output directory. |
| Installer builds | Locked optimized NSIS and MSI passed with ordinary WiX validation; local hashes below. |
| License-bearing finalization check | [Hosted run 35897949107](https://github.com/Toreckk/video-offline-index-directory/actions/runs/35897949107) passed shared/native CI and both installer builds with ordinary WiX validation at `88cfddb`. The maintainer confirmed both formats' focused installed smoke passed. On 2026-09-25, local `pnpm check` (56 files / 205 tests plus 12 Node policy tests) and `pnpm check:native` (24 native tests, 35 PowerShell cases and 295 notice entries) passed with the new notices resource configuration. |
| Tag-input follow-up | Reproduced focus loss in a failing test, then verified both inputs, tag creation and popup-first Escape in the test and isolated Edge normal/fullscreen playback. Maintainer reports normal/fullscreen retest passed on `ef5d818`. |
| Close follow-up | Verified immediate close when no save remains, successful pending-save close, visible failure/export/explicit exit and slow-save exit in `DesktopClose.test.tsx`. The close dialog keeps focus above a later recovery panel. The post-save path uses the window's direct destroy command; the required Tauri capability is declared. Maintainer reports idle and pending-save close passed on `ef5d818`. |
| Installed runtime/hosted | [Hosted candidate run 35884430571](https://github.com/Toreckk/video-offline-index-directory/actions/runs/35884430571) passed web/shared, 24 native tests (including the formerly failing output-limit test), both synthetic-file ffprobe checks, and Windows NSIS/MSI packaging at `ef5d8184ff390b7167e70b7316b55451fdda6208`. The obsolete test-helper URL that caused an intermediate 404 was replaced by a pinned, SHA-256-verified release asset. Artifact `windows-release-ef5d8184ff390b7167e70b7316b55451fdda6208` (ID `10764040378`, archive SHA-256 `aeb914a55a3a7771e5a438d3ef857d09fee0c6945391c973676062838f41dfe0`) contains installers, `SHA256SUMS.txt`, notes and build provenance. Maintainer reports both formats and focused tag/close flows passed on this SHA. Recheck latest-head CI and final installer bytes after release metadata changes; follow [V0.4_TESTING.md](V0.4_TESTING.md). |

Verified hosted `88cfddb02ad73a5b430b6532723762e6261c4616` installers from run `35897949107`, artifact `10768134772`. Archive SHA-256: `74c6cbe2d0126f30d01c7e2605ad4a562eb6becc83b3345b445e5168eab3d71a`. Both installer hashes were independently checked against the extracted manifest on 2026-09-25:

| File | SHA-256 |
| --- | --- |
| `VOID_0.4.0_x64-setup.exe` | `17de482a43116c7d924f599d45fbca7953777f3ad28cc649b9a477a020163981` |
| `VOID_0.4.0_x64_en-US.msi` | `800d7b8bf087fab81f1832d8b32e8ff8da6b7524a821060796075b668182e1b3` |

Historical local artifacts built from the earlier corrected source:

| File | Bytes | SHA-256 |
| --- | --- | --- |
| `VOID_0.4.0_x64-setup.exe` | 3,052,709 | `f7e84576e581c463f010390345c6a68f3617e912a6b99758498e3b6f9718b752` |
| `VOID_0.4.0_x64_en-US.msi` | 5,324,800 | `555ffc5a8fa59afe259879e1bb8ac5a7b3ac5468db4005595c7c7010a0cbc7cf` |

These hashes identify local test binaries, not future hosted/merge-SHA bytes. Record new hashes whenever rebuilding; do not use this table to approve public artifacts.

Local diagnostics and generated tools live under ignored `artifacts/`; they are not release assets. Committed fixtures and tests make the checks repeatable. The draft proposal carries exact commit and hosted artifact evidence after pushing.

The implementing agent records automated evidence and dependency-notice review; the maintainer owns
project-license choices and publication authorization. Remaining runtime gates stay open until performed;
unit mocks or installer builds cannot close them. Each completed item must link
tests or evidence here before release finalization.

## Boundaries

Insights, the complete visual redesign, broad performance work, new formats,
signing and automatic updates remain later milestones. Preserve source media,
legacy user data, application ID and installer upgrade identity. Final notes and
changelog must describe completed behavior only. The finalized proposal can merge after pre-merge gates pass;
publication remains a separate explicit dispatch after final-artifact smoke QA.
