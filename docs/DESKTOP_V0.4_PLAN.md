# v0.4.0 release assembly

Status: reliability implementation assembled on `release/v0.4.0`; maintainer reported tested flows passing except tag-popup input focus on 2026-09-07. On 2026-09-23, they also reported desktop Close stalling or failing. Both regressions are corrected locally and await maintainer retest. Hosted candidate packaging and remaining release gates are still open. Publication disabled.

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
- [x] Dependency upgrades, advisory checks, declared-license inventory, pinned toolchains and adapter contract tests. [Dependency review](DEPENDENCY_REVIEW.md) records zero reported vulnerabilities, remaining upstream warnings and the unresolved project-license decision.
- [x] Full local automated checks and both optimized installer builds passed. See the evidence table below. WiX validation remained enabled.
- [x] Maintainer reports the other tested application changes working and QA passed (2026-09-07); the reported Manage video tags input regression is corrected with focus/typing and Escape regression coverage.
- [ ] Maintainer retest of both tag inputs in normal/fullscreen player and desktop Close during idle/playback/pending save. Installed WebView2 stress evidence and installer-specific records remain separate gates; the general QA report does not identify installer format or environment versions.
- [ ] Actual clean install, same-format v0.3.2 upgrade, uninstall and migration/recovery QA for **both** NSIS and MSI.
- [ ] Exact-SHA hosted checks/candidate artifacts, repository/environment protections and project-license/notice approval.

### Evidence and its limits

| Check | Local result / remaining evidence |
| --- | --- |
| Shared checks | Latest `pnpm check`: 56 files / 205 tests, 10 release-policy tests, local documentation/version validation, ESLint and both production UI builds passed. |
| Release policy | 10 Node policy tests and 11 offline PowerShell publisher tests passed. |
| Native checks | Locked Clippy with warnings denied, formatting, and 24 tests passed; 2 opt-in tests executed separately as below. |
| Real-media probe | Two generated MP4/WebM files probed successfully using the checksum-verified optional helper. This tiny corpus is correctness evidence, not a large-library performance result. |
| Browser runtime | Isolated Edge 152.0.4191.66 profile: fresh hydration, real folder files, thumbnails, MP4/WebM playback, navigation and close passed without JavaScript errors. Browser smoke does not prove installed WebView2/audio behavior. |
| Filesystem recovery | One newly created disposable copy was recycled and restored with bytes verified; keeper/lock fixtures passed. No personal media was used. |
| Workflow syntax / fixtures | actionlint passed; fixture regeneration script produced both formats in an ignored output directory. |
| Installer builds | Locked optimized NSIS and MSI passed with ordinary WiX validation; local hashes below. |
| Tag-input follow-up | Reproduced focus loss in a failing test, then verified both inputs, tag creation and popup-first Escape in the test and isolated Edge normal/fullscreen playback. Maintainer retest pending. |
| Close follow-up | Verified immediate close when no save remains, successful pending-save close, visible failure/export/explicit exit and slow-save exit in `DesktopClose.test.tsx`. The close dialog keeps focus above a later recovery panel. The post-save path uses the window's direct destroy command; the required Tauri capability is declared. Installed desktop retest pending. |
| Installed runtime/hosted | Application QA reported passing except the focus issue above. Baseline hosted shared/native jobs passed; candidate packaging failed when the output-limit fixture timed out. The fixture now writes raw bytes with a separate test allowance; production deadlines/caps are unchanged. A new hosted run must pass. Installer-specific evidence remains open; follow [V0.4_TESTING.md](V0.4_TESTING.md). |

Latest local artifacts built from the corrected source before its follow-up commit (record the exact hosted artifact SHA separately):

| File | Bytes | SHA-256 |
| --- | --- | --- |
| `VOID_0.4.0_x64-setup.exe` | 3,052,709 | `f7e84576e581c463f010390345c6a68f3617e912a6b99758498e3b6f9718b752` |
| `VOID_0.4.0_x64_en-US.msi` | 5,324,800 | `555ffc5a8fa59afe259879e1bb8ac5a7b3ac5468db4005595c7c7010a0cbc7cf` |

These hashes identify local test binaries, not future hosted/merge-SHA bytes. Record new hashes whenever rebuilding; do not use this table to approve public artifacts.

Local diagnostics and generated tools live under ignored `artifacts/`; they are not release assets. Committed fixtures and tests make the checks repeatable. The draft proposal carries exact commit and hosted artifact evidence after pushing.

The implementing agent records local automated evidence; the maintainer owns
license and publication decisions. Runtime gates remain pending until performed;
unit mocks or installer builds cannot close them. Each completed item must link
tests or evidence here before release finalization.

## Boundaries

Insights, the complete visual redesign, broad performance work, new formats,
signing and automatic updates remain later milestones. Preserve source media,
legacy user data, application ID and installer upgrade identity. Final notes and
changelog must describe completed behavior only. The release proposal remains
draft and the manifest remains `publish: false` while any release gate is open.
