use super::context::RenderContext;
use super::pipeline::RenderPipeline;
use super::texture::TextureManager;
use super::transform::TransformBuffer;
use super::vertex::VertexBuffer;
use super::viewport::Viewport;
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

pub struct Renderer<'a> {
    context: RenderContext<'a>,
    pipeline: RenderPipeline,
    vertex_buffer: VertexBuffer,
    texture_manager: TextureManager,
    transform_buffer: TransformBuffer,
    bind_group: wgpu::BindGroup,
    pending_scale: f32,
    pending_offset_x: f32,
    pending_offset_y: f32,
    vertex_scale_x: f32,
    vertex_scale_y: f32,
    fit_scale: f32,
    pending_load: Option<JoinHandle<()>>,
    request_counter: u64,
    active_request_id: Option<u64>,
    pub viewport: Mutex<Viewport>,
    pub render_state: RenderState,
    pub last_render: Instant,
}

impl<'a> Renderer<'a> {
    pub fn new(window: &'a WebviewWindow) -> Self {
        let window_size = window.inner_size().unwrap();

        let context = RenderContext::new(window);

        let pipeline = RenderPipeline::new(&context.device, context.config.format);

        let vertex_buffer = VertexBuffer::new(&context.device);

        let texture_manager = TextureManager::new(&context.device, &context.queue);

        let viewport = Mutex::new(Viewport::new(0, 0, window_size.width, window_size.height));

        let render_state = RenderState::Idle;

        let last_render = Instant::now();

        let transform_buffer = TransformBuffer::new(&context.device);

        let bind_group = pipeline.create_bind_group(
            &context.device,
            texture_manager.view(),
            transform_buffer.as_entire_binding(),
        );

        let mut renderer = Self {
            context,
            pipeline,
            vertex_buffer,
            texture_manager,
            transform_buffer,
            bind_group,
            viewport,
            render_state,
            last_render,
            pending_scale: 1.0,
            pending_offset_x: 0.0,
            pending_offset_y: 0.0,
            vertex_scale_x: 1.0,
            vertex_scale_y: 1.0,
            fit_scale: 1.0,
            pending_load: None,
            request_counter: 0,
            active_request_id: None,
        };

        renderer.update_vertices();

        renderer
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
        let window_width = self.context.config.width;

        let window_height = self.context.config.height;

        if window_width == 0
            || window_height == 0
            || self.texture_manager.width == 0
            || self.texture_manager.height == 0
        {
            return;
        }

        let viewport = *self.viewport.lock().unwrap();

        if !viewport.is_valid() {
            return;
        }

        let (scale_x, scale_y) = self.vertex_buffer.update_for_aspect_ratio(
            &self.context.queue,
            window_width,
            window_height,
            self.texture_manager.width,
            self.texture_manager.height,
        );

        self.vertex_scale_x = scale_x;

        self.vertex_scale_y = scale_y;

        self.fit_scale = self.compute_fit_scale(&viewport);

        self.apply_transform_with_viewport(&viewport);
    }

    pub fn resize(&mut self, new_width: u32, new_height: u32) {
        self.context.resize(new_width, new_height);
    }

    pub fn update_texture(&mut self, rgba: &[u8], width: u32, height: u32) {
        info!("[Renderer] Updating texture ({}x{})", width, height);

        self.texture_manager.update(
            &self.context.device,
            &self.context.queue,
            rgba,
            width,
            height,
        );

        self.bind_group = self.pipeline.create_bind_group(
            &self.context.device,
            self.texture_manager.view(),
            self.transform_buffer.as_entire_binding(),
        );

        self.update_vertices();
    }

    pub fn clear(&mut self) {
        if let Some(handle) = self.pending_load.take() {
            handle.abort();
        }

        self.active_request_id = None;

        self.texture_manager = TextureManager::new(&self.context.device, &self.context.queue);

        self.bind_group = self.pipeline.create_bind_group(
            &self.context.device,
            self.texture_manager.view(),
            self.transform_buffer.as_entire_binding(),
        );

        self.pending_scale = 1.0;
        self.pending_offset_x = 0.0;
        self.pending_offset_y = 0.0;
        self.fit_scale = 1.0;
        self.vertex_scale_x = 1.0;
        self.vertex_scale_y = 1.0;

        self.update_vertices();
        self.render();
    }

    pub fn update_transform(&mut self, scale: f32, offset_x: f32, offset_y: f32) {
        self.pending_scale = scale;

        self.pending_offset_x = offset_x;

        self.pending_offset_y = offset_y;

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

        let output = match self.context.surface.get_current_texture() {
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

        let mut encoder =
            self.context
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
                self.context.config.width as f32,
                self.context.config.height as f32,
                0.0,
                1.0,
            );

            render_pass.set_pipeline(&self.pipeline.pipeline);

            render_pass.set_bind_group(0, &self.bind_group, &[]);

            render_pass.set_vertex_buffer(0, self.vertex_buffer.slice());

            render_pass.draw(0..6, 0..1);
        }

        self.context.queue.submit(std::iter::once(encoder.finish()));

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
        if self.context.config.width == 0 || self.context.config.height == 0 {
            return;
        }

        let window_width = self.context.config.width as f32;

        let window_height = self.context.config.height as f32;

        let viewport_center_x = viewport.x as f32 + viewport.width as f32 / 2.0;

        let viewport_center_y = viewport.y as f32 + viewport.height as f32 / 2.0;

        let viewport_fraction_x = viewport.width as f32 / window_width;

        let viewport_fraction_y = viewport.height as f32 / window_height;

        let combined_scale = self.pending_scale * self.fit_scale;

        let ndc_center_x = (viewport_center_x / window_width) * 2.0 - 1.0;

        let ndc_center_y = 1.0 - (viewport_center_y / window_height) * 2.0;

        let offset_x = ndc_center_x + self.pending_offset_x * viewport_fraction_x;

        let offset_y = ndc_center_y + self.pending_offset_y * viewport_fraction_y;

        self.transform_buffer
            .update(&self.context.queue, combined_scale, offset_x, offset_y);
    }

    fn compute_fit_scale(&self, viewport: &Viewport) -> f32 {
        if self.context.config.width == 0
            || self.context.config.height == 0
            || viewport.width == 0
            || viewport.height == 0
        {
            return 1.0;
        }

        let window_width = self.context.config.width as f32;

        let window_height = self.context.config.height as f32;

        let scale_from_width =
            (viewport.width as f32 / window_width) / self.vertex_scale_x.max(f32::EPSILON);

        let scale_from_height =
            (viewport.height as f32 / window_height) / self.vertex_scale_y.max(f32::EPSILON);

        scale_from_width.min(scale_from_height)
    }
}
