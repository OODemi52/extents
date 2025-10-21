use crate::renderer::{RenderState, Renderer};
use crate::state::AppState;
use log::{error, info, warn};
use std::time::Instant;
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
    info!("Renderer initialized, performing first render.");
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
pub fn load_image(path: String, state: State<AppState>) {
    info!("[CMD] Loading image from path: {}", path);

    // Load and decode image
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

    // Update renderer texture
    let mut renderer_lock = state.renderer.lock().unwrap();
    if let Some(renderer) = renderer_lock.as_mut() {
        info!("[CMD] Updating texture and rendering");
        renderer.update_texture(&rgba, width, height);
        renderer.render();
        info!("[CMD] Image load complete");
    } else {
        warn!("[CMD] Renderer not initialized, cannot load image");
    }
}

#[tauri::command]
pub fn update_viewport(x: f32, y: f32, width: f32, height: f32, state: State<AppState>) {
    let mut renderer_lock = state.renderer.lock().unwrap();
    if let Some(renderer) = renderer_lock.as_mut() {
        // Update viewport in a nested scope to release the lock
        {
            let mut viewport = renderer.viewport.lock().unwrap();
            viewport.x = x as u32;
            viewport.y = y as u32;
            viewport.width = width as u32;
            viewport.height = height as u32;
        }

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
        renderer.last_render = Instant::now(); // Update the timestamp
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
