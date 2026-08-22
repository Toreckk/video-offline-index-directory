# Release Process

## Branches and pull requests

`master` is the protected, releasable trunk. A release is assembled on `release/vX.Y.Z` with a draft proposal PR targeting `master`. Focused implementation PRs may target the release branch while the proposal is open. The proposal description is the release checklist and must link every included PR.

Implementation PRs are squash-merged into the release branch. The final proposal uses a merge commit so its reviewed implementation commits remain visible on `master`.

## Version policy

VOID follows Semantic Versioning and Conventional Commits.

- `feat` contributes to a minor release.
- `fix` contributes to a patch release.
- `type!` or a `BREAKING CHANGE` footer records an incompatible change.
- During `0.x`, minor releases may include compatibility changes, which must be called out in release notes.
- A released tag is immutable; corrections require a new version.

The root release manifest is the release intent. Package, Cargo, and Tauri versions must match it before publishing.

## Automated publication

The publication workflow runs after `release-manifest.json` changes on `master`. It:

1. Validates the manifest and verifies that its tag does not already exist.
2. Runs all web and desktop quality gates.
3. Builds Windows installers from the merged commit.
4. Generates SHA-256 checksums and signed updater artifacts.
5. Creates an annotated version tag and draft GitHub Release.
6. Uploads artifacts and generated release notes.
7. Publishes the release only when every upload succeeds.

The publish job alone receives `contents: write`. Build and test jobs use read-only repository permissions. Workflow actions are pinned to immutable commit SHAs before v0.1.0 is published.

## Failure and rollback

- Before publication, fix the release branch and rerun its checks.
- If automation fails after merge but before publication, fix forward on a new release proposal or rerun the failed workflow after correcting repository secrets or runner failures.
- Never replace assets belonging to an already published version.
- If a published build is unusable, mark it clearly in its notes and publish a patch release.
- SQLite migrations must be forward-only and transactional. The application retains the previous valid database until a migration commits.

## Windows signing

Tauri updater signatures and Windows Authenticode signing solve different problems. Updater signing protects update integrity and is required before automatic updates are enabled. Authenticode improves Windows publisher trust and SmartScreen behavior. The release workflow supports both through repository environment secrets; an unsigned early build must be identified clearly in its release notes.

