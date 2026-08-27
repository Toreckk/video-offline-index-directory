# V.O.I.D. Desktop v0.3.1 Plan

## Outcome

Ship a compatible polish release that makes smart-collection Boolean structure easier to discover and reorganize, while correcting Library Source wording, improving duration-range resets, and making themed desktop-title-bar restoration reliable.

## Committed scope

### Smart-collection editing

- Separate `Add nested group` from ordinary rule creation with a prominent full-width action and stronger nested-group hierarchy.
- Allow two or more direct rules in one group to be selected and wrapped into a new All/Any nested group without recreating them.
- Allow an individual non-group rule to move to another existing group through an explicit keyboard-accessible control.
- Preserve the existing persisted rule schema and matching semantics.

### Source and duration polish

- Replace blanket read-only wording with source-aware browser, session, and desktop access descriptions.
- Keep desktop file actions described as explicit and confirmed.
- Hide native number steppers on duration fields and add quiet Min/Max resets to measured library bounds without changing direct entry or the dual-handle slider.

### Desktop shell reliability

- Wait for persisted settings to hydrate before changing native Windows decorations.
- Serialize title-bar decoration transitions so the latest preference wins even during rapid changes.

### Release work

- Align package, Cargo, Tauri, manifest, changelog, plan, notes, and manual QA at v0.3.1.
- Build and validate both unsigned Windows installers through the established publication workflow.

## Exclusions

- Nested drag-and-drop and arbitrary reordering are deferred; bulk grouping and explicit movement cover the current restructuring need with lower complexity and better keyboard access.
- No changes to collection matching semantics, metadata migrations, web deployment, automatic updates, signing, or distribution channels.
- The Insights workspace remains planned for v0.4.0.

## Sequence and progress

1. Done: create `release/v0.3.1` from the published v0.3.0 merge commit and align release intent.
2. Done: implement prominent nested-group creation, aligned bulk selection, bulk grouping, and individual rule movement.
3. Done: implement source-aware access wording and duration Min/Max resets.
4. Done: complete focused automated tests, full shared/native validation, and release documentation.
5. In progress: native/themed title-bar overlap is fixed and current-commit NSIS/MSI installers build successfully; final manual QA remains pending.
6. Pending: finalize the proposal, obtain merge approval, and publish v0.3.1.

## Acceptance gates

- Existing collection rule data loads without migration and produces unchanged results.
- Bulk grouping preserves selected rule order, leaves unselected siblings in place, and introduces no duplicates or losses.
- Moving an individual rule changes only its parent group and persists after save/relaunch.
- Duration reset controls use library-derived bounds and remain accessible by keyboard and screen-reader label.
- Browser/session/desktop source wording accurately describes the active capability without implying all desktop operations are read-only.
- The native Windows frame and themed V.O.I.D. title bar never appear together across repeated relaunches or rapid preference changes.
- Shared tests, lint, web/desktop UI builds, Rust gates, version verification, and 5,000-video regressions pass.
- Current-commit NSIS and MSI installers build and pass the standard smoke test.

## Publication behavior

The draft proposal targets `master`. Its merge changes `release-manifest.json` on `master`, which triggers the existing release workflow to rebuild, tag, and publish v0.3.1. Public web deployment remains excluded.

## Validation evidence

- `pnpm verify:version`, `pnpm lint`, `pnpm test`, `pnpm build:web`, and `pnpm build:desktop-ui` pass; 48 test files and 168 tests are green, including hydration and rapid title-bar preference regression coverage.
- Rust formatting, Clippy with warnings denied, and native tests pass; 16 tests pass and the opt-in media corpus benchmark remains intentionally ignored.
- Local browser interaction confirms nested-group hierarchy, aligned bulk selection/grouping, and move controls with no console warnings.
- Current-commit Windows installers build with normal WiX ICE validation:
  - NSIS: 2,981,882 bytes; SHA-256 `c20699275b2f844a96619eef8bd83c3ac76b495e96b40b2a6d28fdc77bf9add5`.
  - MSI: 5,230,592 bytes; SHA-256 `35f774fd62e134536fd1e5a091b7780897eb0b40d62954e661706ab608ee0dde`.
