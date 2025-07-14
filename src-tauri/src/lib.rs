pub mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        // Plugin setup
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        // Handler unction invocations
        .invoke_handler(tauri::generate_handler![
            commands::file::get_file,
            commands::file::get_thumbnail_path,
            commands::file::get_file_metadata,
            commands::file::get_thumbnail
        ])
        // Running the application
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
