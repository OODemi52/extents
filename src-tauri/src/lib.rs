pub mod commands;
pub mod renderer;
pub mod state;

use crate::commands::db::DbConnection;
use crate::renderer::Renderer;
use crate::state::AppState;
use log::{error, info, warn};
use tauri::{Manager, State, WebviewWindow};
use window_vibrancy::*;

#[tauri::command]
fn init_renderer(state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();
    if renderer_lock.is_some() {
        warn!("Renderer already initialized.");
        return;
    }

    info!("Initializing renderer...");
    let window_ref: &'static WebviewWindow = unsafe { std::mem::transmute(&state.window) };

    *renderer_lock = Some(Renderer::new(window_ref));
    info!("Renderer initialized, performing first render.");
    renderer_lock.as_mut().unwrap().render();
}

#[tauri::command]
fn load_image(path: String, state: State<AppState>) {
    info!("[CMD] Entering load_image with path: {}", path);
    let img = match image::open(&path) {
        Ok(img) => img,
        Err(e) => {
            error!("[CMD] Failed to open image at {}: {}", path, e);
            return;
        }
    };
    let rgba = img.to_rgba8();
    let width = img.width();
    let height = img.height();
    info!("[CMD] Image decoded ({}x{})", width, height);

    let mut renderer_lock = state.renderer.lock().unwrap();
    if let Some(renderer) = renderer_lock.as_mut() {
        info!("[CMD] Calling renderer.update_texture");
        renderer.update_texture(&rgba, width, height);
        info!("[CMD] Calling renderer.render");
        renderer.render();
        info!("[CMD] load_image command finished.");
    } else {
        warn!("[CMD] Renderer not initialized, cannot load image.");
    }
}

#[tauri::command]
fn update_viewport(x: f32, y: f32, width: f32, height: f32, state: State<AppState>) {
    if let Some(renderer) = state.renderer.lock().unwrap().as_mut() {
        // Create a new scope for the viewport lock
        {
            let mut viewport = renderer.viewport.lock().unwrap();
            viewport.x = x as u32;
            viewport.y = y as u32;
            viewport.width = width as u32;
            viewport.height = height as u32;
        } // The lock on the viewport is released here as the guard goes out of scope

        // Now we can safely borrow the renderer again to call render()
        renderer.render();
    }
}

#[tauri::command]
fn update_transform(scale: f32, offset_x: f32, offset_y: f32, state: State<AppState>) {
    if let Some(renderer) = state.renderer.lock().unwrap().as_mut() {
        renderer.update_transform(scale, offset_x, offset_y);
        renderer.render();
    }
}

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

            // #[cfg(target_os = "macos")]
            // apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)
            //     .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");

            // #[cfg(target_os = "windows")]
            // apply_blur(&window, Some((18, 18, 18, 125)))
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
            init_renderer,
            load_image,
            update_viewport,
            update_transform
        ])
        // Running the application
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
