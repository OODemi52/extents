use std::sync::{Arc, Mutex, MutexGuard};

use log::{info, warn};
use tauri::WebviewWindow;

use super::image_load::{
    set_requested_renderer_input_from_path, spawn_full_image_load, swap_requested_renderer_input,
};
use super::input::RendererInput;
use super::renderer::Renderer;
use super::schedule::RenderState;
use crate::core::editing::EditRecipe;
use crate::renderer::DisplayParameters;

pub type RendererManagerHandle = Arc<Mutex<RendererManager>>;

/// Command-facing owner of the active renderer lifecycle.
///
/// The manager keeps the optional live renderer behind one boundary and
/// coordinates image request startup, viewport updates, render pacing, and
/// request-aware image loads.
pub struct RendererManager {
    renderer: Option<Renderer>,
}

impl RendererManager {
    /// Creates a renderer manager with no initialized renderer.
    pub fn new() -> Self {
        Self { renderer: None }
    }

    /// Locks a shared renderer manager handle.
    pub fn lock(handle: &RendererManagerHandle) -> Result<MutexGuard<'_, RendererManager>, String> {
        match handle.lock() {
            Ok(manager) => Ok(manager),
            Err(error) => Err(format!("Renderer manager lock poisoned: {error}")),
        }
    }

    /// Initializes the live renderer for the current window.
    pub fn init_renderer(&mut self, window: WebviewWindow) -> Result<(), String> {
        if self.renderer.is_some() {
            warn!("Renderer already initialized.");
            return Ok(());
        }

        info!("Initializing renderer...");

        let mut renderer = match Renderer::new(window) {
            Ok(renderer) => renderer,
            Err(error) => return Err(error.to_string()),
        };

        renderer.render();

        self.renderer = Some(renderer);

        Ok(())
    }

    /// Updates the surface size when the window is resized.
    pub fn resize_surface(&mut self, width: u32, height: u32) {
        if let Some(renderer) = self.renderer.as_mut() {
            renderer.resize(width, height);
        }
    }

    /// Starts a new image request and optionally applies the first proxy image.
    pub fn load_image(
        handle: RendererManagerHandle,
        path: String,
        preview_path: Option<String>,
        viewport_x: u32,
        viewport_y: u32,
        viewport_width: u32,
        viewport_height: u32,
        defer_full_image_load: bool,
    ) -> Result<u64, String> {
        let preview_label = preview_path.as_deref().unwrap_or("<none>");

        let request_id = {
            let mut manager = Self::lock(&handle)?;
            let Some(renderer) = manager.renderer.as_mut() else {
                return Err("Renderer not initialized".to_string());
            };

            renderer.update_proxy_viewport(
                viewport_x as f32,
                viewport_y as f32,
                viewport_width as f32,
                viewport_height as f32,
            );

            let request_id = renderer.begin_image_request();
            info!(
                "[RendererManager] Image request {} defer_full={} preview={}",
                request_id, defer_full_image_load, preview_label
            );

            request_id
        };

        if let Some(preview_path) = preview_path {
            if let Err(error) =
                set_requested_renderer_input_from_path(&preview_path, request_id, &handle)
            {
                warn!(
                    "[RendererManager] Failed to load preview texture from {preview_path}: {error}"
                );
            }
        }

        if !defer_full_image_load {
            spawn_full_image_load(path, request_id, handle);
        } else {
            info!(
                "[RendererManager] Deferring full decode for request {}",
                request_id
            );
        }

        Ok(request_id)
    }

    /// Starts a deferred full-image load if the request is still current.
    pub fn start_full_image_load(
        handle: RendererManagerHandle,
        path: String,
        request_id: u64,
    ) -> Result<(), String> {
        let should_start = {
            let manager = Self::lock(&handle)?;
            let Some(renderer) = manager.renderer.as_ref() else {
                return Err("Renderer not initialized".to_string());
            };

            renderer.is_request_active(request_id)
        };

        if !should_start {
            info!(
                "[RendererManager] start_full_image_load skipped (inactive request {})",
                request_id
            );
            return Ok(());
        }

        spawn_full_image_load(path, request_id, handle);

        Ok(())
    }

    /// Builds and swaps a requested proxy renderer input.
    pub async fn swap_requested_texture(
        handle: RendererManagerHandle,
        path: String,
        request_id: u64,
    ) -> Result<(), String> {
        swap_requested_renderer_input(path, request_id, handle).await
    }

    /// Updates the logical interaction viewport and recalculates image placement.
    pub fn update_viewport(&mut self, x: f32, y: f32, width: f32, height: f32) {
        if let Some(renderer) = self.renderer.as_mut() {
            renderer.update_proxy_viewport(x, y, width, height);
            renderer.update_vertices();
        }
    }

    /// Updates the user transform and renders immediately.
    pub fn update_transform(&mut self, scale: f32, offset_x: f32, offset_y: f32) {
        if let Some(renderer) = self.renderer.as_mut() {
            renderer.update_transform(scale, offset_x, offset_y);
            renderer.render();
        }
    }

    /// Returns whether the current render schedule allows a frame.
    pub fn should_render_frame(&self) -> bool {
        match self.renderer.as_ref() {
            Some(renderer) => renderer.should_render(),
            None => false,
        }
    }

    /// Renders one frame if the renderer is initialized.
    pub fn render_frame(&mut self) {
        if let Some(renderer) = self.renderer.as_mut() {
            renderer.render();
        }
    }

    /// Clears the active renderer image.
    pub fn clear_renderer(&mut self) {
        if let Some(renderer) = self.renderer.as_mut() {
            renderer.clear();
        }
    }

    /// Updates renderer pacing state.
    pub fn set_render_state(&mut self, render_state: RenderState) {
        if let Some(renderer) = self.renderer.as_mut() {
            renderer.set_render_state(render_state);
        }
    }

    /// Applies sidecar recipe parameters and renders.
    pub fn sync_sidecar(&mut self, recipe: &EditRecipe) {
        if let Some(renderer) = self.renderer.as_mut() {
            renderer.update_edit_recipe(recipe);

            let display_parameters =
                DisplayParameters::from_intent(renderer.current_display_render_intent());

            renderer.update_display_parameters(display_parameters);
            renderer.render();
        }
    }

    pub(super) fn set_renderer_input_for_active_request(
        &mut self,
        request_id: u64,
        renderer_input: RendererInput,
    ) {
        if let Some(renderer) = self.renderer.as_mut() {
            if renderer.is_request_active(request_id) {
                renderer.set_renderer_input(renderer_input);
                renderer.render();
            }
        }
    }

    pub(super) fn complete_image_request(&mut self, request_id: u64) {
        if let Some(renderer) = self.renderer.as_mut() {
            renderer.complete_image_request(request_id);
        }
    }

    pub(super) fn attach_load_handle(
        &mut self,
        request_id: u64,
        handle: tauri::async_runtime::JoinHandle<()>,
    ) {
        if let Some(renderer) = self.renderer.as_mut() {
            renderer.attach_load_handle(request_id, handle);
        } else {
            handle.abort();
        }
    }
}
