use crate::state::{AppState, display_error};
use rusqlite::{Connection, OptionalExtension, TransactionBehavior, params};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use tauri::{AppHandle, Manager, async_runtime};

const MAX_BYTES: usize = 32 * 1024 * 1024;
const STORE_NAMES: [&str; 5] = [
    "void-library-store",
    "void-settings-store",
    "void-annotations-store",
    "void-collections-store",
    "void-playback-store",
];

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MigrationReceipt {
    pub id: String,
    pub origin: String,
    pub created_at: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct UserDataSnapshot {
    pub schema_version: u32,
    pub revision: u64,
    pub records: BTreeMap<String, String>,
    pub migration: Option<MigrationReceipt>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct UserDataCommit {
    pub expected_revision: u64,
    pub records: BTreeMap<String, String>,
    pub migration: Option<MigrationReceipt>,
    pub recovery_reason: Option<String>,
    pub catalog: Option<crate::model::NativeCatalog>,
}

#[derive(Serialize)]
pub struct RecoverySnapshot {
    reason: String,
    snapshot: UserDataSnapshot,
}

pub fn initialize(connection: &Connection) -> Result<(), String> {
    connection.execute_batch("CREATE TABLE IF NOT EXISTS user_data (singleton INTEGER PRIMARY KEY CHECK(singleton = 1), payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS user_data_recovery (id INTEGER PRIMARY KEY, reason TEXT NOT NULL, payload TEXT NOT NULL);").map_err(display_error)
}

pub fn load(connection: &Connection) -> Result<Option<UserDataSnapshot>, String> {
    let payload: Option<String> = connection
        .query_row(
            "SELECT payload FROM user_data WHERE singleton = 1",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(display_error)?;
    payload
        .map(|payload| {
            if payload.len() > MAX_BYTES {
                return Err(
                    "User data exceeds the supported size. Export recovery data before proceeding."
                        .to_string(),
                );
            }
            let snapshot: UserDataSnapshot =
                serde_json::from_str(&payload).map_err(display_error)?;
            if snapshot.schema_version != 1 {
                return Err(
                    "This user-data schema requires a newer version of VOID. No data was changed."
                        .to_string(),
                );
            }
            Ok(snapshot)
        })
        .transpose()
}

pub fn commit(
    connection: &mut Connection,
    request: UserDataCommit,
) -> Result<UserDataSnapshot, String> {
    if request
        .records
        .keys()
        .any(|key| !STORE_NAMES.contains(&key.as_str()))
        || request.records.values().map(String::len).sum::<usize>() > MAX_BYTES / 2
    {
        return Err("Invalid or oversized user-data records.".to_string());
    }
    for value in request.records.values() {
        let document: serde_json::Value = serde_json::from_str(value).map_err(display_error)?;
        if !document
            .get("state")
            .is_some_and(serde_json::Value::is_object)
        {
            return Err("Invalid user-data state record.".to_string());
        }
    }
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(display_error)?;
    let previous = load(&transaction)?;
    if previous.as_ref().map_or(0, |value| value.revision) != request.expected_revision {
        return Err("User data changed in another window. Export unsaved changes, then reload before editing.".to_string());
    }
    if request.migration.is_some() && previous.is_some() {
        return Err("Migration cannot replace existing native user data.".to_string());
    }
    if request
        .recovery_reason
        .as_deref()
        .is_some_and(|reason| reason != "import")
    {
        return Err("Unsupported recovery reason.".to_string());
    }
    let next = UserDataSnapshot {
        schema_version: 1,
        revision: request
            .expected_revision
            .checked_add(1)
            .filter(|v| *v <= 9_007_199_254_740_991)
            .ok_or("User-data revision limit reached.")?,
        records: request.records,
        migration: request
            .migration
            .or_else(|| previous.as_ref().and_then(|value| value.migration.clone())),
    };
    let payload = serde_json::to_string(&next).map_err(display_error)?;
    if payload.len() > MAX_BYTES {
        return Err("User data exceeds the supported size.".to_string());
    }
    if let Some(reason) = request.recovery_reason {
        if let Some(previous) = previous {
            transaction
                .execute(
                    "INSERT INTO user_data_recovery(reason, payload) VALUES (?1, ?2)",
                    params![
                        reason,
                        serde_json::to_string(&previous).map_err(display_error)?
                    ],
                )
                .map_err(display_error)?;
            transaction.execute("DELETE FROM user_data_recovery WHERE reason = 'import' AND id NOT IN (SELECT id FROM user_data_recovery WHERE reason = 'import' ORDER BY id DESC LIMIT 5)", []).map_err(display_error)?;
        }
    } else if next.migration.is_some() && request.expected_revision == 0 {
        transaction
            .execute(
                "INSERT INTO user_data_recovery(reason, payload) VALUES ('legacy-migration', ?1)",
                [&payload],
            )
            .map_err(display_error)?;
    }
    transaction.execute("INSERT INTO user_data(singleton, payload) VALUES (1, ?1) ON CONFLICT(singleton) DO UPDATE SET payload = excluded.payload", [&payload]).map_err(display_error)?;
    if let Some(catalog) = request.catalog {
        crate::catalog::save_in_transaction(&transaction, &catalog)?;
    }
    transaction.commit().map_err(display_error)?;
    Ok(next)
}

#[tauri::command]
pub async fn load_user_data(app: AppHandle) -> Result<Option<UserDataSnapshot>, String> {
    async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        state.initialize_database()?;
        load(&state.open_database()?)
    })
    .await
    .map_err(display_error)?
}

#[tauri::command]
pub async fn raw_user_data(app: AppHandle) -> Result<Option<String>, String> {
    async_runtime::spawn_blocking(move || {
        app.state::<AppState>()
            .open_database()?
            .query_row(
                "SELECT payload FROM user_data WHERE singleton = 1",
                [],
                |row| row.get(0),
            )
            .optional()
            .map_err(display_error)
    })
    .await
    .map_err(display_error)?
}

#[tauri::command]
pub async fn commit_user_data(
    app: AppHandle,
    mut request: UserDataCommit,
) -> Result<UserDataSnapshot, String> {
    async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        if let Some(catalog) = request.catalog.as_mut() {
            crate::commands::validate_catalog(&state, catalog)?;
        }
        commit(&mut state.open_database()?, request)
    })
    .await
    .map_err(display_error)?
}

#[tauri::command]
pub async fn user_data_recovery(app: AppHandle) -> Result<Vec<RecoverySnapshot>, String> {
    async_runtime::spawn_blocking(move || {
        let connection = app.state::<AppState>().open_database()?;
        let mut statement = connection
            .prepare("SELECT reason, payload FROM user_data_recovery ORDER BY id DESC")
            .map_err(display_error)?;
        statement
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(display_error)?
            .map(|row| {
                let (reason, payload) = row.map_err(display_error)?;
                Ok(RecoverySnapshot {
                    reason,
                    snapshot: serde_json::from_str(&payload).map_err(display_error)?,
                })
            })
            .collect()
    })
    .await
    .map_err(display_error)?
}

#[cfg(test)]
mod tests {
    use super::*;
    fn request(revision: u64, title: &str) -> UserDataCommit {
        UserDataCommit {
            expected_revision: revision,
            records: BTreeMap::from([(
                "void-settings-store".into(),
                format!(r#"{{"state":{{"title":"{title}"}},"version":0}}"#),
            )]),
            migration: None,
            recovery_reason: None,
            catalog: None,
        }
    }
    #[test]
    fn snapshots_reject_stale_writers_and_preserve_migration_receipts() {
        let mut db = Connection::open_in_memory().unwrap();
        initialize(&db).unwrap();
        let mut first = request(0, "legacy");
        first.migration = Some(MigrationReceipt {
            id: "legacy-0.3.2".into(),
            origin: "http://tauri.localhost".into(),
            created_at: 1,
        });
        let saved = commit(&mut db, first).unwrap();
        assert!(commit(&mut db, request(0, "stale")).is_err());
        assert_eq!(load(&db).unwrap(), Some(saved.clone()));
        let mut imported = request(1, "imported");
        imported.recovery_reason = Some("import".into());
        let updated = commit(&mut db, imported).unwrap();
        assert_eq!(updated.migration, saved.migration);
        assert_eq!(
            db.query_row("SELECT COUNT(*) FROM user_data_recovery", [], |r| r
                .get::<_, u32>(0))
                .unwrap(),
            2
        );
        assert!(
            commit(
                &mut db,
                UserDataCommit {
                    migration: saved.migration,
                    ..request(2, "repeat-migration")
                }
            )
            .is_err()
        );
    }
    #[test]
    fn unknown_or_corrupt_data_is_not_overwritten() {
        let mut db = Connection::open_in_memory().unwrap();
        initialize(&db).unwrap();
        db.execute(
            "INSERT INTO user_data VALUES (1, ?1)",
            [r#"{"schemaVersion":99,"revision":1,"records":{},"migration":null}"#],
        )
        .unwrap();
        assert!(load(&db).is_err());
        assert!(commit(&mut db, request(1, "replacement")).is_err());
        db.execute("UPDATE user_data SET payload = 'broken'", [])
            .unwrap();
        assert!(load(&db).is_err());
        assert!(commit(&mut db, request(0, "replacement")).is_err());
    }
    #[test]
    fn failed_recovery_snapshot_rolls_back_import() {
        let mut db = Connection::open_in_memory().unwrap();
        initialize(&db).unwrap();
        let original = commit(&mut db, request(0, "original")).unwrap();
        db.execute_batch("CREATE TRIGGER fail_backup BEFORE INSERT ON user_data_recovery BEGIN SELECT RAISE(ABORT, 'disk failure'); END;").unwrap();
        let mut imported = request(1, "new");
        imported.recovery_reason = Some("import".into());
        assert!(commit(&mut db, imported).is_err());
        assert_eq!(load(&db).unwrap(), Some(original));
    }
    #[test]
    fn failed_catalog_write_rolls_back_personal_data_and_success_commits_both() {
        let mut db = Connection::open_in_memory().unwrap();
        initialize(&db).unwrap();
        db.execute_batch("CREATE TABLE media_catalogs(library_id TEXT PRIMARY KEY, root_path TEXT, saved_at INTEGER, payload TEXT);").unwrap();
        let original = commit(&mut db, request(0, "before")).unwrap();
        let make = || {
            let mut next = request(1, "after");
            next.catalog = Some(crate::model::NativeCatalog {
                version: 1,
                library_id: "library".into(),
                root_path: "root".into(),
                saved_at: 1,
                assets: vec![],
            });
            next
        };
        db.execute_batch("CREATE TRIGGER fail_catalog BEFORE INSERT ON media_catalogs BEGIN SELECT RAISE(ABORT, 'disk full'); END;").unwrap();
        assert!(commit(&mut db, make()).is_err());
        assert_eq!(load(&db).unwrap(), Some(original));
        assert!(crate::catalog::load(&db, "library").unwrap().is_none());
        db.execute_batch("DROP TRIGGER fail_catalog;").unwrap();
        assert_eq!(commit(&mut db, make()).unwrap().revision, 2);
        assert!(crate::catalog::load(&db, "library").unwrap().is_some());
    }
}
