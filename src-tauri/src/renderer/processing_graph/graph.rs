use super::super::texture::ImageTexture;
use super::parameters::{
    AdjustmentParameters, AdjustmentParametersBuffer, OutputTransformParameters,
    OutputTransformParametersBuffer,
};
use super::stages::{AdjustmentStage, OutputTransformStage};

/// GPU-side image processing graph for the active renderer image.
///
/// The graph owns source upload, GPU-side image stage execution, and the current
/// output texture consumed by display resources.
pub(in crate::renderer) struct ImageProcessingGraph {
    source_texture: ImageTexture,
    adjustment_output_texture: ImageTexture,
    output_texture: ImageTexture,
    adjustment_parameters_buffer: AdjustmentParametersBuffer,
    output_transform_parameters_buffer: OutputTransformParametersBuffer,
    adjustment_stage: AdjustmentStage,
    output_transform_stage: OutputTransformStage,
}

impl ImageProcessingGraph {
    /// Creates an empty processing graph with placeholder source and output textures.
    pub(in crate::renderer) fn new(device: &wgpu::Device, queue: &wgpu::Queue) -> Self {
        let source_texture = ImageTexture::new_source(device, queue);
        let adjustment_output_texture = ImageTexture::new_adjustment_output(device, queue);
        let output_texture = ImageTexture::new_display_output(device, queue);
        let adjustment_parameters_buffer = AdjustmentParametersBuffer::new(device);
        let output_transform_parameters_buffer = OutputTransformParametersBuffer::new(device);
        let adjustment_stage = AdjustmentStage::new(
            device,
            source_texture.view(),
            adjustment_output_texture.view(),
            adjustment_parameters_buffer.as_entire_binding(),
        );
        let output_transform_stage = OutputTransformStage::new(
            device,
            adjustment_output_texture.view(),
            output_texture.view(),
            output_transform_parameters_buffer.as_entire_binding(),
        );

        Self {
            source_texture,
            adjustment_output_texture,
            output_texture,
            adjustment_parameters_buffer,
            output_transform_parameters_buffer,
            adjustment_stage,
            output_transform_stage,
        }
    }

    /// Uploads packed renderer texels and runs the graph's current processing stages.
    pub(in crate::renderer) fn upload_source_image(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        texels: &[f32],
        width: u32,
        height: u32,
    ) {
        self.source_texture
            .update(device, queue, texels, width, height);
        self.adjustment_output_texture
            .resize_empty(device, width, height);
        self.output_texture.resize_empty(device, width, height);
        self.rebind_stages(device);
        self.run_stages(device, queue);
    }

    /// Updates graph-owned adjustment parameters and reruns the current graph.
    pub(in crate::renderer) fn update_adjustments(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        exposure_ev: f32,
    ) {
        let parameters = AdjustmentParameters::from_exposure_ev(exposure_ev);

        self.adjustment_parameters_buffer.update(queue, parameters);
        self.run_stages(device, queue);
    }

    /// Updates graph-owned output parameters and reruns the output transform stage.
    pub(in crate::renderer) fn update_display_render_intent(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        display_render_intent: u32,
    ) {
        let parameters =
            OutputTransformParameters::from_display_render_intent(display_render_intent);

        self.output_transform_parameters_buffer
            .update(queue, parameters);
        self.run_output_transform_stage(device, queue);
    }

    /// Returns the current graph output view used by the display resources.
    pub(in crate::renderer) fn output_view(&self) -> &wgpu::TextureView {
        self.output_texture.view()
    }

    /// Returns the current graph output width.
    pub(in crate::renderer) fn output_width(&self) -> u32 {
        self.output_texture.width()
    }

    /// Returns the current graph output height.
    pub(in crate::renderer) fn output_height(&self) -> u32 {
        self.output_texture.height()
    }

    fn rebind_stages(&mut self, device: &wgpu::Device) {
        self.adjustment_stage.rebind(
            device,
            self.source_texture.view(),
            self.adjustment_output_texture.view(),
            self.adjustment_parameters_buffer.as_entire_binding(),
        );
        self.output_transform_stage.rebind(
            device,
            self.adjustment_output_texture.view(),
            self.output_texture.view(),
            self.output_transform_parameters_buffer.as_entire_binding(),
        );
    }

    fn run_stages(&self, device: &wgpu::Device, queue: &wgpu::Queue) {
        self.adjustment_stage.run(
            device,
            queue,
            self.adjustment_output_texture.width(),
            self.adjustment_output_texture.height(),
        );
        self.run_output_transform_stage(device, queue);
    }

    fn run_output_transform_stage(&self, device: &wgpu::Device, queue: &wgpu::Queue) {
        self.output_transform_stage.run(
            device,
            queue,
            self.output_texture.width(),
            self.output_texture.height(),
        );
    }
}
