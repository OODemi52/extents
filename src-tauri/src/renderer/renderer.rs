use super::context::{GpuContext, SurfaceContext};
use super::display_parameters::DisplayParameters;
use super::display_resources::DisplayResources;
use super::image_request::ImageRequest;
use super::input::RendererInput;
use super::schedule::{RenderSchedule, RenderState};
use super::texture::ImageTexture;
use super::viewer::Viewer;
use crate::core::processing_pipeline::types::DisplayRenderIntent;
use anyhow::{Context, Result};
use log::{error, info};
use tauri::async_runtime::JoinHandle;
use tauri::WebviewWindow;

pub struct Renderer {
    gpu: GpuContext,
    surface: SurfaceContext,
    image_texture: ImageTexture,
    display_resources: DisplayResources,
    viewer: Viewer,
    image_request: ImageRequest,
    render_schedule: RenderSchedule,
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

        let image_texture = ImageTexture::new(&gpu.device, &gpu.queue);

        let display_resources =
            DisplayResources::new(&gpu.device, surface.format(), image_texture.view());

        let viewer = Viewer::new(window_size.width, window_size.height);

        let image_request = ImageRequest::new();

        let render_schedule = RenderSchedule::new();

        let mut renderer = Self {
            gpu,
            surface,
            image_texture,
            display_resources,
            viewer,
            image_request,
            render_schedule,
            has_image: false,
        };

        renderer.update_vertices();

        Ok(renderer)
    }

    pub fn begin_image_request(&mut self) -> u64 {
        self.image_request.begin_request()
    }

    pub fn attach_load_handle(&mut self, request_id: u64, handle: JoinHandle<()>) {
        self.image_request.attach_load_handle(request_id, handle);
    }

    pub fn complete_image_request(&mut self, request_id: u64) {
        self.image_request.complete_request(request_id);
    }

    pub fn is_request_active(&self, request_id: u64) -> bool {
        self.image_request.is_request_active(request_id)
    }

    pub fn update_vertices(&mut self) {
        let window_width = self.surface.width();

        let window_height = self.surface.height();

        if window_width == 0
            || window_height == 0
            || self.image_texture.width() == 0
            || self.image_texture.height() == 0
        {
            return;
        }

        if !self.viewer.has_valid_viewport() {
            return;
        }

        let (scale_x, scale_y) = self.display_resources.update_vertices_for_surface(
            &self.gpu.queue,
            window_width,
            window_height,
            self.image_texture.width(),
            self.image_texture.height(),
        );

        self.viewer.update_image_quad_scale(scale_x, scale_y);

        self.viewer.update_fit_scale(window_width, window_height);

        self.apply_transform();
    }

    pub fn resize(&mut self, new_width: u32, new_height: u32) {
        self.surface.resize(&self.gpu, new_width, new_height);
    }

    /// Sets the current renderer input as the live display image.
    pub(super) fn set_renderer_input(&mut self, renderer_input: RendererInput) {
        let image = renderer_input.image();
        let dimensions = image.dimensions();

        self.display_checkboard(image.has_transparency());
        self.update_display_render_intent(shader_display_render_intent(
            renderer_input.display_render_intent(),
        ));
        self.update_texture(image.texels(), dimensions.width(), dimensions.height());
    }

    fn update_texture(&mut self, texels: &[f32], width: u32, height: u32) {
        info!("[Renderer] Updating texture ({}x{})", width, height);

        self.has_image = true;

        self.image_texture
            .update(&self.gpu.device, &self.gpu.queue, texels, width, height);

        self.display_resources
            .bind_image_texture(&self.gpu.device, self.image_texture.view());

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
    fn update_display_render_intent(&mut self, display_render_intent: u32) {
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
        self.image_request.clear();

        self.has_image = false;

        self.render();
    }

    pub fn update_transform(&mut self, scale: f32, offset_x: f32, offset_y: f32) {
        self.viewer.update_user_transform(scale, offset_x, offset_y);

        self.apply_transform();
    }

    fn display_checkboard(&mut self, enabled: bool) {
        if !self.viewer.set_checkerboard_enabled(enabled) {
            return;
        }

        self.apply_transform();
    }

    pub fn update_proxy_viewport(&mut self, x: f32, y: f32, width: f32, height: f32) {
        self.viewer.update_viewport(x, y, width, height);
    }

    pub fn should_render(&self) -> bool {
        self.render_schedule.should_render()
    }

    pub fn set_render_state(&mut self, state: RenderState) {
        self.render_schedule.set_state(state);
    }

    pub fn render(&mut self) {
        if self.render_schedule.is_paused() {
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

        self.render_schedule.mark_rendered();
    }

    fn apply_transform(&mut self) {
        let Some(transform) = self
            .viewer
            .transform_for_surface(self.surface.width(), self.surface.height())
        else {
            return;
        };

        self.display_resources.update_transform(
            &self.gpu.queue,
            transform.scale,
            transform.offset_x,
            transform.offset_y,
            transform.checkerboard_enabled,
        );
    }
}

fn shader_display_render_intent(intent: DisplayRenderIntent) -> u32 {
    match intent {
        DisplayRenderIntent::DirectSdr => 0,
        DisplayRenderIntent::ToneMapToSdr => 1,
    }
}
