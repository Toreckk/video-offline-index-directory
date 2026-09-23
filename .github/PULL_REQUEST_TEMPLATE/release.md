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
- [ ] The project LICENSE and applicable third-party notices/redistribution obligations are reviewed.
- [ ] `CHANGELOG.md` has accurate user-relevant entries, version/date headings, and compare links.
- [ ] Manual smoke test is complete.
- [ ] Candidate SHA, Actions artifact URL, installer hashes, tester and Windows/WebView2 versions are recorded.
- [ ] Both NSIS and MSI install/upgrade/uninstall results are explicit; migration and recovery evidence matches scope.
- [ ] `release` environment reviewer and branch restrictions have been verified in GitHub settings.
- [ ] Generated installers are absent from the Git diff.

### Merge effect

During assembly, `publish: false` prevents publication. Finalization sets it to true after the gates above. Merging that finalized proposal into `master` changes `release-manifest.json` and starts read-only validation and packaging at the merge SHA. The separate publisher uses the `release` environment; configured reviewers must inspect/smoke-test the merge-SHA artifacts before approving publication. Without environment protection, successful packaging can proceed directly to publication. Publication creates the tag/release with installers, checksums and build provenance only after verification. It does not enable signing, auto-updates or web hosting.

### Final artifact approval (after merge, before publication)

- [ ] Merge SHA, retained artifact URL and hashes recorded.
- [ ] Actual merge-SHA installers smoke-tested; candidate-branch evidence is not substituted for final bytes.
- [ ] Published asset download/hash verification owner assigned.
