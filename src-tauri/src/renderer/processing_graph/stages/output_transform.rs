use super::compute::{ImageComputeStage, ImageComputeStageLabels};

const LABELS: ImageComputeStageLabels = ImageComputeStageLabels {
    bind_group_layout: "Output Transform Stage Bind Group Layout",
    pipeline_layout: "Output Transform Stage Pipeline Layout",
    shader: "Output Transform Stage Shader",
    pipeline: "Output Transform Stage Pipeline",
    bind_group: "Output Transform Stage Bind Group",
    encoder: "Output Transform Stage Encoder",
    pass: "Output Transform Stage Pass",
};

/// Compute stage that converts adjusted working-space image data into display output.
pub(in crate::renderer::processing_graph) struct OutputTransformStage {
    stage: ImageComputeStage,
}

impl OutputTransformStage {
    /// Creates the output transform stage and binds its initial source, output, and parameters.
    pub(in crate::renderer::processing_graph) fn new(
        device: &wgpu::Device,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        output_transform_parameters_binding: wgpu::BindingResource<'_>,
    ) -> Self {
        let stage = ImageComputeStage::new(
            device,
            LABELS,
            include_str!("../../../shaders/output_transform.wgsl"),
            source_view,
            output_view,
            output_transform_parameters_binding,
        );

        Self { stage }
    }

    /// Rebinds this stage after graph texture resources are replaced.
    pub(in crate::renderer::processing_graph) fn rebind(
        &mut self,
        device: &wgpu::Device,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        output_transform_parameters_binding: wgpu::BindingResource<'_>,
    ) {
        self.stage.rebind(
            device,
            source_view,
            output_view,
            output_transform_parameters_binding,
        );
    }

    /// Runs the output transform compute stage over the current output dimensions.
    pub(in crate::renderer::processing_graph) fn run(
        &self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        width: u32,
        height: u32,
    ) {
        self.stage.run(device, queue, width, height);
    }
}
