# Release process

`master` is the releasable trunk. A release is assembled on `release/vX.Y.Z` with a draft proposal PR targeting `master`; focused implementation PRs may target that branch. Squash focused PRs and merge the final proposal with a merge commit. Documentation/process-only work can target master directly when it does not authorize a new release.

Branch protection and environment reviewers are **GitHub settings**, not guarantees established by these YAML files. The maintainer must verify them before relying on an approval gate.

## Routine release: the short path

1. Assemble the release branch and draft PR. The implementing agent maintains versions, changelog, notes, dependency notices and checks; the maintainer chooses scope and any new license/signing policy.
2. Push once the changes are ready. Hosted CI and candidate packaging run automatically. Test the changed flows and both installer formats using the retained artifact. Keep completed evidence when later commits change only documentation or release automation.
3. Finalize `publish: true`, merge the reviewed PR and let the final master build finish. The merge does **not** publish anything.
4. Download/extract that final artifact. Run `pnpm release:inspect <extracted-folder> <full-merge-SHA>` to verify checksums and create a QA record under ignored `artifacts/release-qa/`, including Windows/WebView2 details. Smoke-test install, launch/playback, persistence and close in each format. The agent can record a tester's reported results; it must not invent them.
5. In GitHub Actions, open **Publish release → Run workflow**, select `master`, and copy `build_run_id` and `expected_sha` from the build summary. This is the publication action. The workflow checks the build, CI, artifact, tag and downloads, publishes, and records results automatically. An agent may dispatch it when its connected tooling supports dispatch and the maintainer has authorized publication.

Do the full migration/upgrade matrix once per relevant application/installer change. Documentation, evidence and publisher-only commits do not restart it. A rebuilt final artifact needs the short installed smoke check; add wider tests only when code or installer behavior changed. The short check and publication dispatch are the routine human work; hash collection, environment recording, repeated test commands and post-publication download verification are automated. Repository protection setup is a one-time operations task, not a question to repeat every release.

## Version and history policy

Use Semantic Versioning and Conventional Commits. During 0.x, minor releases can change compatibility if release notes explain it; use patches for compatible fixes. Keep published tags and binaries immutable and fix forward with a higher version.

`release-manifest.json` records release intent. Root/workspace packages, Cargo.toml, the desktop Cargo.lock entry, Tauri and the matching notes must agree. `pnpm verify:version` additionally checks stable channel, exact NSIS/MSI targets, app identifier and legacy installer continuity. `pnpm verify:version --finalized` also requires `publish: true` and a dated changelog section. These checks do not prove manual QA or authorize a merge.

Start implementation by aligning versions and creating `docs/releases/vX.Y.Z.md` with `# VOID vX.Y.Z`. Set the new manifest's `publish` flag to **false** during assembly. Set it to true only in final preparation. The already-published v0.3.2 manifest remains unchanged by the repository assessment; do not toggle it on master just to test automation.

Keep `[Unreleased]` for notable completed changes. At finalization review the full prior-tag diff, move included facts into `## [X.Y.Z] - YYYY-MM-DD`, recreate `[Unreleased]`, and update compare links. Release notes add downloads, supported systems, migration/recovery, signing and known limitations. Plans belong in the roadmap, not the changelog.

## 1. Assemble and validate

1. Inspect branch/worktree, tags, latest release and existing proposal. Preserve unrelated work; do not duplicate a release branch or proposal.
2. Create a temporary release plan from the roadmap with outcome, exclusions, implementation PRs, acceptance gates and owners. Keep the proposal draft while gates remain.
3. Use the pinned package manager and frozen lockfile. Run:

   ```sh
   pnpm install --frozen-lockfile
   pnpm check
   pnpm check:native
   pnpm build:desktop -- --locked
   ```

4. Record the exact candidate SHA and relevant benchmark/manual results. Never commit generated installers or signing material.

## 2. Build a reviewable candidate

Pushing a `release/**` branch runs candidate packaging after CI succeeds, including when the new workflow is not yet on the default branch. Once the workflow exists on the default branch, **Package Windows candidate** can also be run manually against the release branch. The same `.github/workflows/windows-package.yml` is called by publication, avoiding two different packaging recipes.

Candidate packaging uses read-only repository permissions, runs shared/native checks, builds locked NSIS/MSI packages with ordinary WiX validation, and uploads `windows-release-<commit SHA>` for 14 days. It includes both installers, `SHA256SUMS.txt`, `THIRD_PARTY_NOTICES.txt`, `RELEASE_NOTES.md`, and `build-info.json` (version, commit, repository, workflow run/attempt and toolchain versions). Both installers also include the notices file. The build record is traceability, not a cryptographic attestation or reproducibility guarantee.

A manual candidate run never creates a tag or GitHub Release, regardless of the manifest's publish flag. Candidate downloads are Actions artifacts, not public installation recommendations. If an artifact expires, rebuild and re-record its exact hashes/QA evidence. Rebuilding may produce different bytes; never assume byte-for-byte reproducibility.

## 3. QA before merge

Use [MANUAL_QA.md](MANUAL_QA.md). Record:

| Evidence | Required content |
| --- | --- |
| Identity | Commit SHA, workflow run URL, installer filename and SHA-256 |
| Environment | Windows version/build, WebView2, machine, installer format, clean/upgrade path |
| Flows | Install, registered version, launch, scan/play, organization persistence, uninstall |
| Migration/recovery | Supported prior-version data, before/after counts/content, failure recovery |
| Result | Pass/fail/pending, tester/date, linked defects and release decision |

Both NSIS and MSI need real runtime coverage if both are advertised. Never infer upgrade safety from successful compilation. The historical v0.3.2 MSI waiver remains visible; future release-wide claims must be backed by evidence. Data loss, unsafe cleanup, persistent audio and installer continuity failures block publication. A noncritical exception must explicitly state risk, owner and follow-up; do not quietly check an unperformed gate. Keep QA results in the PR or attached record so adding evidence does not itself force a new binary build. Missing historical machine details must stay labeled unavailable; collect them automatically for the final artifact.

Keep the application identifier `com.toreckk.void`, MSI upgrade code and legacy NSIS migration hook stable across brand changes. Same-format upgrades preserve data. Switching formats requires uninstall without deleting app data and then installing the other format.

## 4. Finalize, merge, then approve the actual artifacts

Finalize the changelog/notes, set the new manifest to `publish: true`, run finalized validation, and ensure CI/manual evidence matches the proposal head. Remove draft status only when proposal gates are complete.

**Merge effect:** a manifest change on master starts the read-only build job in **Publish release**. It recreates the installers from the merge SHA and retains them. A merge never starts the write-capable publisher. Only a separate manual **Publish release** workflow dispatch on `master` can run that job; enter the reviewed build run ID and the exact approved merge SHA. Read-only preflight rejects another branch/SHA, a failed or unrelated build, absent successful CI or an expired/missing artifact. The publisher verifies the build run/attempt, provenance, notes and checksums. The `publish` job also references the GitHub `release` environment; required reviewers there add a second approval layer. Keep master at the approved SHA until dispatch; a later dispatch on a different SHA is rejected.

Before dispatching publication, download and smoke-test the actual merge-SHA artifacts and record hashes with `release:inspect`. The release-branch candidate has a different commit and is insufficient evidence for final bytes. Carry forward its full QA matrix when behavior has not changed, and record the final installed smoke separately. If environment reviewers are absent, publication proceeds after the explicit manual dispatch; it cannot run as a side effect of the merge. Required-reviewer settings are recommended additional protection, not an unverifiable prerequisite for using this manual gate.

The publisher verifies provenance fields, notes/notices against the checked-out commit, exactly named NSIS/MSI checksum entries, local hashes, existing release/draft/tag state, uploaded names/sizes, CLI failures, and the published tag target. It downloads the draft assets and hashes them before publication, then independently downloads all five public assets without credentials and hashes them again. Lookup failures other than 404 stop publication. A matching unpublished draft may resume; a published release, wrong-commit tag or unexpected draft assets stop it. Only unpublished draft assets may be replaced during recovery. The workflow does not enable web hosting, signing or updates.

## 5. Post-publication verification and recovery

Check the successful publication summary: release/tag target the intended merge SHA and both installers, checksums, notices and build record passed independent public-download verification. Retain that workflow URL in the release PR. The agent verifies the public release state; maintainers do not need to repeat those automated hash checks by hand.

- Before publication: fix source in a reviewed commit or repair runner/environment issues; rerun validation and regenerate evidence. Do not reuse a draft targeting another commit.
- Failed upload to the same unpublished draft: re-dispatch publication with the same reviewed build run ID and exact SHA after inspecting the draft. A new build would create different bytes and requires renewed artifact evidence.
- Unknown publication outcome: inspect the release before retrying. The script refuses to mutate a published version even if the previous run reported failure.
- Public download verification failed after publication: the release stays public and unchanged. Diagnose availability, download and verify the existing assets; do not re-dispatch to overwrite a published release.
- Published defect: label the release clearly and issue a higher patch release. Never move a tag or replace public binaries.
- Database changes: versioned transactional migrations with a verified recovery path. Do not advise copying a live SQLite database without accounting for WAL/checkpoint consistency.

## Repository operations backlog

Verify these settings separately; this change has not altered them:

- Protect master, require current CI checks/review, disallow force pushes and protect release tags.
- Restrict the `release` environment to master with required reviewer approval and appropriately scoped secrets.
- Enable private vulnerability reporting and repository-enforced release immutability when the repository supports them; rehearse the draft-publication behavior first.
- Add dependency-update automation and distributable attestations/SBOM after tool/provider validation. CI now repeats frontend/Rust advisory checks and declared-license inventory; maintainer review of obligations remains required. Keep permission scopes narrow and actions pinned to reviewed full SHAs.
- Maintain the tested Node/Rust pins and review hosted runner image changes; hosted images still move. Require actual hosted results for each candidate.
- Keep the maintainer-approved MIT project license and third-party notice review current; update GitHub About to the desktop/local product description.

Signing and automatic updates remain separate gated work in [UPDATE_SIGNING_ARCHITECTURE.md](UPDATE_SIGNING_ARCHITECTURE.md). Do not add signing credentials or public update endpoints as a side effect of release-process cleanup.

## Documentation lifecycle

README is the entry point; product scope is current behavior; roadmap is future intent. The assessment and performance contract explain unresolved decisions and how to verify them. Keep ADRs durable and supersede explicitly. Remove completed temporary plans once release notes retain scope and validation evidence; historical reports remain available through their tags. Link release notes to tagged historical files instead of broken working-tree paths. Do not delete evidence merely because a plan is complete.
