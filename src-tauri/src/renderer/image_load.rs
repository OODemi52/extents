use std::sync::{Arc, Mutex};

use log::{error, info};
use tauri::async_runtime;

use super::renderer::Renderer;
use super::renderer_input::RendererInput;
use super::renderer_input::{build_renderer_input_from_path, set_renderer_input};

/// Builds renderer input from a path and sets it only if the request is still active.
pub(crate) fn set_requested_renderer_input_from_path(
    path: &str,
    request_id: u64,
    renderer_handle: &Arc<Mutex<Option<Renderer>>>,
) -> Result<(), String> {
    let renderer_input = match build_renderer_input_from_path(path) {
        Ok(renderer_input) => renderer_input,
        Err(error) => return Err(error.to_string()),
    };

    set_renderer_input_for_active_request(renderer_handle, request_id, renderer_input);

    Ok(())
}

/// Builds and swaps a requested proxy renderer input if the request is still active.
pub(crate) async fn swap_requested_renderer_input(
    path: String,
    request_id: u64,
    renderer_handle: Arc<Mutex<Option<Renderer>>>,
) -> Result<(), String> {
    let renderer_input_result =
        async_runtime::spawn_blocking(move || build_renderer_input_from_path(&path)).await;

    let renderer_input = match renderer_input_result {
        Ok(Ok(renderer_input)) => renderer_input,
        Ok(Err(error)) => return Err(error.to_string()),
        Err(join_error) => {
            return Err(format!(
                "Proxy texture decode task panicked: {:?}",
                join_error
            ));
        }
    };

    set_renderer_input_for_active_request(&renderer_handle, request_id, renderer_input);

    Ok(())
}

/// Spawns a full-image load task and applies it if the request is still active.
///
/// This owns the async execution flow for full-resolution renderer input:
/// build renderer input off the main async task, reject stale requests, set the
/// renderer input, render, and mark the request complete.
pub(crate) fn spawn_full_image_load(
    path: String,
    request_id: u64,
    renderer_handle: Arc<Mutex<Option<Renderer>>>,
) {
    let renderer_for_task = renderer_handle.clone();
    let cloned_path_for_logging = path.clone();

    info!(
        "[Renderer] Starting full image load request {} path {}",
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
            Ok(Err(error)) => {
                error!(
                    "[Renderer] Failed to load full image {}: {}",
                    cloned_path_for_logging,
                    error.to_string()
                );

                let mut renderer_lock = renderer_for_task.lock().unwrap();
                if let Some(renderer) = renderer_lock.as_mut() {
                    renderer.complete_image_request(request_id);
                }
            }
            Err(join_error) => {
                error!(
                    "[Renderer] Full image load task panicked for {}: {:?}",
                    cloned_path_for_logging, join_error
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

fn set_renderer_input_for_active_request(
    renderer_handle: &Arc<Mutex<Option<Renderer>>>,
    request_id: u64,
    renderer_input: RendererInput,
) {
    let mut renderer_lock = renderer_handle.lock().unwrap();

    if let Some(renderer) = renderer_lock.as_mut() {
        if renderer.is_request_active(request_id) {
            set_renderer_input(renderer, renderer_input);
            renderer.render();
        }
    }
}
