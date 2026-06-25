use super::compute::{ImageComputeStage, ImageComputeStageLabels};

const LABELS: ImageComputeStageLabels = ImageComputeStageLabels {
    bind_group_layout: "Adjustment Stage Bind Group Layout",
    pipeline_layout: "Adjustment Stage Pipeline Layout",
    shader: "Adjustment Stage Shader",
    pipeline: "Adjustment Stage Pipeline",
    bind_group: "Adjustment Stage Bind Group",
    encoder: "Adjustment Stage Encoder",
    pass: "Adjustment Stage Pass",
};

/// Compute stage that applies graph adjustment parameters to the source image.
pub(in crate::renderer::processing_graph) struct AdjustmentStage {
    stage: ImageComputeStage,
}

impl AdjustmentStage {
    /// Creates the adjustment stage and binds its initial source, output, and parameters.
    pub(in crate::renderer::processing_graph) fn new(
        device: &wgpu::Device,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        adjustment_parameters_binding: wgpu::BindingResource<'_>,
    ) -> Self {
        let stage = ImageComputeStage::new(
            device,
            LABELS,
            include_str!("../../../shaders/adjustments.wgsl"),
            source_view,
            output_view,
            adjustment_parameters_binding,
        );

        Self { stage }
    }

    /// Rebinds this stage after graph texture resources are replaced.
    pub(in crate::renderer::processing_graph) fn rebind(
        &mut self,
        device: &wgpu::Device,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        adjustment_parameters_binding: wgpu::BindingResource<'_>,
    ) {
        self.stage.rebind(
            device,
            source_view,
            output_view,
            adjustment_parameters_binding,
        );
    }

    /// Runs the adjustment compute stage over the current graph output dimensions.
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
