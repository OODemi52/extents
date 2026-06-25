use super::compute::{ImageComputeStage, ImageComputeStageLabels};

const LABELS: ImageComputeStageLabels = ImageComputeStageLabels {
    bind_group_layout: "Development Stage Bind Group Layout",
    pipeline_layout: "Development Stage Pipeline Layout",
    shader: "Development Stage Shader",
    pipeline: "Development Stage Pipeline",
    bind_group: "Development Stage Bind Group",
    encoder: "Development Stage Encoder",
    pass: "Development Stage Pass",
};

/// Compute stage that develops uploaded source image data into working-space image data.
pub(in crate::renderer::processing_graph) struct DevelopmentStage {
    stage: ImageComputeStage,
}

impl DevelopmentStage {
    /// Creates the development stage and binds its initial source, output, and parameters.
    pub(in crate::renderer::processing_graph) fn new(
        device: &wgpu::Device,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        development_parameters_binding: wgpu::BindingResource<'_>,
    ) -> Self {
        let stage = ImageComputeStage::new(
            device,
            LABELS,
            include_str!("../../../shaders/development.wgsl"),
            source_view,
            output_view,
            development_parameters_binding,
        );

        Self { stage }
    }

    /// Rebinds this stage after graph texture resources are replaced.
    pub(in crate::renderer::processing_graph) fn rebind(
        &mut self,
        device: &wgpu::Device,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        development_parameters_binding: wgpu::BindingResource<'_>,
    ) {
        self.stage.rebind(
            device,
            source_view,
            output_view,
            development_parameters_binding,
        );
    }

    /// Runs the development compute stage over the current graph output dimensions.
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
