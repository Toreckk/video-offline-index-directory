# V.O.I.D. Desktop v0.3.1 Plan

## Outcome

Ship a compatible polish release that makes smart-collection Boolean structure easier to discover and reorganize, while correcting Library Source wording and improving duration-range resets.

## Committed scope

### Smart-collection editing

- Separate `Add nested group` from ordinary rule creation with a prominent full-width action and stronger nested-group hierarchy.
- Show a live human-readable expression for the current rules.
- Allow two or more direct rules in one group to be selected and wrapped into a new All/Any nested group without recreating them.
- Allow an individual non-group rule to move to another existing group through an explicit keyboard-accessible control.
- Preserve the existing persisted rule schema and matching semantics.

### Source and duration polish

- Replace blanket read-only wording with source-aware browser, session, and desktop access descriptions.
- Keep desktop file actions described as explicit and confirmed.
- Hide native number steppers on duration fields and add quiet Min/Max resets to measured library bounds without changing direct entry or the dual-handle slider.

### Release work

- Align package, Cargo, Tauri, manifest, changelog, plan, notes, and manual QA at v0.3.1.
- Build and validate both unsigned Windows installers through the established publication workflow.

## Exclusions

- Nested drag-and-drop and arbitrary reordering are deferred; bulk grouping and explicit movement cover the current restructuring need with lower complexity and better keyboard access.
- No changes to collection matching semantics, metadata migrations, web deployment, automatic updates, signing, or distribution channels.
- The Insights workspace remains planned for v0.4.0.

## Sequence and progress

1. Done: create `release/v0.3.1` from the published v0.3.0 merge commit and align release intent.
2. Done: implement prominent nested-group creation, logic preview, bulk grouping, and individual rule movement.
3. Done: implement source-aware access wording and duration Min/Max resets.
4. Done: complete focused automated tests, full shared/native validation, and release documentation.
5. In progress: current-commit NSIS/MSI installers build successfully; manual QA remains pending.
6. Pending: finalize the proposal, obtain merge approval, and publish v0.3.1.

## Acceptance gates

- Existing collection rule data loads without migration and produces unchanged results.
- Bulk grouping preserves selected rule order, leaves unselected siblings in place, and introduces no duplicates or losses.
- Moving an individual rule changes only its parent group and persists after save/relaunch.
- Logic previews reflect tag comparisons, group All/Any operators, group exclusion, watch state, and duration rules.
- Duration reset controls use library-derived bounds and remain accessible by keyboard and screen-reader label.
- Browser/session/desktop source wording accurately describes the active capability without implying all desktop operations are read-only.
- Shared tests, lint, web/desktop UI builds, Rust gates, version verification, and 5,000-video regressions pass.
- Current-commit NSIS and MSI installers build and pass the standard smoke test.

## Publication behavior

The draft proposal targets `master`. Its merge changes `release-manifest.json` on `master`, which triggers the existing release workflow to rebuild, tag, and publish v0.3.1. Public web deployment remains excluded.

## Validation evidence

- `pnpm verify:version`, `pnpm lint`, `pnpm test`, `pnpm build:web`, and `pnpm build:desktop-ui` pass; 47 test files and 166 tests are green.
- Rust formatting, Clippy with warnings denied, and native tests pass; 16 tests pass and the opt-in media corpus benchmark remains intentionally ignored.
- Local browser interaction confirms nested-group hierarchy, bulk selection/grouping, move controls, and logic preview with no console warnings.
- Current-commit Windows installers build with normal WiX ICE validation:
  - NSIS: 2,985,118 bytes; SHA-256 `da73188a43d7c9e57e8e201f46e119fe57b37b5e6d406d096bc07522525f13ce`.
  - MSI: 5,230,592 bytes; SHA-256 `fdd463c0ad5803b8d9b104141a136412dea40984e6ad0d3eb97cbe520db018d3`.
