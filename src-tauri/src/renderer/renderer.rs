use super::context::RenderContext;
use super::pipeline::RenderPipeline;
use super::texture::TextureManager;
use super::transform::TransformBuffer;
use super::vertex::VertexBuffer;
use super::viewport::Viewport;
use log::{error, info};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::WebviewWindow;

/// Manages the status of the adaptive render loop
#[derive(Debug)]
pub enum RenderState {
    Idle,   // Render up to 10 FPS
    Active, // Render up to 60 FPS
    Paused, // Render 0 FPS
}

/// Main renderer that orchestrates all rendering components
pub struct Renderer<'a> {
    context: RenderContext<'a>,
    pipeline: RenderPipeline,
    vertex_buffer: VertexBuffer,
    texture_manager: TextureManager,
    transform_buffer: TransformBuffer,
    bind_group: wgpu::BindGroup,
    pub viewport: Mutex<Viewport>,
    pub render_state: RenderState,
    pub last_render: Instant,
}

impl<'a> Renderer<'a> {
    /// Create a new renderer from a Tauri window
    pub fn new(window: &'a WebviewWindow) -> Self {
        let size = window.inner_size().unwrap();

        // Initialize core context
        let context = RenderContext::new(window);

        // Create render pipeline
        let pipeline = RenderPipeline::new(&context.device, context.config.format);

        // Create vertex buffer
        let vertex_buffer = VertexBuffer::new(&context.device);

        // Create texture manager
        let texture_manager = TextureManager::new(&context.device, &context.queue);

        // Create viewport
        let viewport = Mutex::new(Viewport::new(0, 0, size.width, size.height));

        // Create render state
        let render_state = RenderState::Idle;

        // Create last render reference
        let last_render = Instant::now();

        // Create transform buffer
        let transform_buffer = TransformBuffer::new(&context.device);

        // Create initial bind group
        let bind_group = pipeline.create_bind_group(
            &context.device,
            texture_manager.view(),
            transform_buffer.as_entire_binding(),
        );

        let renderer = Self {
            context,
            pipeline,
            vertex_buffer,
            texture_manager,
            transform_buffer,
            bind_group,
            viewport,
            render_state,
            last_render,
        };

        // Initialize vertices
        renderer.update_vertices();

        renderer
    }

    /// Update vertex buffer based on current viewport and image dimensions
    pub fn update_vertices(&self) {
        let viewport = self.viewport.lock().unwrap();
        if !viewport.is_valid()
            || self.texture_manager.width == 0
            || self.texture_manager.height == 0
        {
            return;
        }

        self.vertex_buffer.update_for_aspect_ratio(
            &self.context.queue,
            viewport.width,
            viewport.height,
            self.texture_manager.width,
            self.texture_manager.height,
        );
    }

    /// Resize the renderer surface
    pub fn resize(&mut self, new_width: u32, new_height: u32) {
        self.context.resize(new_width, new_height);

        // Reset viewport to FULL SURFACE (not a subset)
        let mut viewport = self.viewport.lock().unwrap();
        viewport.x = 0;
        viewport.y = 0;
        viewport.width = new_width;
        viewport.height = new_height;

        // Update vertices for new aspect ratio
        drop(viewport); // Release lock before calling update_vertices
        self.update_vertices();
    }

    /// Update the texture with new image data
    pub fn update_texture(&mut self, rgba: &[u8], width: u32, height: u32) {
        info!("[Renderer] Updating texture ({}x{})", width, height);

        self.texture_manager.update(
            &self.context.device,
            &self.context.queue,
            rgba,
            width,
            height,
        );

        // Recreate bind group with new texture
        self.bind_group = self.pipeline.create_bind_group(
            &self.context.device,
            self.texture_manager.view(),
            self.transform_buffer.as_entire_binding(),
        );

        self.update_vertices();
    }

    /// Update transform (scale and offset)
    pub fn update_transform(&mut self, scale: f32, offset_x: f32, offset_y: f32) {
        self.transform_buffer
            .update(&self.context.queue, scale, offset_x, offset_y);
        info!(
            "[Renderer] Updated transform: scale={}, offset=({}, {})",
            scale, offset_x, offset_y
        );
    }

    /// Decide if the renderer will render a frame by changing render state
    pub fn should_render(&self) -> bool {
        match self.render_state {
            RenderState::Paused => false,
            RenderState::Idle => self.last_render.elapsed() > Duration::from_millis(100), // ~10 FPS
            RenderState::Active => self.last_render.elapsed() > Duration::from_millis(16), // ~60 FPS
        }
    }

    /// Render the current frame
    pub fn render(&mut self) {
        // Get the current surface texture
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

            // Set viewport
            let viewport = self.viewport.lock().unwrap();

            render_pass.set_viewport(
                viewport.x as f32,
                viewport.y as f32,
                viewport.width as f32,
                viewport.height as f32,
                0.0,
                1.0,
            );

            render_pass.set_scissor_rect(viewport.x, viewport.y, viewport.width, viewport.height);

            // Draw
            render_pass.set_pipeline(&self.pipeline.pipeline);
            render_pass.set_bind_group(0, &self.bind_group, &[]);
            render_pass.set_vertex_buffer(0, self.vertex_buffer.slice());
            render_pass.draw(0..6, 0..1);
        }

        self.context.queue.submit(std::iter::once(encoder.finish()));

        output.present();
    }
}
