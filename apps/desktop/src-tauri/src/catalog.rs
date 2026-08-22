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
