use super::context::{GpuContext, SurfaceContext};
use super::display_parameters::DisplayParameters;
use super::display_resources::DisplayResources;
use super::viewport::Viewport;
use anyhow::{Context, Result};
use log::{error, info};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::async_runtime::JoinHandle;
use tauri::WebviewWindow;

#[derive(Debug)]
pub enum RenderState {
    Idle,   // ~10 FPS
    Active, // ~60 FPS
    Paused,
}

pub struct Renderer {
    gpu: GpuContext,
    surface: SurfaceContext,
    display_resources: DisplayResources,
    pending_scale: f32,
    pending_offset_x: f32,
    pending_offset_y: f32,
    checkerboard_enabled: f32,
    vertex_scale_x: f32,
    vertex_scale_y: f32,
    fit_scale: f32,
    pending_load: Option<JoinHandle<()>>,
    request_counter: u64,
    active_request_id: Option<u64>,
    pub viewport: Mutex<Viewport>,
    pub render_state: RenderState,
    pub last_render: Instant,
    has_image: bool,
}

impl Renderer {
    pub fn new(window: WebviewWindow) -> Result<Self> {
        let window_size = match window
            .inner_size()
            .context("failed to read renderer window size")
        {
            Ok(window_size) => window_size,
            Err(error) => return Err(error),
        };

        let gpu = match GpuContext::new() {
            Ok(gpu) => gpu,
            Err(error) => return Err(error),
        };

        let surface = match SurfaceContext::new(window, &gpu) {
            Ok(surface) => surface,
            Err(error) => return Err(error),
        };

        let display_resources = DisplayResources::new(&gpu.device, &gpu.queue, surface.format());

        let viewport = Mutex::new(Viewport::new(0, 0, window_size.width, window_size.height));

        let render_state = RenderState::Idle;

        let last_render = Instant::now();

        let mut renderer = Self {
            gpu,
            surface,
            display_resources,
            viewport,
            render_state,
            last_render,
            pending_scale: 1.0,
            pending_offset_x: 0.0,
            pending_offset_y: 0.0,
            checkerboard_enabled: 0.0,
            vertex_scale_x: 1.0,
            vertex_scale_y: 1.0,
            fit_scale: 1.0,
            pending_load: None,
            request_counter: 0,
            active_request_id: None,
            has_image: false,
        };

        renderer.update_vertices();

        Ok(renderer)
    }

    pub fn begin_image_request(&mut self) -> u64 {
        if let Some(handle) = self.pending_load.take() {
            handle.abort();
        }

        self.request_counter = self.request_counter.wrapping_add(1);
        let request_id = self.request_counter;
        self.active_request_id = Some(request_id);

        request_id
    }

    pub fn attach_load_handle(&mut self, request_id: u64, handle: JoinHandle<()>) {
        if self.active_request_id == Some(request_id) {
            if let Some(existing) = self.pending_load.take() {
                existing.abort();
            }
            self.pending_load = Some(handle);
        } else {
            handle.abort();
        }
    }

    pub fn complete_image_request(&mut self, request_id: u64) {
        if self.active_request_id == Some(request_id) {
            self.pending_load = None;
            self.active_request_id = None;
        }
    }

    pub fn is_request_active(&self, request_id: u64) -> bool {
        self.active_request_id == Some(request_id)
    }

    pub fn update_vertices(&mut self) {
        let window_width = self.surface.width();

        let window_height = self.surface.height();

        if window_width == 0
            || window_height == 0
            || self.display_resources.image_width() == 0
            || self.display_resources.image_height() == 0
        {
            return;
        }

        let viewport = *self.viewport.lock().unwrap();

        if !viewport.is_valid() {
            return;
        }

        let (scale_x, scale_y) = self.display_resources.update_vertices_for_surface(
            &self.gpu.queue,
            window_width,
            window_height,
        );

        self.vertex_scale_x = scale_x;

        self.vertex_scale_y = scale_y;

        self.fit_scale = self.compute_fit_scale(&viewport);

        self.apply_transform_with_viewport(&viewport);
    }

    pub fn resize(&mut self, new_width: u32, new_height: u32) {
        self.surface.resize(&self.gpu, new_width, new_height);
    }

    pub fn update_texture(&mut self, texels: &[f32], width: u32, height: u32) {
        info!("[Renderer] Updating texture ({}x{})", width, height);

        self.has_image = true;

        self.display_resources.update_texture(
            &self.gpu.device,
            &self.gpu.queue,
            texels,
            width,
            height,
        );

        self.update_vertices();
    }

    pub fn update_display_parameters(&mut self, uniforms: DisplayParameters) {
        self.display_resources
            .update_display_parameters(&self.gpu.queue, uniforms);
    }

    /// Returns the currently active shader display-render intent.
    pub fn current_display_render_intent(&self) -> u32 {
        self.display_resources.current_display_render_intent()
    }

    /// Returns the currently active shader debug view.
    pub fn current_debug_view(&self) -> u32 {
        self.display_resources.current_debug_view()
    }

    /// Updates the active display render intent while preserving the current exposure.
    pub fn update_display_render_intent(&mut self, display_render_intent: u32) {
        let mut uniforms = self.display_resources.current_display_parameters();
        uniforms.display_render_intent = display_render_intent;
        self.update_display_parameters(uniforms);
    }

    /// Updates the active debug view while preserving the current display params.
    pub fn update_debug_view(&mut self, debug_view: u32) {
        let mut uniforms = self.display_resources.current_display_parameters();
        uniforms.debug_view = debug_view;
        self.update_display_parameters(uniforms);
    }

    pub fn clear(&mut self) {
        if let Some(handle) = self.pending_load.take() {
            handle.abort();
        }

        self.active_request_id = None;

        self.has_image = false;

        self.render();
    }

    pub fn update_transform(&mut self, scale: f32, offset_x: f32, offset_y: f32) {
        self.pending_scale = scale;

        self.pending_offset_x = offset_x;

        self.pending_offset_y = offset_y;

        self.apply_transform();
    }

    pub fn display_checkboard(&mut self, enabled: bool) {
        let value = if enabled { 1.0 } else { 0.0 };

        if (self.checkerboard_enabled - value).abs() < f32::EPSILON {
            return;
        }

        self.checkerboard_enabled = value;

        self.apply_transform();
    }

    pub fn update_proxy_viewport(&mut self, x: f32, y: f32, width: f32, height: f32) {
        let mut viewport = self.viewport.lock().unwrap();

        viewport.x = x.max(0.0).round() as u32;

        viewport.y = y.max(0.0).round() as u32;

        viewport.width = width.max(0.0).round() as u32;

        viewport.height = height.max(0.0).round() as u32;
    }

    pub fn should_render(&self) -> bool {
        match self.render_state {
            RenderState::Paused => false,

            RenderState::Idle => self.last_render.elapsed() > Duration::from_millis(100), // ~10 FPS

            RenderState::Active => self.last_render.elapsed() > Duration::from_millis(16), // ~60 FPS
        }
    }

    pub fn render(&mut self) {
        if matches!(self.render_state, RenderState::Paused) {
            return;
        }

        let output = match self.surface.current_texture() {
            Ok(texture) => texture,

            Err(wgpu::SurfaceError::Lost | wgpu::SurfaceError::Outdated) => {
                return;
            }

            Err(e) => {
                error!("[Renderer] Failed to get current texture: {:?}", e);
                return;
            }
        };

        let view = output
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());

        let mut encoder = self
            .gpu
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("Render Encoder"),
            });

        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        // Need to change here to make backgorund of renderer customizeable
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: 0.01,
                            g: 0.01,
                            b: 0.01,
                            a: 1.0,
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                    depth_slice: None,
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });

            render_pass.set_viewport(
                0.0,
                0.0,
                self.surface.width() as f32,
                self.surface.height() as f32,
                0.0,
                1.0,
            );

            if self.has_image {
                self.display_resources.draw(&mut render_pass);
            }
        }

        self.gpu.queue.submit(std::iter::once(encoder.finish()));

        output.present();

        self.last_render = Instant::now();
    }

    fn apply_transform(&mut self) {
        let viewport = *self.viewport.lock().unwrap();
        if !viewport.is_valid() {
            return;
        }

        self.apply_transform_with_viewport(&viewport);
    }

    fn apply_transform_with_viewport(&mut self, viewport: &Viewport) {
        if self.surface.width() == 0 || self.surface.height() == 0 {
            return;
        }

        let window_width = self.surface.width() as f32;

        let window_height = self.surface.height() as f32;

        let viewport_center_x = viewport.x as f32 + viewport.width as f32 / 2.0;

        let viewport_center_y = viewport.y as f32 + viewport.height as f32 / 2.0;

        let viewport_fraction_x = viewport.width as f32 / window_width;

        let viewport_fraction_y = viewport.height as f32 / window_height;

        let combined_scale = self.pending_scale * self.fit_scale;

        let ndc_center_x = (viewport_center_x / window_width) * 2.0 - 1.0;

        let ndc_center_y = 1.0 - (viewport_center_y / window_height) * 2.0;

        let offset_x = ndc_center_x + self.pending_offset_x * viewport_fraction_x;

        let offset_y = ndc_center_y + self.pending_offset_y * viewport_fraction_y;

        self.display_resources.update_transform(
            &self.gpu.queue,
            combined_scale,
            offset_x,
            offset_y,
            self.checkerboard_enabled,
        );
    }

    fn compute_fit_scale(&self, viewport: &Viewport) -> f32 {
        if self.surface.width() == 0
            || self.surface.height() == 0
            || viewport.width == 0
            || viewport.height == 0
        {
            return 1.0;
        }

        let window_width = self.surface.width() as f32;

        let window_height = self.surface.height() as f32;

        let scale_from_width =
            (viewport.width as f32 / window_width) / self.vertex_scale_x.max(f32::EPSILON);

        let scale_from_height =
            (viewport.height as f32 / window_height) / self.vertex_scale_y.max(f32::EPSILON);

        scale_from_width.min(scale_from_height)
    }
}
