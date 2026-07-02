use std::time::Instant;

use log::{error, info};
use tauri::async_runtime;

use super::input::build_input_from_path;
use super::input::Input;
use super::manager::{RendererManager, RendererManagerHandle};

/// Builds input from a path and sets it only if the request is still active.
pub(crate) fn set_requested_input_from_path(
    path: &str,
    request_id: u64,
    renderer_manager: &RendererManagerHandle,
) -> Result<(), String> {
    let build_start = Instant::now();

    let input = match build_input_from_path(path) {
        Ok(input) => input,
        Err(error) => return Err(error.to_string()),
    };
    let input_build_ms = elapsed_ms(build_start);

    set_input_for_active_request(renderer_manager, request_id, input, Some(input_build_ms));

    Ok(())
}

/// Builds and swaps a requested proxy input if the request is still active.
pub(crate) async fn swap_requested_input(
    path: String,
    request_id: u64,
    renderer_manager: RendererManagerHandle,
) -> Result<(), String> {
    let input_result = async_runtime::spawn_blocking(move || {
        let build_start = Instant::now();

        build_input_from_path(&path).map(|input| (input, elapsed_ms(build_start)))
    })
    .await;

    let (input, input_build_ms) = match input_result {
        Ok(Ok(input)) => input,
        Ok(Err(error)) => return Err(error.to_string()),
        Err(join_error) => {
            return Err(format!(
                "Proxy texture decode task panicked: {:?}",
                join_error
            ));
        }
    };

    set_input_for_active_request(&renderer_manager, request_id, input, Some(input_build_ms));

    Ok(())
}

/// Spawns a full-image load task and applies it if the request is still active.
///
/// This owns the async execution flow for full-resolution input:
/// build input off the main async task, reject stale requests, set the input,
/// render, and mark the request complete.
pub(crate) fn spawn_full_image_load(
    path: String,
    request_id: u64,
    renderer_manager: RendererManagerHandle,
) {
    let renderer_for_task = renderer_manager.clone();
    let cloned_path_for_logging = path.clone();

    info!(
        "[Renderer] Starting full image load request {} path {}",
        request_id, cloned_path_for_logging
    );

    let join_handle = async_runtime::spawn(async move {
        let input_result = async_runtime::spawn_blocking(move || {
            let build_start = Instant::now();

            build_input_from_path(&path).map(|input| (input, elapsed_ms(build_start)))
        })
        .await;

        match input_result {
            Ok(Ok((input, input_build_ms))) => match RendererManager::lock(&renderer_for_task) {
                Ok(mut manager) => {
                    manager.set_input_for_active_request(request_id, input, Some(input_build_ms));
                    manager.complete_image_request(request_id);
                }
                Err(error) => error!("[Renderer] {error}"),
            },
            Ok(Err(error)) => {
                error!(
                    "[Renderer] Failed to load full image {}: {}",
                    cloned_path_for_logging,
                    error.to_string()
                );

                match RendererManager::lock(&renderer_for_task) {
                    Ok(mut manager) => manager.complete_image_request(request_id),
                    Err(error) => error!("[Renderer] {error}"),
                }
            }
            Err(join_error) => {
                error!(
                    "[Renderer] Full image load task panicked for {}: {:?}",
                    cloned_path_for_logging, join_error
                );

                match RendererManager::lock(&renderer_for_task) {
                    Ok(mut manager) => manager.complete_image_request(request_id),
                    Err(error) => error!("[Renderer] {error}"),
                }
            }
        }
    });

    match RendererManager::lock(&renderer_manager) {
        Ok(mut manager) => manager.attach_load_handle(request_id, join_handle),
        Err(error) => {
            error!("[Renderer] {error}");
            join_handle.abort();
        }
    }
}

fn set_input_for_active_request(
    renderer_manager: &RendererManagerHandle,
    request_id: u64,
    input: Input,
    input_build_ms: Option<f64>,
) {
    match RendererManager::lock(renderer_manager) {
        Ok(mut manager) => {
            manager.set_input_for_active_request(request_id, input, input_build_ms);
        }
        Err(error) => error!("[Renderer] {error}"),
    }
}

fn elapsed_ms(start: Instant) -> f64 {
    start.elapsed().as_secs_f64() * 1000.0
}
