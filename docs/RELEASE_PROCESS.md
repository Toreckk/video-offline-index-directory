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

## Changelog and release notes

`CHANGELOG.md` follows Keep a Changelog 2.0 and is the concise, user-relevant history across releases. Add notable completed work to `[Unreleased]` as it lands; do not list ideas or promises as shipped changes.

At final release preparation:

1. Review the complete release diff and rewrite raw implementation details as user-observable changes.
2. Move the relevant `[Unreleased]` entries into `## [X.Y.Z] - YYYY-MM-DD` and recreate an empty `[Unreleased]` section.
3. Maintain compare links for `[Unreleased]` and the new version.
4. Derive `docs/releases/vX.Y.Z.md` from the same facts, adding narrative highlights, downloads, supported systems, migrations, safety limits, and signing status.
5. Verify the changelog, release notes, proposal checklist, manifest, and GitHub Release describe the same scope.

Use the standard Added, Changed, Deprecated, Removed, Fixed, and Security groups only when they contain notable entries. A released changelog section and tag are immutable; corrections ship in a new version.

## Automated publication

The publication workflow runs after `release-manifest.json` changes on `master`. It:

1. Validates the manifest and verifies that its tag does not already exist.
2. Runs all web and desktop quality gates.
3. Builds Windows installers from the merged commit.
4. Generates SHA-256 checksums.
5. Creates a version tag and draft GitHub Release.
6. Uploads artifacts and generated release notes.
7. Publishes the release only when every upload succeeds.

The publish job alone receives `contents: write`. Build and test jobs use read-only repository permissions. Workflow actions are pinned to immutable commit SHAs before v0.1.0 is published.

## Failure and rollback

- Before publication, fix the release branch and rerun its checks.
- If automation fails after merge but before publication, fix forward on a new release proposal or rerun the failed workflow after correcting repository secrets or runner failures.
- Never replace assets belonging to an already published version.
- If a published build is unusable, mark it clearly in its notes and publish a patch release.
- SQLite migrations must be forward-only and transactional. The application retains the previous valid database until a migration commits.

## Windows signing and updates

Tauri updater signatures and Windows Authenticode signing solve different problems. Updater signing protects update integrity and is required before automatic updates are enabled. Authenticode improves Windows publisher trust and SmartScreen behavior. Both are deferred for v0.1.0; its unsigned status is called out in release notes. Automatic updates must not be enabled until updater signing and key-management procedures are in place.
