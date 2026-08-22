use crate::{model::NativeCatalog, state::display_error};
use rusqlite::{Connection, OptionalExtension, params};

pub fn load(connection: &Connection, library_id: &str) -> Result<Option<NativeCatalog>, String> {
    let payload = connection
        .query_row(
            "SELECT payload FROM media_catalogs WHERE library_id = ?1",
            params![library_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(display_error)?;

    payload
        .map(|json| serde_json::from_str(&json).map_err(display_error))
        .transpose()
}

pub fn save(connection: &mut Connection, catalog: &NativeCatalog) -> Result<(), String> {
    let payload = serde_json::to_string(catalog).map_err(display_error)?;
    let transaction = connection.transaction().map_err(display_error)?;
    transaction
        .execute(
            "INSERT INTO media_catalogs(library_id, root_path, saved_at, payload)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(library_id) DO UPDATE SET
               root_path = excluded.root_path,
               saved_at = excluded.saved_at,
               payload = excluded.payload",
            params![
                catalog.library_id,
                catalog.root_path,
                catalog.saved_at,
                payload
            ],
        )
        .map_err(display_error)?;
    transaction.commit().map_err(display_error)
}

pub fn delete(connection: &Connection, library_id: &str) -> Result<(), String> {
    connection
        .execute(
            "DELETE FROM media_catalogs WHERE library_id = ?1",
            params![library_id],
        )
        .map(|_| ())
        .map_err(display_error)
}

#[cfg(test)]
mod tests {
    use super::{load, save};
    use crate::{
        model::{NativeCatalog, NativeCatalogAsset},
        state::AppState,
    };
    use std::time::Instant;
    use tempfile::tempdir;

    #[test]
    fn saves_and_restores_a_five_thousand_asset_catalog() {
        let app_data = tempdir().expect("app data");
        let state = AppState::new(
            app_data.path().join("catalog.db"),
            app_data.path().join("thumbnails"),
        )
        .expect("application state");
        let catalog = fixture_catalog(5_000);

        let save_started = Instant::now();
        save(&mut state.open_database().expect("save database"), &catalog).expect("save catalog");
        let save_elapsed = save_started.elapsed();
        let load_started = Instant::now();
        let restored = load(
            &state.open_database().expect("load database"),
            &catalog.library_id,
        )
        .expect("load catalog")
        .expect("stored catalog");
        let load_elapsed = load_started.elapsed();

        eprintln!("5,000-asset SQLite catalog: save {save_elapsed:?}, load {load_elapsed:?}");
        assert_eq!(restored.assets.len(), 5_000);
        assert!(
            save_elapsed.as_secs() < 5,
            "catalog save exceeded 5 seconds"
        );
        assert!(
            load_elapsed.as_secs() < 5,
            "catalog load exceeded 5 seconds"
        );
    }

    fn fixture_catalog(count: usize) -> NativeCatalog {
        NativeCatalog {
            version: 1,
            library_id: "benchmark-library".to_string(),
            root_path: r"C:\Videos".to_string(),
            saved_at: 1_700_000_000_000,
            assets: (0..count)
                .map(|index| NativeCatalogAsset {
                    id: format!("benchmark-library/folder-{}/clip-{index}.mp4", index % 50),
                    library_id: "benchmark-library".to_string(),
                    root_name: "Videos".to_string(),
                    name: format!("clip-{index}.mp4"),
                    extension: "mp4".to_string(),
                    path_parts: vec![format!("folder-{}", index % 50)],
                    absolute_path: format!(r"C:\Videos\folder-{}\clip-{index}.mp4", index % 50),
                    size: 1_000_000 + index as u64,
                    last_modified: 1_700_000_000_000 + index as u64,
                    thumbnail_status: "ready".to_string(),
                    thumbnail_blob_key: Some(format!("void-thumbnail:v2:{index}")),
                    duration: Some(30.0 + (index % 300) as f64),
                    width: Some(1920),
                    height: Some(1080),
                })
                .collect(),
        }
    }
}
