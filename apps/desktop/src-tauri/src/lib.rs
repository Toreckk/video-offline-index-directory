mod catalog;
mod commands;
mod model;
mod state;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let app_cache_dir = app.path().app_cache_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            std::fs::create_dir_all(&app_cache_dir)?;

            let state = AppState::new(
                app_data_dir.join("void-catalog.db"),
                app_cache_dir.join("thumbnails"),
            )?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::select_library,
            commands::scan_library,
            commands::load_catalog,
            commands::save_catalog,
            commands::delete_catalog,
            commands::read_thumbnail,
            commands::write_thumbnail,
            commands::clear_thumbnail_cache,
            commands::reveal_file,
            commands::hash_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running V.O.I.D.");
}
