pub mod commands;
pub mod renderer;
pub mod state;

use crate::commands::db::DbConnection;
use crate::state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let window = app.get_webview_window("main").unwrap();
            let db =
                DbConnection::init_db_connection().expect("Failed to initialize Extents database");

            // Uncomment for platform-specific window effects
            // #[cfg(target_os = "macos")]
            // window_vibrancy::apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)
            //     .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");

            // #[cfg(target_os = "windows")]
            // window_vibrancy::apply_blur(&window, Some((18, 18, 18, 125)))
            //     .expect("Unsupported platform! 'apply_blur' is only supported on Windows");

            let state = AppState::new(db, window);
            app.manage(state);

            Ok(())
        })
        // Plugin setup
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        // Handler function invocations
        .invoke_handler(tauri::generate_handler![
            commands::scanner::build_fs_tree,
            commands::file::get_file,
            commands::file::get_thumbnail_path,
            commands::file::get_file_metadata,
            commands::file::get_thumbnail,
            commands::renderer::init_renderer,
            commands::renderer::load_image,
            commands::renderer::update_viewport,
            commands::renderer::update_transform,
        ])
        // Running the application
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
