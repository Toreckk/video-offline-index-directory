mod catalog;
mod commands;
mod file_identity;
mod media_probe;
mod model;
mod safe_cleanup;
mod state;
mod user_data;
mod watcher;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let app_cache_dir = app.path().app_cache_dir()?;
            let app_data_dir = if cfg!(debug_assertions) {
                app_data_dir.join("development")
            } else {
                app_data_dir
            };
            let app_cache_dir = if cfg!(debug_assertions) {
                app_cache_dir.join("development")
            } else {
                app_cache_dir
            };
            if let Err(error) = std::fs::create_dir_all(&app_data_dir) {
                eprintln!("User-data directory is unavailable: {error}");
            }
            if let Err(error) = std::fs::create_dir_all(&app_cache_dir) {
                eprintln!("Cache directory is unavailable: {error}");
            }

            let state = AppState::new(
                app_data_dir.join("void-catalog.db"),
                app_cache_dir.join("thumbnails"),
            )?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::select_library,
            user_data::load_user_data,
            user_data::commit_user_data,
            user_data::user_data_recovery,
            user_data::raw_user_data,
            commands::restore_library,
            commands::scan_library,
            watcher::start_library_watch,
            watcher::stop_library_watch,
            commands::load_catalog,
            commands::save_catalog,
            commands::delete_catalog,
            commands::read_thumbnail,
            commands::write_thumbnail,
            commands::clear_thumbnail_cache,
            commands::reveal_file,
            commands::hash_file,
            commands::cleanup_duplicate_files,
            media_probe::media_probe_status,
            media_probe::probe_media,
            media_probe::cancel_media_probe,
        ])
        .run(tauri::generate_context!())
        .expect("error while running VOID");
}
