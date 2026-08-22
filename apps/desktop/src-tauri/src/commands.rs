use crate::{
    catalog,
    model::{NativeCatalog, NativeLibrarySelection, NativeMediaFile, NativeScanOptions},
    state::{AppState, display_error},
};
use sha2::{Digest, Sha256};
use std::{
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
    use super::{is_supported_video, scan_directory, thumbnail_path};
    use std::{fs::File, path::Path, time::Instant};
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
}
