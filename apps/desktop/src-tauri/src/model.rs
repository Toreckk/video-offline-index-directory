use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeLibrarySelection {
    pub root_name: String,
    pub root_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeScanOptions {
    pub root_path: String,
    pub scan_subfolders: bool,
}

pub type NativeLibraryWatchOptions = NativeScanOptions;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeLibraryRename {
    pub from_path: String,
    pub to_path: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeLibraryWatchEvent {
    pub watch_id: String,
    pub kind: String,
    pub paths: Vec<String>,
    pub renames: Vec<NativeLibraryRename>,
    pub message: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeMediaFile {
    pub name: String,
    pub extension: String,
    pub path_parts: Vec<String>,
    pub absolute_path: String,
    pub size: u64,
    pub last_modified: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeCatalogAsset {
    pub id: String,
    pub library_id: String,
    pub root_name: String,
    pub name: String,
    pub extension: String,
    pub path_parts: Vec<String>,
    pub absolute_path: String,
    pub size: u64,
    pub last_modified: u64,
    pub thumbnail_status: String,
    pub thumbnail_blob_key: Option<String>,
    pub duration: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub media_probe_status: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeCatalog {
    pub version: u8,
    pub library_id: String,
    pub root_path: String,
    pub saved_at: u64,
    pub assets: Vec<NativeCatalogAsset>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeMediaProbeStatus {
    pub available: bool,
    pub provider: String,
    pub detail: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeMediaMetadata {
    pub duration: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeDuplicateCleanupFile {
    pub absolute_path: String,
    pub expected_sha256: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeDuplicateCleanupRequest {
    pub keeper: NativeDuplicateCleanupFile,
    pub redundant_files: Vec<NativeDuplicateCleanupFile>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeDuplicateCleanupIssue {
    pub absolute_path: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeDuplicateCleanupResult {
    pub kept_path: String,
    pub moved_paths: Vec<String>,
    pub skipped: Vec<NativeDuplicateCleanupIssue>,
    pub failed: Vec<NativeDuplicateCleanupIssue>,
}
