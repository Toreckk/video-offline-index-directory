# Data ownership, migration and recovery

This describes the unreleased v0.4 implementation. v0.3.2 remains the latest public release until publication.

## Where organization lives

Desktop v0.4 stores library identity, settings, tags/relations/favorites, smart collections and playback records through a transactional native port. Its versioned snapshots share `void-catalog.db` with the rebuildable native media catalog. The database lives in Tauri's application-data directory for the unchanged identifier `com.toreckk.void`; thumbnails live in its application-cache directory. Windows normally places these beneath the corresponding AppData locations. Use the actual environment's resolved path, not a guessed folder, for diagnosis.

`pnpm dev:desktop` adds a `development` subdirectory to both native locations. Installed and development data are deliberately separate. The browser edition stores the same logical records in the origin's `void-user-data` IndexedDB database. Browser profiles, origins and native editions do not synchronize. Source videos remain in their chosen folders.

Records have a global schema version and monotonic revision, plus per-store versions: library 2, settings 0, annotations 1, collections 2, playback 1. Each write checks the expected revision. Imports commit all included personal-data records once; verified native renames commit the catalog and associated tags/progress in the same SQLite transaction. Snapshots remain whole JSON documents in this release; batching/delta storage and large-catalog I/O are v0.5 work.

## First launch from v0.3.2

1. The app looks for existing native/origin storage first. It never replaces it with older legacy data.
2. When no new snapshot exists, it reads only the five known legacy keys in the **current** WebView/browser origin. It shows a migration preview. Export recovery data if you want an external copy, then choose **Migrate and continue**.
3. The commit retains a migration receipt and recovery snapshot. Original IndexedDB keys remain untouched. A retry cannot migrate over an existing native snapshot.
4. A development database may have no catalog authorizing a migrated folder reference. **Library → Reconnect Library** retries restoration, then opens the native picker. Select the same full path to keep its ID, tags and playback history. Cancellation leaves everything intact. A same-named folder elsewhere is rejected; use **Choose Another Folder** to configure it separately.

A source that is disconnected and a missing catalog both require reauthorization; a reconnect message does not by itself mean the videos are missing. Do not delete app data to repair that message. v0.4 does not search other profiles for metadata. Downgrading to v0.3.2 reads its original legacy data and does **not** include organization created after migration; export before downgrading and treat rollback as a separate recovery task.

## Exports and imports

Settings offers two portable metadata scopes: active library or all libraries. Library-specific annotations and playback keep their ownership; shared tags and collections accompany the export. Import first shows scope, matching/unmatched records and overlaps. One-library import explicitly targets the selected library. An all-library backup retains its original IDs and cannot silently remap unrelated equal paths into the active root.

Portable metadata backups omit source files and settings. **Export recovery data** additionally includes the durable store snapshot, pending unsaved records, legacy records when observed, retained snapshots and readable raw data. These exports can contain private names and paths; review before attaching to a public issue.

Supported metadata/record content is bounded to 16 MiB, nesting depth 40 and 500,000 parsed values. Unknown schemas, invalid state shapes, unsafe keys and oversized imports fail before publishing state. This is a supported-data limit, not a claim of large-library performance. Keep originals if the app rejects a backup.

Successful imports retain the five latest pre-import snapshots, plus the initial migration snapshot. **Settings → Data recovery → Show retained snapshots** previews a replacement; **Restore and restart** first saves a recovery copy, then commits the selected stores. Unlisted stores remain. Recovery-file preview uses its durable snapshot or legacy data; pending edits/raw damaged content are available for inspection, never blindly replayed.

## When a save fails

The recovery screen stops normal editing and offers export, retry and reload. Original data is not reset. Retry can recover a temporary I/O failure if the revision still matches. Another window's newer revision, an unsupported schema, corruption or an edit completing during an import/rename requires inspection/export and reload rather than automatic overwrite. A transaction can already be durable while a concurrent edit remains only in the export; the message distinguishes that case.

Do not copy a live SQLite database as an ordinary single file: WAL state matters. Prefer the app's export. For filesystem recovery, close every VOID process, retain the database and any `-wal`/`-shm` files together, and work on a copy. A damaged database may not support in-app export; retain its files for recovery, rather than deleting it to get past startup.

## Duplicate cleanup and undo

Cleanup is explicitly confirmed and only available for complete-hash matches on desktop. The keeper stays open against writes/deletion through the batch; each candidate is hashed through its locked handle. A successful handle rename stages that same file beneath its original folder's `.void/cleanup-*` directory, closing the source-path replacement race. A flushed `recovery.json` records both paths before the move. Windows receives a recycle-only operation. If recycling fails, VOID restores the file without replacing an occupied original path; otherwise the message identifies its retained recovery directory.

To undo successful cleanup: restore the exact file from Windows Recycle Bin, which returns it to its staging directory; follow `recovery.json` to move it back to the original path **only if that path is empty**. If a crash interrupted cleanup, inspect that directory first. Never empty these recovery directories as part of thumbnail-cache cleanup. The keeper's merged organization is saved before filesystem operations start. A Recycle Bin disabled/unavailable error is a failed cleanup, not permission to permanently delete.
