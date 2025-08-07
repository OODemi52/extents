pub mod commands;
use rusqlite::Connection;
use std::sync::{Arc, Mutex};
use tauri::Manager;
use window_vibrancy::*;

use crate::commands::db::init_db;

#[derive(Clone)]
pub struct DbState {
    pub connection: Arc<Mutex<Connection>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = Arc::new(Mutex::new(
        init_db().expect("Failed to initialize Extents database"),
    ));

    tauri::Builder::default()
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            app.manage(DbState {
                connection: db.clone(),
            });

            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "macos")]
            apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)
                .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");

            #[cfg(target_os = "windows")]
            apply_blur(&window, Some((18, 18, 18, 125)))
                .expect("Unsupported platform! 'apply_blur' is only supported on Windows");

            Ok(())
        })
        // Plugin setup
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        // Handler unction invocations
        .invoke_handler(tauri::generate_handler![
            commands::scanner::scan_folders,
            commands::file::get_file,
            commands::file::get_thumbnail_path,
            commands::file::get_file_metadata,
            commands::file::get_thumbnail
        ])
        // Running the application
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
