use notify::RecommendedWatcher;
use rusqlite::Connection;
use std::{
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
    sync::{
        Mutex,
        atomic::{AtomicU64, Ordering},
    },
};

pub struct AppState {
    pub database_path: PathBuf,
    pub thumbnail_dir: PathBuf,
    allowed_roots: Mutex<HashSet<PathBuf>>,
    library_watchers: Mutex<HashMap<String, RecommendedWatcher>>,
    next_watch_id: AtomicU64,
}

impl AppState {
    pub fn new(database_path: PathBuf, thumbnail_dir: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&thumbnail_dir).map_err(display_error)?;
        let state = Self {
            database_path,
            thumbnail_dir,
            allowed_roots: Mutex::new(HashSet::new()),
            library_watchers: Mutex::new(HashMap::new()),
            next_watch_id: AtomicU64::new(1),
        };
        state.initialize_database()?;
        Ok(state)
    }

    pub fn open_database(&self) -> Result<Connection, String> {
        let connection = Connection::open(&self.database_path).map_err(display_error)?;
        connection
            .pragma_update(None, "foreign_keys", "ON")
            .map_err(display_error)?;
        connection
            .pragma_update(None, "journal_mode", "WAL")
            .map_err(display_error)?;
        Ok(connection)
    }

    pub fn register_root(&self, root: &Path) -> Result<PathBuf, String> {
        let canonical = canonical_directory(root)?;
        self.allowed_roots
            .lock()
            .map_err(|_| "Library access state is unavailable.".to_string())?
            .insert(canonical.clone());
        Ok(canonical)
    }

    pub fn validate_root(&self, root: &Path) -> Result<PathBuf, String> {
        let canonical = canonical_directory(root)?;
        let allowed = self
            .allowed_roots
            .lock()
            .map_err(|_| "Library access state is unavailable.".to_string())?
            .contains(&canonical);
        if !allowed {
            return Err("The requested directory has not been selected as a library.".to_string());
        }
        Ok(canonical)
    }

    pub fn validate_file(&self, path: &Path) -> Result<PathBuf, String> {
        let canonical = path.canonicalize().map_err(display_error)?;
        if !canonical.is_file() {
            return Err("The requested media path is not a file.".to_string());
        }
        let allowed = self
            .allowed_roots
            .lock()
            .map_err(|_| "Library access state is unavailable.".to_string())?
            .iter()
            .any(|root| canonical.starts_with(root));
        if !allowed {
            return Err("The requested file is outside the selected library.".to_string());
        }
        Ok(canonical)
    }

    pub fn next_watch_id(&self) -> String {
        format!(
            "watch-{}",
            self.next_watch_id.fetch_add(1, Ordering::Relaxed)
        )
    }

    pub fn store_watcher(
        &self,
        watch_id: String,
        watcher: RecommendedWatcher,
    ) -> Result<(), String> {
        self.library_watchers
            .lock()
            .map_err(|_| "Library watcher state is unavailable.".to_string())?
            .insert(watch_id, watcher);
        Ok(())
    }

    pub fn remove_watcher(&self, watch_id: &str) -> Result<bool, String> {
        Ok(self
            .library_watchers
            .lock()
            .map_err(|_| "Library watcher state is unavailable.".to_string())?
            .remove(watch_id)
            .is_some())
    }

    fn initialize_database(&self) -> Result<(), String> {
        let connection = self.open_database()?;
        connection
            .execute_batch(
                "BEGIN;
                 CREATE TABLE IF NOT EXISTS schema_migrations (
                   version INTEGER PRIMARY KEY,
                   applied_at INTEGER NOT NULL
                 );
                 CREATE TABLE IF NOT EXISTS media_catalogs (
                   library_id TEXT PRIMARY KEY,
                   root_path TEXT NOT NULL,
                   saved_at INTEGER NOT NULL,
                   payload TEXT NOT NULL
                 );
                 INSERT OR IGNORE INTO schema_migrations(version, applied_at)
                   VALUES (1, CAST(strftime('%s','now') AS INTEGER));
                 COMMIT;",
            )
            .map_err(display_error)
    }
}

fn canonical_directory(path: &Path) -> Result<PathBuf, String> {
    let canonical = path.canonicalize().map_err(display_error)?;
    if !canonical.is_dir() {
        return Err("The selected library path is not a directory.".to_string());
    }
    Ok(canonical)
}

pub fn display_error(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use super::AppState;
    use std::fs::File;
    use tempfile::tempdir;

    #[test]
    fn only_selected_roots_authorize_file_access() {
        let app_data = tempdir().expect("app data");
        let selected = tempdir().expect("selected library");
        let outside = tempdir().expect("outside directory");
        let selected_file = selected.path().join("inside.mp4");
        let outside_file = outside.path().join("outside.mp4");
        File::create(&selected_file).expect("selected video");
        File::create(&outside_file).expect("outside video");

        let state = AppState::new(
            app_data.path().join("catalog.db"),
            app_data.path().join("thumbnails"),
        )
        .expect("application state");
        state.register_root(selected.path()).expect("selected root");

        assert!(state.validate_root(selected.path()).is_ok());
        assert!(state.validate_file(&selected_file).is_ok());
        assert!(state.validate_root(outside.path()).is_err());
        assert!(state.validate_file(&outside_file).is_err());
    }

    #[test]
    fn initializes_the_versioned_catalog_schema() {
        let app_data = tempdir().expect("app data");
        let state = AppState::new(
            app_data.path().join("catalog.db"),
            app_data.path().join("thumbnails"),
        )
        .expect("application state");
        let version: i64 = state
            .open_database()
            .expect("database")
            .query_row("SELECT MAX(version) FROM schema_migrations", [], |row| {
                row.get(0)
            })
            .expect("schema version");
        assert_eq!(version, 1);
    }
}
