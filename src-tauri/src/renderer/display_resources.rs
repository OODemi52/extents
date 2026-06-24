use super::display_parameters::{DisplayParameters, DisplayParametersBuffer};
use super::pipeline::RenderPipeline;
use super::transform::TransformBuffer;
use super::vertex::VertexBuffer;

/// GPU resources used to draw the currently presented image.
///
/// This groups the display pipeline, bind group, geometry, and shader uniform
/// buffers so `Renderer` no longer manages display GPU internals directly.
pub(super) struct DisplayResources {
    pipeline: RenderPipeline,
    vertex_buffer: VertexBuffer,
    transform_buffer: TransformBuffer,
    display_parameters_buffer: DisplayParametersBuffer,
    bind_group: wgpu::BindGroup,
}

impl DisplayResources {
    /// Creates display resources for a surface with the provided output format.
    pub(super) fn new(
        device: &wgpu::Device,
        surface_format: wgpu::TextureFormat,
        image_texture_view: &wgpu::TextureView,
    ) -> Self {
        let pipeline = RenderPipeline::new(device, surface_format);

        let vertex_buffer = VertexBuffer::new(device);

        let transform_buffer = TransformBuffer::new(device);
        let display_parameters_buffer = DisplayParametersBuffer::new(device);

        let bind_group = pipeline.create_bind_group(
            device,
            image_texture_view,
            transform_buffer.as_entire_binding(),
            display_parameters_buffer.as_entire_binding(),
        );

        Self {
            pipeline,
            vertex_buffer,
            transform_buffer,
            display_parameters_buffer,
            bind_group,
        }
    }

    /// Rebinds the display shader resources to present the provided image texture.
    pub(super) fn bind_image_texture(
        &mut self,
        device: &wgpu::Device,
        image_texture_view: &wgpu::TextureView,
    ) {
        self.bind_group = self.pipeline.create_bind_group(
            device,
            image_texture_view,
            self.transform_buffer.as_entire_binding(),
            self.display_parameters_buffer.as_entire_binding(),
        );
    }

    /// Updates the image quad so the presented texture keeps its aspect ratio.
    pub(super) fn update_vertices_for_surface(
        &mut self,
        queue: &wgpu::Queue,
        surface_width: u32,
        surface_height: u32,
        image_width: u32,
        image_height: u32,
    ) -> (f32, f32) {
        self.vertex_buffer.update_for_aspect_ratio(
            queue,
            surface_width,
            surface_height,
            image_width,
            image_height,
        )
    }

    /// Updates the live display parameters used by the fragment shader.
    pub(super) fn update_display_parameters(
        &mut self,
        queue: &wgpu::Queue,
        parameters: DisplayParameters,
    ) {
        self.display_parameters_buffer.update(queue, parameters);
    }

    /// Returns the currently active shader display-render intent.
    pub(super) fn current_display_render_intent(&self) -> u32 {
        self.display_parameters_buffer
            .parameters()
            .display_render_intent
    }

    /// Returns the currently active shader debug view.
    pub(super) fn current_debug_view(&self) -> u32 {
        self.display_parameters_buffer.parameters().debug_view
    }

    /// Returns the current CPU-side display parameter snapshot.
    pub(super) fn current_display_parameters(&self) -> DisplayParameters {
        self.display_parameters_buffer.parameters()
    }

    /// Updates the live transform values used by the presentation shaders.
    pub(super) fn update_transform(
        &mut self,
        queue: &wgpu::Queue,
        scale: f32,
        offset_x: f32,
        offset_y: f32,
        checkerboard_enabled: f32,
    ) {
        self.transform_buffer
            .update(queue, scale, offset_x, offset_y, checkerboard_enabled);
    }

    /// Draws the current image quad into the active render pass.
    pub(super) fn draw<'pass>(&'pass self, render_pass: &mut wgpu::RenderPass<'pass>) {
        render_pass.set_pipeline(&self.pipeline.pipeline);

        render_pass.set_bind_group(0, &self.bind_group, &[]);

        render_pass.set_vertex_buffer(0, self.vertex_buffer.slice());

        render_pass.draw(0..6, 0..1);
    }
}
