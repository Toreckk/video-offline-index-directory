## Release proposal: vX.Y.Z

This proposal assembles the reviewed release work for `vX.Y.Z`. Focused pull requests should target this release branch and be linked below.

### Included work

- [ ] Link focused implementation pull requests or commits here.

### Release gates

- [ ] `release-manifest.json`, package, Cargo, and Tauri versions match.
- [ ] Shared tests and ESLint pass.
- [ ] Rust formatting, Clippy, and tests pass.
- [ ] Web production build passes.
- [ ] Windows NSIS and MSI installers build successfully.
- [ ] Release notes describe features, supported systems, safety limits, and signing status.
- [ ] Manual smoke test is complete.
- [ ] Generated installers are absent from the Git diff.

### Merge effect

Merging this proposal into `master` changes `release-manifest.json` and starts the publication workflow. That workflow creates the version tag and publishes the Windows installers, checksums, and release notes only after rebuilding every artifact successfully.
