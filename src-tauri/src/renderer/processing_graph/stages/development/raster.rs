use super::super::compute::{ImageComputeStage, ImageComputeStageLabels};

const SHADER_SOURCE: &str = concat!(
    include_str!("../../../../shaders/development/common.wgsl"),
    include_str!("../../../../shaders/development/raster_srgb_to_working.wgsl"),
);

const LABELS: ImageComputeStageLabels = ImageComputeStageLabels {
    bind_group_layout: "Raster Development Stage Bind Group Layout",
    pipeline_layout: "Raster Development Stage Pipeline Layout",
    shader: "Raster Development Stage Shader",
    pipeline: "Raster Development Stage Pipeline",
    bind_group: "Raster Development Stage Bind Group",
    encoder: "Raster Development Stage Encoder",
    pass: "Raster Development Stage Pass",
};

/// Single-pass development pipeline for raster sRGB source input.
pub(in crate::renderer::processing_graph) struct RasterDevelopmentStage {
    stage: ImageComputeStage,
}

impl RasterDevelopmentStage {
    /// Creates the raster development stage and binds its graph resources.
    pub(super) fn new(
        device: &wgpu::Device,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        development_parameters_binding: wgpu::BindingResource<'_>,
    ) -> Self {
        let stage = ImageComputeStage::new(
            device,
            LABELS,
            SHADER_SOURCE,
            source_view,
            output_view,
            development_parameters_binding,
        );

        Self { stage }
    }

    /// Rebinds this stage after graph texture resources are replaced.
    pub(super) fn rebind(
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

    /// Runs raster development over the current graph dimensions.
    pub(super) fn run(&self, device: &wgpu::Device, queue: &wgpu::Queue, width: u32, height: u32) {
        self.stage.run(device, queue, width, height);
    }
}
