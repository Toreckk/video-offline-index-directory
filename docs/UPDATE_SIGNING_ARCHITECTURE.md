# Windows Signing and Update Trust Architecture

## Current v0.3.2 position

VOID v0.3.2 produces unsigned Windows x86-64 NSIS and MSI installers. It does not include an automatic updater. SHA-256 checksums published with each GitHub Release provide download-integrity evidence, but they are not publisher identity and do not suppress Windows SmartScreen warnings.

This is an explicit release limitation, not an implicit trust claim. The current publication workflow builds installers from the merged release commit and publishes only after tests, lint, Rust checks, and both installer builds succeed.

## Two independent signatures

Windows Authenticode and Tauri updater signatures solve different problems:

- **Authenticode** signs executables and installers with a certificate tied to a publisher. Tauri's [Windows signing guidance](https://v2.tauri.app/distribute/sign/windows/) describes it as the mechanism that establishes publisher identity and improves the Windows/SmartScreen experience.
- **Tauri updater signing** proves that an update artifact was authorized by the app publisher. Tauri's [updater documentation](https://v2.tauri.app/plugin/updater/) requires these signatures and does not permit disabling their verification.

Enabling one does not replace the other. VOID should not advertise trusted automatic updates until both the updater key lifecycle and the Windows signing path are operational.

## Manual installer continuity

- Same-format updates are supported: NSIS replaces the earlier NSIS installation, and MSI replaces the earlier MSI installation.
- The MSI package pins the upgrade code first published under the legacy dotted product name. Product display-name changes must never regenerate this identity.
- The NSIS package has a one-time pre-install migration for the legacy uninstall registration. It invokes the prior uninstaller passively without its delete-app-data option, removes the legacy shortcuts, and stops the new install if removal fails.
- The application identifier and local data locations remain stable, so a successful same-format replacement retains settings, library metadata, annotations, collections, playback state, and cached thumbnails.
- NSIS and MSI are separate Windows installer technologies. Switching formats requires uninstalling the current package without choosing deletion of app data, then installing the other format; it is not an in-place update path.
- Version verification treats the MSI upgrade code and NSIS migration hook as release invariants so later product-copy edits cannot silently break replacement behavior.

## Proposed stable-channel design

1. Keep `master` as the releasable trunk and GitHub Releases as the immutable artifact origin.
2. Build signed NSIS/MSI artifacts only from the protected `release` GitHub environment.
3. Generate Tauri updater artifacts and `.sig` files during the same build; never sign a locally supplied binary in CI.
4. Publish a static HTTPS update manifest for `windows-x86_64` containing version, notes, artifact URL, and the exact updater signature.
5. Embed only the updater public key in the application. Store the private key outside the repository.
6. Initially expose a manual “Check for updates” action. Add background notification only after two successful signed releases and a recovery drill.
7. Keep stable as the only production channel until rollback and key-rotation procedures are tested. Pre-release testing can use a separately keyed channel so a test key cannot authorize stable updates.

## Key custody

- Prefer a non-exportable certificate held by a managed signing service or hardware-backed provider for Authenticode. CI receives short-lived authorization, not a reusable certificate file where the provider supports it.
- Generate the Tauri updater key offline. Keep the encrypted private key in a restricted release secret or external secret manager, with an offline encrypted backup held separately.
- Limit secret access to the GitHub `release` environment, require approval, and prevent pull-request jobs from reading signing credentials.
- Treat logs, build artifacts, caches, and temporary files as untrusted. Signing material must never be printed, uploaded as a workflow artifact, or committed.
- Record key identifiers, creation/expiry dates, recovery contacts, and every production signing event.

Loss of the updater private key prevents existing installations from accepting newly signed updates under the embedded public key. Backup and restore drills are therefore release prerequisites, not optional operations.

## Rollback and failure behavior

- Before publication, correct the release branch and rebuild from source.
- After publication, never replace an existing version's assets. Fix forward with a higher patch version.
- The updater must reject an invalid signature, malformed manifest, downgrade, wrong platform, or non-HTTPS production endpoint and leave the installed application untouched.
- Keep the previous installer downloadable so users can recover manually. Automated downgrade is not part of the first updater release.
- A bad but correctly signed release is withdrawn from the update manifest and followed by a higher patch version; the immutable GitHub Release receives a clear warning rather than silently replaced binaries.

## Compromised-key response

1. Disable the affected release workflow/environment and remove update-manifest access immediately.
2. Determine whether the Authenticode certificate, updater key, or both are affected.
3. Revoke the Authenticode certificate through its issuer and publish a security notice.
4. Stop automatic update checks if the updater private key may be compromised. Because installed apps trust the embedded public key, a normal remote key rotation cannot safely repair that trust root by itself.
5. Publish a manually installed, newly Authenticode-signed recovery release with a replacement updater public key and explicit migration instructions.
6. Preserve logs and artifacts for incident review; rotate all related CI credentials before restoring publication.

## Readiness gates for automatic updates

- Authenticode provider and certificate ownership approved.
- Updater private-key backup and restore tested by two maintainers or two independently controlled recovery steps.
- Release environment protection and least-privilege secret access verified.
- Signed NSIS and MSI install/upgrade/uninstall tested on clean Windows 10 and Windows 11 x86-64 accounts.
- Invalid signature, tampered manifest, offline endpoint, interrupted download, and bad-release withdrawal tested.
- Static update manifest generation is reproducible and tied to the same immutable release assets and checksums.
- Signing status and recovery limitations are documented in release notes.

Until every gate is satisfied, VOID remains manual-download only and clearly labels its installers unsigned.
