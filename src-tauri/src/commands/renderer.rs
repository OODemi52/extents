use crate::renderer::{
    build_renderer_input_from_path, set_renderer_input, set_renderer_input_from_path, RenderState,
    Renderer,
};
use crate::state::AppState;
use log::{error, info, warn};
use std::sync::Arc;
use std::time::Instant;
use tauri::async_runtime;
use tauri::State;

const DEBUG_VIEW_MAX: u32 = 11;

#[tauri::command]
pub fn init_renderer(state: State<AppState>) -> Result<(), String> {
    let mut renderer_lock = state.renderer.lock().unwrap();
    if renderer_lock.is_some() {
        warn!("Renderer already initialized.");
        return Ok(());
    }

    info!("Initializing renderer...");

    let window = state.window.clone();

    let mut renderer = match Renderer::new(window) {
        Ok(renderer) => renderer,
        Err(error) => return Err(error.to_string()),
    };

    renderer.render();

    *renderer_lock = Some(renderer);

    Ok(())
}

#[tauri::command]
pub fn resize_surface(width: u32, height: u32, state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();

    if let Some(renderer) = renderer_lock.as_mut() {
        renderer.resize(width, height);
    }
}

#[tauri::command]
pub fn set_debug_view(debug_view: u32, state: State<AppState>) -> Result<(), String> {
    if debug_view > DEBUG_VIEW_MAX {
        return Err(format!("Unsupported debug view: {debug_view}"));
    }

    let mut renderer_lock = state.renderer.lock().unwrap();

    if let Some(renderer) = renderer_lock.as_mut() {
        renderer.update_debug_view(debug_view);
        renderer.render();

        return Ok(());
    }

    Err("Renderer not initialized".to_string())
}

#[tauri::command]
pub fn load_image(
    path: String,
    preview_path: Option<String>,
    viewport_x: u32,
    viewport_y: u32,
    viewport_width: u32,
    viewport_height: u32,
    defer_full_image_load: Option<bool>,
    state: State<AppState>,
) -> Result<u64, String> {
    info!("[CMD] Loading image from path: {}", path);
    let defer_full = defer_full_image_load.unwrap_or(false);
    let preview_label = preview_path.as_deref().unwrap_or("<none>");

    let renderer_handle = state.renderer.clone();

    let request_id = {
        let mut renderer_lock = renderer_handle.lock().unwrap();
        if let Some(renderer) = renderer_lock.as_mut() {
            renderer.update_proxy_viewport(
                viewport_x as f32,
                viewport_y as f32,
                viewport_width as f32,
                viewport_height as f32,
            );

            let request_id = renderer.begin_image_request();
            info!(
                "[CMD] Image request {} defer_full={} preview={}",
                request_id, defer_full, preview_label
            );

            if let Some(preview_path) = preview_path {
                if let Err(err) = set_renderer_input_from_path(renderer, &preview_path) {
                    warn!(
                        "[CMD] Failed to load preview texture from {}: {}",
                        preview_path, err
                    );
                } else {
                    renderer.render();
                }
            }

            request_id
        } else {
            return Err("Renderer not initialized".to_string());
        }
    };

    if !defer_full {
        spawn_full_image_load(path, request_id, renderer_handle.clone());
    } else {
        info!("[CMD] Deferring full decode for request {}", request_id);
    }

    Ok(request_id)
}

#[tauri::command]
pub fn start_full_image_load(
    path: String,
    request_id: u64,
    state: State<AppState>,
) -> Result<(), String> {
    info!(
        "[CMD] start_full_image_load request {} path {}",
        request_id, path
    );
    let renderer_handle = state.renderer.clone();

    let should_start = {
        let renderer_lock = renderer_handle.lock().unwrap();
        let renderer = match renderer_lock.as_ref() {
            Some(renderer) => renderer,
            None => return Err("Renderer not initialized".to_string()),
        };

        renderer.is_request_active(request_id)
    };

    if !should_start {
        info!(
            "[CMD] start_full_image_load skipped (inactive request {})",
            request_id
        );
        return Ok(());
    }

    spawn_full_image_load(path, request_id, renderer_handle);

    Ok(())
}

// TODO: Move full-image task orchestration behind a renderer/session boundary.
fn spawn_full_image_load(
    path: String,
    request_id: u64,
    renderer_handle: Arc<std::sync::Mutex<Option<Renderer>>>,
) {
    let renderer_for_task = renderer_handle.clone();
    let cloned_path_for_logging = path.clone();
    info!(
        "[CMD] Starting full decode request {} path {}",
        request_id, cloned_path_for_logging
    );

    let join_handle = async_runtime::spawn(async move {
        let renderer_input_result =
            async_runtime::spawn_blocking(move || build_renderer_input_from_path(&path)).await;

        match renderer_input_result {
            Ok(Ok(renderer_input)) => {
                let mut renderer_lock = renderer_for_task.lock().unwrap();

                if let Some(renderer) = renderer_lock.as_mut() {
                    if renderer.is_request_active(request_id) {
                        set_renderer_input(renderer, renderer_input);
                        renderer.render();
                        renderer.complete_image_request(request_id);
                    }
                }
            }
            Ok(Err(err)) => {
                error!(
                    "[CMD] Failed to decode full image {}: {}",
                    cloned_path_for_logging,
                    err.to_string()
                );

                let mut renderer_lock = renderer_for_task.lock().unwrap();
                if let Some(renderer) = renderer_lock.as_mut() {
                    renderer.complete_image_request(request_id);
                }
            }
            Err(join_err) => {
                error!(
                    "[CMD] Image decode task panicked for {}: {:?}",
                    cloned_path_for_logging, join_err
                );

                let mut renderer_lock = renderer_for_task.lock().unwrap();
                if let Some(renderer) = renderer_lock.as_mut() {
                    renderer.complete_image_request(request_id);
                }
            }
        }
    });

    let mut renderer_lock = renderer_handle.lock().unwrap();
    if let Some(renderer) = renderer_lock.as_mut() {
        renderer.attach_load_handle(request_id, join_handle);
    }
}

#[tauri::command]
pub async fn swap_requested_texture(
    path: String,
    request_id: u64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    info!(
        "[CMD] swap_requested_texture request {} path {}",
        request_id, path
    );
    let renderer_handle = state.renderer.clone();

    let renderer_input_result =
        async_runtime::spawn_blocking(move || build_renderer_input_from_path(&path)).await;

    match renderer_input_result {
        Ok(Ok(renderer_input)) => {
            let mut renderer_lock = renderer_handle.lock().unwrap();
            if let Some(renderer) = renderer_lock.as_mut() {
                if renderer.is_request_active(request_id) {
                    set_renderer_input(renderer, renderer_input);
                    renderer.render();
                }
            }

            Ok(())
        }
        Ok(Err(err)) => Err(err.to_string()),
        Err(join_err) => Err(format!(
            "Proxy texture decode task panicked: {:?}",
            join_err
        )),
    }
}

#[tauri::command]
pub fn update_viewport(x: f32, y: f32, width: f32, height: f32, state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();

    if let Some(renderer) = renderer_lock.as_mut() {
        renderer.update_proxy_viewport(x, y, width, height);

        renderer.update_vertices();
    }
}

#[tauri::command]
pub fn update_transform(scale: f32, offset_x: f32, offset_y: f32, state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();

    if let Some(renderer) = renderer_lock.as_mut() {
        renderer.update_transform(scale, offset_x, offset_y);

        renderer.render();
    }
}

#[tauri::command]
pub fn should_render_frame(state: State<AppState>) -> bool {
    if let Some(renderer) = state.renderer.lock().unwrap().as_ref() {
        renderer.should_render()
    } else {
        false
    }
}

#[tauri::command]
pub fn render_frame(state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();

    if let Some(renderer) = renderer_lock.as_mut() {
        renderer.render();
        renderer.last_render = Instant::now();
    }
}

#[tauri::command]
pub fn clear_renderer(state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();

    if let Some(renderer) = renderer_lock.as_mut() {
        renderer.clear();
    }
}

#[tauri::command]
pub fn set_render_state(state_str: String, state: State<AppState>) {
    if let Some(renderer) = state.renderer.lock().unwrap().as_mut() {
        println!("Render state changed to: {}", state_str);

        renderer.render_state = match state_str.as_str() {
            "active" => RenderState::Active,
            "idle" => RenderState::Idle,
            "paused" => RenderState::Paused,
            _ => RenderState::Idle,
        };
    }
}
