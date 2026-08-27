use crate::{
    catalog,
    model::{
        NativeCatalog, NativeDuplicateCleanupFile, NativeDuplicateCleanupIssue,
        NativeDuplicateCleanupRequest, NativeDuplicateCleanupResult, NativeLibrarySelection,
        NativeMediaFile, NativeScanOptions,
    },
    state::{AppState, display_error},
};
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    ffi::OsStr,
    fs::File,
    io::{Read, Write},
    path::{Path, PathBuf},
    process::Command,
    time::UNIX_EPOCH,
};
use tauri::{AppHandle, Manager, State, async_runtime};
use tauri_plugin_dialog::DialogExt;
use walkdir::{DirEntry, WalkDir};

const VIDEO_EXTENSIONS: &[&str] = &["mp4", "webm"];

#[tauri::command]
pub async fn select_library(app: AppHandle) -> Result<Option<NativeLibrarySelection>, String> {
    let dialog_app = app.clone();
    let selected =
        async_runtime::spawn_blocking(move || dialog_app.dialog().file().blocking_pick_folder())
            .await
            .map_err(display_error)?;
    let Some(selected) = selected else {
        return Ok(None);
    };
    let selected = selected.into_path().map_err(display_error)?;
    let root = app.state::<AppState>().register_root(&selected)?;
    app.asset_protocol_scope()
        .allow_directory(&root, true)
        .map_err(display_error)?;
    let root_name = root
        .file_name()
        .and_then(OsStr::to_str)
        .ok_or_else(|| "The selected library name is not valid UTF-8.".to_string())?
        .to_string();
    Ok(Some(NativeLibrarySelection {
        root_name,
        root_path: root.to_string_lossy().into_owned(),
    }))
}

#[tauri::command]
pub fn restore_library(
    app: AppHandle,
    state: State<'_, AppState>,
    library_id: String,
    root_path: String,
) -> Result<NativeLibrarySelection, String> {
    let root = restore_catalog_root(&state, &library_id, Path::new(&root_path))?;
    app.asset_protocol_scope()
        .allow_directory(&root, true)
        .map_err(display_error)?;
    library_selection(&root)
}

#[tauri::command]
pub async fn scan_library(
    app: AppHandle,
    options: NativeScanOptions,
) -> Result<Vec<NativeMediaFile>, String> {
    let root = app
        .state::<AppState>()
        .validate_root(Path::new(&options.root_path))?;
    app.asset_protocol_scope()
        .allow_directory(&root, true)
        .map_err(display_error)?;
    async_runtime::spawn_blocking(move || scan_directory(&root, options.scan_subfolders))
        .await
        .map_err(display_error)?
}

fn scan_directory(root: &Path, scan_subfolders: bool) -> Result<Vec<NativeMediaFile>, String> {
    let root = root.canonicalize().map_err(display_error)?;
    let max_depth = if scan_subfolders { usize::MAX } else { 1 };
    let mut media = Vec::new();
    for entry in WalkDir::new(&root)
        .follow_links(false)
        .max_depth(max_depth)
        .into_iter()
        .filter_entry(not_hidden_void_directory)
    {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };
        if !entry.file_type().is_file() || !is_supported_video(entry.path()) {
            continue;
        }
        let canonical = match entry.path().canonicalize() {
            Ok(path) if path.is_file() && path.starts_with(&root) => path,
            _ => continue,
        };
        let metadata = canonical.metadata().map_err(display_error)?;
        let relative = canonical.strip_prefix(&root).map_err(display_error)?;
        let name = relative
            .file_name()
            .and_then(OsStr::to_str)
            .ok_or_else(|| "A media filename is not valid UTF-8.".to_string())?
            .to_string();
        let path_parts = relative
            .parent()
            .map(|parent| {
                parent
                    .components()
                    .filter_map(|component| component.as_os_str().to_str().map(str::to_string))
                    .collect()
            })
            .unwrap_or_default();
        let extension = canonical
            .extension()
            .and_then(OsStr::to_str)
            .unwrap_or_default()
            .to_ascii_lowercase();
        let last_modified = metadata
            .modified()
            .ok()
            .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
            .map(|value| value.as_millis() as u64)
            .unwrap_or(0);
        media.push(NativeMediaFile {
            name,
            extension,
            path_parts,
            absolute_path: canonical.to_string_lossy().into_owned(),
            size: metadata.len(),
            last_modified,
        });
    }
    media.sort_unstable_by(|left, right| left.absolute_path.cmp(&right.absolute_path));
    Ok(media)
}

#[tauri::command]
pub fn load_catalog(
    app: AppHandle,
    state: State<'_, AppState>,
    library_id: String,
) -> Result<Option<NativeCatalog>, String> {
    let catalog_value = catalog::load(&state.open_database()?, &library_id)?;
    let Some(catalog_value) = catalog_value else {
        return Ok(None);
    };
    let root = state.register_root(Path::new(&catalog_value.root_path))?;
    app.asset_protocol_scope()
        .allow_directory(&root, true)
        .map_err(display_error)?;
    Ok(Some(catalog_value))
}

fn restore_catalog_root(
    state: &AppState,
    library_id: &str,
    requested_root: &Path,
) -> Result<PathBuf, String> {
    let catalog_value = catalog::load(&state.open_database()?, library_id)?.ok_or_else(|| {
        "The saved library catalog is unavailable. Select the folder again.".to_string()
    })?;
    let requested_root = requested_root.canonicalize().map_err(display_error)?;
    let catalog_root = Path::new(&catalog_value.root_path)
        .canonicalize()
        .map_err(display_error)?;
    if requested_root != catalog_root {
        return Err("The saved library path does not match its trusted catalog.".to_string());
    }
    state.register_root(&requested_root)
}

fn library_selection(root: &Path) -> Result<NativeLibrarySelection, String> {
    let root_name = root
        .file_name()
        .and_then(OsStr::to_str)
        .ok_or_else(|| "The selected library name is not valid UTF-8.".to_string())?
        .to_string();
    Ok(NativeLibrarySelection {
        root_name,
        root_path: root.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
pub fn save_catalog(
    state: State<'_, AppState>,
    mut catalog_value: NativeCatalog,
) -> Result<(), String> {
    if catalog_value.version != 1 {
        return Err("Unsupported desktop catalog version.".to_string());
    }
    let root = state.validate_root(Path::new(&catalog_value.root_path))?;
    catalog_value.root_path = root.to_string_lossy().into_owned();
    for asset in &catalog_value.assets {
        state.validate_file(Path::new(&asset.absolute_path))?;
        if asset.library_id != catalog_value.library_id {
            return Err("A catalog asset belongs to a different library.".to_string());
        }
    }
    catalog::save(&mut state.open_database()?, &catalog_value)
}

#[tauri::command]
pub fn delete_catalog(state: State<'_, AppState>, library_id: String) -> Result<(), String> {
    catalog::delete(&state.open_database()?, &library_id)
}

#[tauri::command]
pub fn read_thumbnail(state: State<'_, AppState>, key: String) -> Result<Option<Vec<u8>>, String> {
    let path = thumbnail_path(&state.thumbnail_dir, &key);
    match std::fs::read(path) {
        Ok(bytes) => Ok(Some(bytes)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(display_error(error)),
    }
}

#[tauri::command]
pub fn write_thumbnail(
    state: State<'_, AppState>,
    key: String,
    bytes: Vec<u8>,
) -> Result<(), String> {
    if bytes.len() > 10 * 1024 * 1024 {
        return Err("Thumbnail exceeds the 10 MB safety limit.".to_string());
    }
    std::fs::create_dir_all(&state.thumbnail_dir).map_err(display_error)?;
    let destination = thumbnail_path(&state.thumbnail_dir, &key);
    let temporary = destination.with_extension("tmp");
    let mut file = File::create(&temporary).map_err(display_error)?;
    file.write_all(&bytes).map_err(display_error)?;
    file.sync_all().map_err(display_error)?;
    if destination.exists() {
        std::fs::remove_file(&destination).map_err(display_error)?;
    }
    std::fs::rename(temporary, destination).map_err(display_error)
}

#[tauri::command]
pub fn clear_thumbnail_cache(state: State<'_, AppState>) -> Result<usize, String> {
    let mut removed = 0;
    for entry in std::fs::read_dir(&state.thumbnail_dir).map_err(display_error)? {
        let entry = entry.map_err(display_error)?;
        if entry.file_type().map_err(display_error)?.is_file() {
            std::fs::remove_file(entry.path()).map_err(display_error)?;
            removed += 1;
        }
    }
    Ok(removed)
}

#[tauri::command]
pub async fn hash_file(app: AppHandle, absolute_path: String) -> Result<String, String> {
    let path = app
        .state::<AppState>()
        .validate_file(Path::new(&absolute_path))?;
    async_runtime::spawn_blocking(move || hash_file_contents(&path))
        .await
        .map_err(display_error)?
}

fn hash_file_contents(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(display_error)?;
    let mut digest = Sha256::new();
    let mut buffer = vec![0_u8; 1024 * 1024];
    loop {
        let count = file.read(&mut buffer).map_err(display_error)?;
        if count == 0 {
            break;
        }
        digest.update(&buffer[..count]);
    }
    let result = digest.finalize();
    Ok(format!("{result:x}"))
}

#[derive(Debug)]
struct ValidatedCleanupFile {
    path: PathBuf,
    expected_sha256: String,
}

#[tauri::command]
pub async fn cleanup_duplicate_files(
    app: AppHandle,
    request: NativeDuplicateCleanupRequest,
) -> Result<NativeDuplicateCleanupResult, String> {
    let (keeper, redundant_files) = validate_cleanup_request(&app.state::<AppState>(), request)?;
    async_runtime::spawn_blocking(move || {
        perform_duplicate_cleanup(keeper, redundant_files, |path| {
            trash::delete(path).map_err(display_error)
        })
    })
    .await
    .map_err(display_error)?
}

fn validate_cleanup_request(
    state: &AppState,
    request: NativeDuplicateCleanupRequest,
) -> Result<(ValidatedCleanupFile, Vec<ValidatedCleanupFile>), String> {
    if request.redundant_files.is_empty() {
        return Err(
            "Choose at least one redundant duplicate to move to the Recycle Bin.".to_string(),
        );
    }
    let keeper = validate_cleanup_file(state, request.keeper)?;
    let mut seen = HashSet::from([keeper.path.clone()]);
    let mut redundant_files = Vec::with_capacity(request.redundant_files.len());
    for file in request.redundant_files {
        let file = validate_cleanup_file(state, file)?;
        if !seen.insert(file.path.clone()) {
            return Err(
                "The cleanup request contains the keeper or a duplicate path more than once."
                    .to_string(),
            );
        }
        redundant_files.push(file);
    }
    Ok((keeper, redundant_files))
}

fn validate_cleanup_file(
    state: &AppState,
    file: NativeDuplicateCleanupFile,
) -> Result<ValidatedCleanupFile, String> {
    let expected_sha256 = file.expected_sha256.to_ascii_lowercase();
    if expected_sha256.len() != 64 || !expected_sha256.bytes().all(|byte| byte.is_ascii_hexdigit())
    {
        return Err("Duplicate cleanup requires a complete SHA-256 fingerprint.".to_string());
    }
    Ok(ValidatedCleanupFile {
        path: state.validate_file(Path::new(&file.absolute_path))?,
        expected_sha256,
    })
}

fn perform_duplicate_cleanup(
    keeper: ValidatedCleanupFile,
    redundant_files: Vec<ValidatedCleanupFile>,
    mut move_to_trash: impl FnMut(&Path) -> Result<(), String>,
) -> Result<NativeDuplicateCleanupResult, String> {
    let keeper_hash = hash_file_contents(&keeper.path)?;
    if keeper_hash != keeper.expected_sha256 {
        return Err(
            "The selected keeper changed after duplicate analysis. Run the scan again.".to_string(),
        );
    }

    let kept_path = keeper.path.to_string_lossy().into_owned();
    let mut result = NativeDuplicateCleanupResult {
        kept_path,
        moved_paths: Vec::new(),
        skipped: Vec::new(),
        failed: Vec::new(),
    };
    for file in redundant_files {
        let absolute_path = file.path.to_string_lossy().into_owned();
        match hash_file_contents(&file.path) {
            Ok(current_hash)
                if current_hash != keeper_hash || current_hash != file.expected_sha256 =>
            {
                result.skipped.push(NativeDuplicateCleanupIssue {
                    absolute_path,
                    message: "The file changed after duplicate analysis. It was left in place."
                        .to_string(),
                });
            }
            Err(message) => result.failed.push(NativeDuplicateCleanupIssue {
                absolute_path,
                message,
            }),
            Ok(_) => match move_to_trash(&file.path) {
                Ok(()) => result.moved_paths.push(absolute_path),
                Err(message) => result.failed.push(NativeDuplicateCleanupIssue {
                    absolute_path,
                    message,
                }),
            },
        }
    }
    Ok(result)
}

#[tauri::command]
pub fn reveal_file(state: State<'_, AppState>, absolute_path: String) -> Result<(), String> {
    let path = state.validate_file(Path::new(&absolute_path))?;
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer.exe")
            .arg("/select,")
            .arg(path)
            .spawn()
            .map(|_| ())
            .map_err(display_error)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
        Err("Reveal in file manager is currently supported only on Windows.".to_string())
    }
}

fn thumbnail_path(root: &Path, key: &str) -> PathBuf {
    let digest = Sha256::digest(key.as_bytes());
    root.join(format!("{digest:x}.jpg"))
}

fn is_supported_video(path: &Path) -> bool {
    path.extension()
        .and_then(OsStr::to_str)
        .map(|extension| VIDEO_EXTENSIONS.contains(&extension.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

fn not_hidden_void_directory(entry: &DirEntry) -> bool {
    entry.depth() == 0 || entry.file_name() != OsStr::new(".void")
}

#[cfg(test)]
mod tests {
    use super::{
        hash_file_contents, is_supported_video, perform_duplicate_cleanup, restore_catalog_root,
        scan_directory, thumbnail_path, validate_cleanup_request,
    };
    use crate::{
        catalog,
        model::{NativeCatalog, NativeDuplicateCleanupFile, NativeDuplicateCleanupRequest},
        state::AppState,
    };
    use std::{
        fs::{self, File},
        path::Path,
        time::Instant,
    };
    use tempfile::tempdir;

    #[test]
    fn recognizes_video_extensions_case_insensitively() {
        assert!(is_supported_video(Path::new("clip.MP4")));
        assert!(is_supported_video(Path::new("archive.webm")));
        assert!(!is_supported_video(Path::new("archive.m2ts")));
        assert!(!is_supported_video(Path::new("notes.txt")));
    }

    #[test]
    fn thumbnail_keys_cannot_escape_the_cache_directory() {
        let root = Path::new("cache");
        let result = thumbnail_path(root, "../../outside");
        assert_eq!(result.parent(), Some(root));
        assert_eq!(
            result.extension().and_then(|value| value.to_str()),
            Some("jpg")
        );
    }

    #[test]
    fn scans_a_five_thousand_video_fixture_without_losing_entries() {
        let directory = tempdir().expect("fixture directory");
        for index in 0..5_000 {
            File::create(directory.path().join(format!("video-{index}.mp4")))
                .expect("fixture video");
        }
        let started = Instant::now();
        let media = scan_directory(directory.path(), true).expect("native scan");
        let elapsed = started.elapsed();
        eprintln!("5,000-file native discovery: {elapsed:?}");
        assert_eq!(media.len(), 5_000);
        assert!(elapsed.as_secs() < 15, "scan exceeded 15 seconds");
    }

    #[test]
    fn restores_only_the_root_recorded_for_the_library() {
        let app_data = tempdir().expect("app data");
        let selected = tempdir().expect("selected library");
        let different = tempdir().expect("different library");
        let state = AppState::new(
            app_data.path().join("catalog.db"),
            app_data.path().join("thumbnails"),
        )
        .expect("application state");
        catalog::save(
            &mut state.open_database().expect("catalog database"),
            &NativeCatalog {
                version: 1,
                library_id: "library".to_string(),
                root_path: selected.path().to_string_lossy().into_owned(),
                saved_at: 1,
                assets: vec![],
            },
        )
        .expect("saved catalog");

        assert!(state.validate_root(selected.path()).is_err());
        assert!(restore_catalog_root(&state, "library", different.path()).is_err());
        let restored =
            restore_catalog_root(&state, "library", selected.path()).expect("trusted catalog root");
        assert_eq!(
            restored,
            selected.path().canonicalize().expect("canonical root")
        );
        assert!(state.validate_root(selected.path()).is_ok());
    }

    #[test]
    fn cleanup_revalidates_complete_hashes_and_preserves_the_keeper() {
        let app_data = tempdir().expect("app data");
        let selected = tempdir().expect("selected library");
        let keeper_path = selected.path().join("keeper.mp4");
        let duplicate_path = selected.path().join("duplicate.mp4");
        fs::write(&keeper_path, b"identical bytes").expect("keeper");
        fs::write(&duplicate_path, b"identical bytes").expect("duplicate");
        let expected_sha256 = hash_file_contents(&keeper_path).expect("hash");
        let state = AppState::new(
            app_data.path().join("catalog.db"),
            app_data.path().join("thumbnails"),
        )
        .expect("application state");
        state.register_root(selected.path()).expect("selected root");
        let (keeper, redundant_files) = validate_cleanup_request(
            &state,
            cleanup_request(&keeper_path, &[&duplicate_path], &expected_sha256),
        )
        .expect("validated cleanup");
        let mut moved = Vec::new();

        let result = perform_duplicate_cleanup(keeper, redundant_files, |path| {
            moved.push(path.to_path_buf());
            Ok(())
        })
        .expect("cleanup result");

        assert_eq!(
            moved,
            vec![duplicate_path.canonicalize().expect("canonical duplicate")]
        );
        assert_eq!(result.moved_paths.len(), 1);
        assert!(result.skipped.is_empty());
        assert!(result.failed.is_empty());
        assert!(keeper_path.exists());
    }

    #[test]
    fn cleanup_skips_changed_files_and_reports_recycle_bin_failures() {
        let app_data = tempdir().expect("app data");
        let selected = tempdir().expect("selected library");
        let keeper_path = selected.path().join("keeper.mp4");
        let changed_path = selected.path().join("changed.mp4");
        let failed_path = selected.path().join("failed.mp4");
        for path in [&keeper_path, &changed_path, &failed_path] {
            fs::write(path, b"identical bytes").expect("fixture");
        }
        let expected_sha256 = hash_file_contents(&keeper_path).expect("hash");
        let state = AppState::new(
            app_data.path().join("catalog.db"),
            app_data.path().join("thumbnails"),
        )
        .expect("application state");
        state.register_root(selected.path()).expect("selected root");
        let (keeper, redundant_files) = validate_cleanup_request(
            &state,
            cleanup_request(
                &keeper_path,
                &[&changed_path, &failed_path],
                &expected_sha256,
            ),
        )
        .expect("validated cleanup");
        fs::write(&changed_path, b"changed after scan").expect("changed fixture");

        let result = perform_duplicate_cleanup(keeper, redundant_files, |_| {
            Err("Recycle Bin unavailable".to_string())
        })
        .expect("cleanup result");

        assert!(result.moved_paths.is_empty());
        assert_eq!(result.skipped.len(), 1);
        assert_eq!(result.failed.len(), 1);
    }

    #[test]
    fn cleanup_rejects_paths_outside_the_selected_library() {
        let app_data = tempdir().expect("app data");
        let selected = tempdir().expect("selected library");
        let outside = tempdir().expect("outside directory");
        let keeper_path = selected.path().join("keeper.mp4");
        let outside_path = outside.path().join("outside.mp4");
        fs::write(&keeper_path, b"identical bytes").expect("keeper");
        fs::write(&outside_path, b"identical bytes").expect("outside");
        let expected_sha256 = hash_file_contents(&keeper_path).expect("hash");
        let state = AppState::new(
            app_data.path().join("catalog.db"),
            app_data.path().join("thumbnails"),
        )
        .expect("application state");
        state.register_root(selected.path()).expect("selected root");

        assert!(
            validate_cleanup_request(
                &state,
                cleanup_request(&keeper_path, &[&outside_path], &expected_sha256),
            )
            .is_err()
        );
    }

    fn cleanup_request(
        keeper_path: &Path,
        redundant_paths: &[&Path],
        expected_sha256: &str,
    ) -> NativeDuplicateCleanupRequest {
        let file = |path: &Path| NativeDuplicateCleanupFile {
            absolute_path: path.to_string_lossy().into_owned(),
            expected_sha256: expected_sha256.to_string(),
        };
        NativeDuplicateCleanupRequest {
            keeper: file(keeper_path),
            redundant_files: redundant_paths.iter().map(|path| file(path)).collect(),
        }
    }
}
