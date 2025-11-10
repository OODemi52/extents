use crate::renderer::{RenderState, Renderer};
use crate::state::AppState;
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
) {
    info!("[CMD] Loading image from path: {}", path);

    let renderer_handle = state.renderer.clone();

    {
        let mut renderer_lock = renderer_handle.lock().unwrap();

        if let Some(renderer) = renderer_lock.as_mut() {
            renderer.update_proxy_viewport(
                viewport_x as f32,
                viewport_y as f32,
                viewport_width as f32,
                viewport_height as f32,
            );

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
        } else {
            return;
        }
    }

    let full_path = path.clone();

    async_runtime::spawn(async move {
        let decode_result = async_runtime::spawn_blocking(move || {
            image::open(&full_path).map(|img| {
                let width = img.width();

                let height = img.height();

                let rgba = img.into_rgba8().into_raw();

                (rgba, width, height)
            })
        })
        .await;

        match decode_result {
            Ok(Ok((rgba, width, height))) => {
                let mut renderer_lock = renderer_handle.lock().unwrap();

                if let Some(renderer) = renderer_lock.as_mut() {
                    renderer.update_texture(&rgba, width, height);

                    renderer.render();
                }
            }
            Ok(Err(err)) => {
                error!(
                    "[CMD] Failed to decode full image {}: {}",
                    path,
                    err.to_string()
                );
            }
            Err(join_err) => {
                error!(
                    "[CMD] Image decode task panicked for {}: {:?}",
                    path, join_err
                );
            }
        }
    });
}

fn load_texture_from_path(
    renderer: &mut Renderer,
    path: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let image = image::open(path)?;

    let rgba = image.into_rgba8();

    let (width, height) = rgba.dimensions();

    let raw = rgba.into_raw();

    renderer.update_texture(&raw, width, height);

    Ok(())
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
