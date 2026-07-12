pub mod app;
pub mod commands;
pub mod core;
pub mod renderer;

use crate::app::{show_main_window, AppState};
use crate::core::cache::manager::CacheManager;
use crate::core::db::connection::DbConnection;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
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
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::POSITION
                        | tauri_plugin_window_state::StateFlags::MAXIMIZED
                        | tauri_plugin_window_state::StateFlags::FULLSCREEN,
                )
                .build(),
        )
        .setup(move |app| {
            let cache_manager = CacheManager::new(&app.handle());

            app.manage(cache_manager);

            let window = match app.get_webview_window("main") {
                Some(window) => window,
                None => {
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::NotFound,
                        "main webview window not found",
                    )
                    .into());
                }
            };

            let db =
                DbConnection::init_db_connection().expect("Failed to initialize Extents database");

            let state = AppState::new(db, window.clone());

            app.manage(state);

            let app_state = app.state::<AppState>();

            let renderer_manager = app_state.renderer_manager.clone();

            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Resized(size) = event {
                    match crate::renderer::RendererManager::lock(&renderer_manager) {
                        Ok(mut manager) => manager.resize_surface(size.width, size.height),
                        Err(error) => log::warn!("{error}"),
                    }
                }
            });

            match show_main_window(&window) {
                Ok(()) => {}
                Err(error) => return Err(error.into()),
            }

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
            commands::renderer::get_renderer_inspection,
            // Inspection Commands
            commands::inspection::capture_inspection_checkpoint_artifact,
            commands::inspection::create_inspection_checkpoint_set,
            commands::inspection::delete_all_inspection_checkpoints,
            commands::inspection::delete_inspection_checkpoint,
            commands::inspection::delete_inspection_checkpoints_for_source,
            commands::inspection::list_inspection_checkpoints,
            commands::inspection::list_inspection_checkpoints_for_source,
            // Annotation Commands
            commands::annotations::set_ratings,
            commands::annotations::set_flags,
            commands::annotations::get_annotations,
            // Exif Commands
            commands::exif::get_exif_metadata,
            // Settings Commands
            commands::settings::get_cache_size,
            commands::settings::clear_cache,
            // Sidecar Commands
            commands::sidecar::load_sidecar,
            commands::sidecar::save_sidecar,
            commands::sidecar::sync_sidecar,
        ])
        // Running the application
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
