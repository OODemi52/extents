use crate::renderer::{InspectionSnapshot, RenderState, RendererManager};
use crate::state::AppState;
use log::{info, warn};
use tauri::State;

#[tauri::command]
pub fn init_renderer(state: State<AppState>) -> Result<(), String> {
    let window = state.window.clone();
    let mut manager = RendererManager::lock(&state.renderer_manager)?;

    manager.init_renderer(window)
}

#[tauri::command]
pub fn resize_surface(width: u32, height: u32, state: State<AppState>) {
    match RendererManager::lock(&state.renderer_manager) {
        Ok(mut manager) => manager.resize_surface(width, height),
        Err(error) => warn!("{error}"),
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
    defer_full_image_load: Option<bool>,
    state: State<AppState>,
) -> Result<u64, String> {
    info!("[CMD] Loading image from path: {}", path);
    let defer_full = defer_full_image_load.unwrap_or(false);

    RendererManager::load_image(
        state.renderer_manager.clone(),
        path,
        preview_path,
        viewport_x,
        viewport_y,
        viewport_width,
        viewport_height,
        defer_full,
    )
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
    RendererManager::start_full_image_load(state.renderer_manager.clone(), path, request_id)
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
    RendererManager::swap_requested_texture(state.renderer_manager.clone(), path, request_id).await
}

#[tauri::command]
pub fn update_viewport(x: f32, y: f32, width: f32, height: f32, state: State<AppState>) {
    match RendererManager::lock(&state.renderer_manager) {
        Ok(mut manager) => manager.update_viewport(x, y, width, height),
        Err(error) => warn!("{error}"),
    }
}

#[tauri::command]
pub fn update_transform(scale: f32, offset_x: f32, offset_y: f32, state: State<AppState>) {
    match RendererManager::lock(&state.renderer_manager) {
        Ok(mut manager) => manager.update_transform(scale, offset_x, offset_y),
        Err(error) => warn!("{error}"),
    }
}

#[tauri::command]
pub fn should_render_frame(state: State<AppState>) -> bool {
    match RendererManager::lock(&state.renderer_manager) {
        Ok(manager) => manager.should_render_frame(),
        Err(error) => {
            warn!("{error}");
            false
        }
    }
}

#[tauri::command]
pub fn render_frame(state: State<AppState>) {
    match RendererManager::lock(&state.renderer_manager) {
        Ok(mut manager) => manager.render_frame(),
        Err(error) => warn!("{error}"),
    }
}

#[tauri::command]
pub fn clear_renderer(state: State<AppState>) {
    match RendererManager::lock(&state.renderer_manager) {
        Ok(mut manager) => manager.clear_renderer(),
        Err(error) => warn!("{error}"),
    }
}

#[tauri::command]
pub fn set_render_state(state_str: String, state: State<AppState>) {
    let render_state = match state_str.as_str() {
        "active" => RenderState::Active,
        "idle" => RenderState::Idle,
        "paused" => RenderState::Paused,
        _ => RenderState::Idle,
    };

    match RendererManager::lock(&state.renderer_manager) {
        Ok(mut manager) => manager.set_render_state(render_state),
        Err(error) => warn!("{error}"),
    }
}

#[tauri::command]
pub fn get_renderer_inspection(
    state: State<AppState>,
) -> Result<Option<InspectionSnapshot>, String> {
    let manager = RendererManager::lock(&state.renderer_manager)?;

    Ok(manager.inspection_snapshot())
}
