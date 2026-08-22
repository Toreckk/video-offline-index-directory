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
