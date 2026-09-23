# v0.4 dependency review

Review date: 2026-09-06; project-license decision updated 2026-09-23. Results are dated evidence, not a guarantee that no future advisories exist. The maintainer selected MIT for VOID's own source; third-party terms remain separate.

## Advisories and toolchains

- JavaScript: upgraded compatible direct/transitive versions and lockfile. The baseline had 18 development-tool findings (10 high, 7 moderate, 1 low); the refreshed audit reported zero. Vite is 8.2.2 and Vitest 4.1.11. `@testing-library/jest-dom` stays on the 6.9 line after the registry marked 6.10.0 as an incorrect minor release. CI blocks high/critical pnpm findings.
- Rust: cargo-audit 0.22.2 found old `time` and `quick-xml` vulnerabilities. Rust 1.98 permits upgrading `time` to 0.3.55 and `plist`/`quick-xml` to 1.10.0/0.41.0. A refreshed RustSec audit reported zero vulnerabilities. CI repeats the audit without suppressing vulnerabilities.
- Local and CI Node use 24.11.1 from `.node-version`; pnpm is 11.19.0. Cargo's minimum Rust version is 1.98 and CI installs 1.98.0. Frozen/locked dependency installation remains required. Hosted CI must still prove runner parity for the proposal SHA.

### Remaining upstream Rust warnings

These remain visible; they are not resolved vulnerabilities. Owner: release maintainer. Reassess at every dependency update and no later than the v0.5 release review (or before adding Linux support).

| Warnings | Dependency/target assessment | Follow-up |
| --- | --- | --- |
| RUSTSEC-2024-0411 through -0420 | Unmaintained GTK/ATK/GDK packages in Tauri's cross-platform lockfile. The resolved Windows graph does not include these GTK packages. | Track Tauri's GTK transition; adding Linux requires a new assessment. |
| RUSTSEC-2024-0370 | `proc-macro-error` 1.0.4 maintenance warning in the cross-platform GTK macro chain. | Recheck reverse graph after upgrades. |
| RUSTSEC-2024-0429 | `glib` 0.18.5 unsound iterator warning. `cargo tree --target x86_64-pc-windows-msvc -i glib` has no resolved Windows path. | Do not treat this as acceptable Linux support evidence. |
| RUSTSEC-2025-0075, -0080, -0081, -0098, -0100 | Five unmaintained `unic-*` crates remain in Windows build/runtime dependencies through `urlpattern` → `tauri-utils`. No patched compatible replacement was available in the resolved update. | Track upstream replacement and assess any new vulnerability immediately; review again before v0.5. |

Raw local before/after audits are under ignored `artifacts/audit`. Run `pnpm audit --json` and `cargo audit --file apps/desktop/src-tauri/Cargo.lock` to refresh them. Warning acceptance is scoped to this candidate's Windows target, not a permanent audit allowlist.

## License inventory

`pnpm inventory:dependencies` writes `artifacts/audit/dependency-inventory.json`. It reads package manifests and the resolved Windows Cargo graph, and fails on external packages with no declared license metadata. After a clean frozen install, the refreshed inventory contained 266 installed JavaScript package versions and 285 Windows Rust packages; the workspace crate is declared MIT. Installed JavaScript directories can contain older versions left by local updates; clean installation avoids that overcount. The last local pnpm and Rust audits reported zero vulnerabilities; hosted CI repeats them for each candidate.

Review found common MIT/Apache/ISC/BSD/Unicode/Zlib/BlueOak licenses and specific obligations worth retaining in release review:

- `caniuse-lite` declares CC-BY-4.0 for development compatibility data.
- `lightningcss` declares MPL-2.0 for the build tool; Rust `cssparser`, `cssparser-macros`, `dtoa-short`, `option-ext` and `selectors` also declare MPL-2.0. Preserve notices and applicable source-availability obligations when distributing executable code; no modifications to those dependencies are included here.
- The locally used FFmpeg/Gyan helper is GPL-licensed development tooling. Hosted CI uses a pinned LGPL shared BtbN build. Neither helper is **bundled** into VOID or candidate release assets; only locally generated test media is committed.

Declared-license inventory is not legal approval or a completed distributable SBOM. The MIT selection covers VOID source, not third-party code; the maintainer still needs to approve applicable notices/source availability for distribution. v0.10 adds distributable SBOM/provenance; foundational review remains a v0.4 release gate.
