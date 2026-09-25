# Security and sensitive bug reports

For suspected data exposure, arbitrary file access, unsafe cleanup or update/signature issues, avoid public reproductions containing private paths, videos, credentials or exploit details.

If GitHub offers **Security → Report a vulnerability** for this repository, use that private channel. Its availability is controlled by the maintainer; this document does not enable it. Otherwise open a minimal issue requesting a private reporting channel, with no sensitive details, and wait for the maintainer to arrange one. No private email address or response-time guarantee has been established.

Useful private report details: affected version/edition, OS/WebView2, expected and actual behavior, minimal synthetic reproduction, impact, and any known mitigation. Keep original files backed up before reproducing a cleanup or migration issue.

VOID is pre-1.0. Fixes target the latest release; older versions do not have a promised backport window. Current installers are unsigned and updates are manual. Checksums detect changed downloads but do not establish publisher identity. The [signing/update design](docs/UPDATE_SIGNING_ARCHITECTURE.md) defines the future trust model.
