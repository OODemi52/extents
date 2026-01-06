pub mod commands;
pub mod core;
pub mod renderer;
pub mod state;

use crate::core::cache::manager::CacheManager;
use crate::core::db::connection::DbConnection;
use crate::state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.show();
                let _ = main_window.set_focus();
            }
        }))
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(move |app| {
            let cache_manager = CacheManager::new(&app.handle());

            app.manage(cache_manager);

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
            commands::scanner::get_children_dir_paths,
            commands::scanner::get_home_dir,
            // File System Commands
            commands::file::get_file,
            commands::file::get_file_metadata,
            commands::file::start_folder_scan,
            // Image Commands
            commands::image::get_thumbnail,
            commands::image::prepare_preview,
            commands::image::prefetch_thumbnails,
            commands::image::get_histogram,
            // WGPU Renderer Commands
            commands::renderer::init_renderer,
            commands::renderer::load_image,
            commands::renderer::start_full_image_load,
            commands::renderer::swap_requested_texture,
            commands::renderer::update_viewport,
            commands::renderer::update_transform,
            commands::renderer::resize_surface,
            commands::renderer::should_render_frame,
            commands::renderer::render_frame,
            commands::renderer::clear_renderer,
            commands::renderer::set_render_state,
            // Annotation Commands
            commands::annotations::set_ratings,
            commands::annotations::set_flags,
            commands::annotations::get_annotations,
            // Exif Commands
            commands::exif::get_exif_metadata,
        ])
        // Running the application
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
