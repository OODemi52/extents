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

            let state = AppState::new(db, window.clone());

            app.manage(state);

            let app_state = app.state::<AppState>();

            let renderer = app_state.renderer.clone();

            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Resized(size) = event {
                    let mut renderer_lock = renderer.lock().unwrap();
                    if let Some(renderer) = renderer_lock.as_mut() {
                        renderer.resize(size.width, size.height);
                    }
                }
            });

            Ok(())
        })
        // Plugin setup
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        // Handler function invocations
        .invoke_handler(tauri::generate_handler![
            //Scanner Commands
            commands::scanner::build_fs_tree,
            // File System Commands
            commands::file::get_file,
            commands::file::get_thumbnail_path,
            commands::file::get_file_metadata,
            commands::file::get_thumbnail,
            // WGPU Renderer Commands
            commands::renderer::init_renderer,
            commands::renderer::load_image,
            commands::renderer::update_viewport,
            commands::renderer::update_transform,
            commands::renderer::resize_surface,
            commands::renderer::should_render_frame,
            commands::renderer::render_frame,
            commands::renderer::set_render_state,
        ])
        // Running the application
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
