# Archival Metadata and Library Portability Strategy

Status: Proposed architecture; route-side writes are intentionally not part of the current implementation.

## Problem

Browser storage is a good local working database, but it is not an archival preservation format. A browser profile can be cleared, corrupted, replaced, or separated from the media folder. Archivists may invest hundreds of hours in tags, collections, playback state, ratings, and corrected metadata, so the media route needs an optional durable companion representation.

The solution must preserve VOID's offline model and must not silently grant files from a selected route control over global application behavior.

## Recommendation

Keep IndexedDB as the fast working database and add an opt-in, versioned library sidecar as the durable source of portability.

Suggested layout:

```text
Library root/
  .void/
    library.json
    library.backup.json
```

The sidecar should contain only library-scoped data:

- Schema version and application version.
- Durable `libraryId` and a human-readable root label.
- Tags, tag links, favorites, and media assignments.
- Smart collections and saved filters.
- Playback state and future ratings if the user elects to include them.
- Media identity records based on relative paths plus future content fingerprints.
- Revision, exported timestamp, and integrity checksum.

Global interface settings such as tile density, motion preferences, and autoplay should remain browser-scoped by default. Importing them from an arbitrary media folder would be surprising and could make switching libraries mutate the whole application.

## Loading behavior

Do not silently replace browser data when a sidecar is detected.

1. Reconnect the route and identify the library.
2. Detect a supported sidecar without changing state.
3. Compare its `libraryId`, revision, and modification time with the local working copy.
4. If the sidecar is newer or conflicts, show a concise preview: use route copy, keep browser copy, or merge.
5. Validate the complete document before applying any mutation.
6. Preserve the previous valid snapshot until the new write closes successfully.

Automatic loading is safe only when the IDs match, the sidecar revision is strictly newer, validation succeeds, and the user has previously enabled automatic route synchronization for that library.

## Write model

Route writes require an explicit per-library setting and a separate read/write permission request. They must never happen as a side effect of ordinary scanning.

Use debounced snapshots rather than writing after every tag click. A manual `Save metadata to library` action and a visible dirty/saved status should be available. Before replacing `library.json`, retain the last valid document as `library.backup.json`. Failed or partial writes must leave the browser working copy untouched.

For very large libraries, a later format may split the manifest, tag catalog, and media records. The first implementation should remain one documented JSON snapshot because it is inspectable, portable, and easy to validate.

## Cross-browser limitations

Chromium's File System Access API can request write permission and create writable file handles. The current VOID picker deliberately requests read access, and media sources retain file handles rather than writable parent-directory capabilities. Both boundaries must change before route synchronization is safe.

Firefox directory uploads expose session `File` objects and cannot write a metadata file back into the selected folder. Firefox should therefore support the same schema through explicit export/download and import/reconnect. The UI must describe this difference without making annotations behave differently in memory.

## Conflict and identity policy

- Never use the root folder name as identity; retain the durable `libraryId`.
- Add a lightweight content fingerprint before promising that metadata survives file moves or renames.
- Merge tags by stable ID first, then normalized name with an explicit conflict report.
- Merge assignments additively unless the user selects a destructive replacement.
- Store tag implications as an acyclic graph and validate it on import.
- Keep schema migrations pure, versioned, and covered by fixture tests.

## Duplicate handling and deletion

VOID now provides a non-destructive duplicate review under Library > Health > Duplicates:

- It groups same-size files and compares SHA-256 fingerprints built from bounded samples at the beginning, middle, and end of each candidate.
- It lists same-name files separately because matching filenames in different folders are not evidence of matching content.
- The review shows relative paths and media details, opens a candidate group as a player queue, and lets the user select a preferred copy.
- Metadata merge is additive and non-destructive: tags, favorite state, playback history, and completed-play counts are copied into the preferred record while source records and files remain unchanged.

Sampled fingerprints are high-confidence evidence, not a mathematical guarantee that every byte matches. A future confirmation pass should calculate a complete streaming content hash before any destructive workflow is enabled.

Duplicate discovery should continue to develop before deletion:

1. Exact candidates from size plus a sampled or complete content hash.
2. Probable versions from duration, dimensions, codec metadata, and filename similarity.
3. A comparison screen that explains why items match and lets the user choose a preferred copy.

Direct deletion remains a future feature and is not a low-risk addition today. Chromium would require read/write permission and the parent directory handle so it can call `removeEntry`; the current `MediaFileSource` intentionally exposes neither. Firefox's session-file source cannot delete the original at all. Deletion also needs recycle-bin expectations, confirmations, complete-hash verification, recovery expectations, and protection against deleting the final copy.

The safe near-term design is non-destructive: identify duplicates, copy the chosen video's library-relative path, and let the user manage files in the operating system. A web page cannot retrieve the absolute local path or command Windows Explorer to reveal a `FileSystemFileHandle`; true reveal-in-folder requires a trusted desktop wrapper such as Tauri/Electron or a deliberately installed local companion. A future delete action should be Chromium-only, explicitly enabled, and require confirmation immediately before the filesystem mutation.

## Phased delivery

1. Extend the existing backup schema to cover collections, playback state, tag links, and future ratings.
2. Add sidecar detection and read-only import previews.
3. Add opt-in Chromium writes with explicit permission and backup snapshots.
4. Add content fingerprints and move/rename reconciliation.
5. Add conflict-aware two-way synchronization only after the snapshot workflow is proven.

## Deferred library enhancements

- Five-star or ten-point personal ratings, with a single canonical scale internally.
- Technical media analysis for resolution, codecs, bitrate, aspect ratio, and language tracks.
- Exact and probable duplicate detection.
- Editable titles, descriptions, dates, posters, and archival provenance.
- Sidecar formats interoperable with other media managers where mapping is lossless.
