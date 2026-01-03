use crate::core::image::decode_full_image;
use crate::renderer::{RenderState, Renderer};
use crate::state::AppState;
use anyhow::Result;
use log::{error, info, warn};
use std::time::Instant;
use tauri::async_runtime;
use tauri::{State, WebviewWindow};

#[tauri::command]
pub fn init_renderer(state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();
    if renderer_lock.is_some() {
        warn!("Renderer already initialized.");
        return;
    }

    info!("Initializing renderer...");

    // SAFETY: This transmute extends the lifetime of the window reference.
    // This is safe because:
    // 1. The window is owned by AppState which lives for the entire app lifetime
    // 2. The renderer is also owned by AppState and will be dropped before the window
    // 3. We never access the window after the app is closed
    let window_ref: &'static WebviewWindow = unsafe { std::mem::transmute(&state.window) };

    *renderer_lock = Some(Renderer::new(window_ref));

    renderer_lock.as_mut().unwrap().render();
}

#[tauri::command]
pub fn resize_surface(width: u32, height: u32, state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();

    if let Some(renderer) = renderer_lock.as_mut() {
        renderer.resize(width, height);
    }
}

#[tauri::command]
pub fn load_image(
    path: String,
    preview_path: Option<String>,
    viewport_x: u32,
    viewport_y: u32,
    viewport_width: u32,
    viewport_height: u32,
    state: State<AppState>,
) -> Result<u64, String> {
    info!("[CMD] Loading image from path: {}", path);

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

            if let Some(preview_path) = preview_path {
                if let Err(err) = load_texture_from_path(renderer, &preview_path) {
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

    let full_path = path.clone();
    let renderer_for_task = renderer_handle.clone();

    let join_handle = async_runtime::spawn(async move {
        let decode_result =
            async_runtime::spawn_blocking(move || decode_full_image(&full_path)).await;

        match decode_result {
            Ok(Ok((rgba, width, height))) => {
                let mut renderer_lock = renderer_for_task.lock().unwrap();

                if let Some(renderer) = renderer_lock.as_mut() {
                    if renderer.is_request_active(request_id) {
                        let has_alpha = rgba.chunks_exact(4).any(|pixel| pixel[3] < 255);

                        renderer.display_checkboard(has_alpha);
                        renderer.update_texture(&rgba, width, height);

                        renderer.render();

                        renderer.complete_image_request(request_id);
                    }
                }
            }
            Ok(Err(err)) => {
                error!(
                    "[CMD] Failed to decode full image {}: {}",
                    path,
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
                    path, join_err
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

    Ok(request_id)
}

fn load_texture_from_path(renderer: &mut Renderer, path: &str) -> Result<()> {
    let (raw, width, height) = decode_full_image(path)?;

    let has_alpha = raw.chunks_exact(4).any(|pixel| pixel[3] < 255);

    renderer.display_checkboard(has_alpha);

    renderer.update_texture(&raw, width, height);

    Ok(())
}

#[tauri::command]
pub async fn swap_requested_texture(
    path: String,
    request_id: u64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let renderer_handle = state.renderer.clone();

    let decode_result =
        async_runtime::spawn_blocking(move || decode_full_image(&path)).await;

    match decode_result {
        Ok(Ok((raw, width, height))) => {
            let mut renderer_lock = renderer_handle.lock().unwrap();
            if let Some(renderer) = renderer_lock.as_mut() {
                if renderer.is_request_active(request_id) {
                    let has_alpha = raw.chunks_exact(4).any(|pixel| pixel[3] < 255);

                    renderer.display_checkboard(has_alpha);
                    renderer.update_texture(&raw, width, height);
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
