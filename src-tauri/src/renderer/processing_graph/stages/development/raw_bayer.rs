use super::super::compute::{ImageComputeStage, ImageComputeStageLabels};
use crate::renderer::texture::ImageTexture;

const NORMALIZE_SHADER_SOURCE: &str = concat!(
    include_str!("../../../../shaders/development/common.wgsl"),
    include_str!("../../../../shaders/development/raw_normalize_bayer.wgsl"),
);

const DEMOSAIC_SHADER_SOURCE: &str = concat!(
    include_str!("../../../../shaders/development/common.wgsl"),
    include_str!("../../../../shaders/development/raw_demosaic_bayer.wgsl"),
);

const CAMERA_TO_WORKING_SHADER_SOURCE: &str = concat!(
    include_str!("../../../../shaders/development/common.wgsl"),
    include_str!("../../../../shaders/development/raw_camera_to_working.wgsl"),
);

const NORMALIZE_LABELS: ImageComputeStageLabels = ImageComputeStageLabels {
    bind_group_layout: "RAW Normalize Bayer Stage Bind Group Layout",
    pipeline_layout: "RAW Normalize Bayer Stage Pipeline Layout",
    shader: "RAW Normalize Bayer Stage Shader",
    pipeline: "RAW Normalize Bayer Stage Pipeline",
    bind_group: "RAW Normalize Bayer Stage Bind Group",
    encoder: "RAW Normalize Bayer Stage Encoder",
    pass: "RAW Normalize Bayer Stage Pass",
};

const DEMOSAIC_LABELS: ImageComputeStageLabels = ImageComputeStageLabels {
    bind_group_layout: "RAW Demosaic Bayer Stage Bind Group Layout",
    pipeline_layout: "RAW Demosaic Bayer Stage Pipeline Layout",
    shader: "RAW Demosaic Bayer Stage Shader",
    pipeline: "RAW Demosaic Bayer Stage Pipeline",
    bind_group: "RAW Demosaic Bayer Stage Bind Group",
    encoder: "RAW Demosaic Bayer Stage Encoder",
    pass: "RAW Demosaic Bayer Stage Pass",
};

const CAMERA_TO_WORKING_LABELS: ImageComputeStageLabels = ImageComputeStageLabels {
    bind_group_layout: "RAW Camera To Working Stage Bind Group Layout",
    pipeline_layout: "RAW Camera To Working Stage Pipeline Layout",
    shader: "RAW Camera To Working Stage Shader",
    pipeline: "RAW Camera To Working Stage Pipeline",
    bind_group: "RAW Camera To Working Stage Bind Group",
    encoder: "RAW Camera To Working Stage Encoder",
    pass: "RAW Camera To Working Stage Pass",
};

/// Multi-pass development pipeline for one-plane 2x2 Bayer RAW input.
pub(in crate::renderer::processing_graph) struct RawBayerDevelopmentStage {
    normalized_bayer_texture: ImageTexture,
    camera_rgb_texture: ImageTexture,
    normalize_stage: ImageComputeStage,
    demosaic_stage: ImageComputeStage,
    camera_to_working_stage: ImageComputeStage,
}

impl RawBayerDevelopmentStage {
    /// Creates RAW Bayer development stages and their intermediate textures.
    pub(super) fn new(
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        development_parameters_binding: wgpu::BindingResource<'_>,
    ) -> Self {
        let normalized_bayer_texture = ImageTexture::new_raw_normalized_bayer_output(device, queue);
        let camera_rgb_texture = ImageTexture::new_raw_camera_rgb_output(device, queue);
        let normalize_stage = ImageComputeStage::new(
            device,
            NORMALIZE_LABELS,
            NORMALIZE_SHADER_SOURCE,
            source_view,
            normalized_bayer_texture.view(),
            development_parameters_binding.clone(),
        );
        let demosaic_stage = ImageComputeStage::new(
            device,
            DEMOSAIC_LABELS,
            DEMOSAIC_SHADER_SOURCE,
            normalized_bayer_texture.view(),
            camera_rgb_texture.view(),
            development_parameters_binding.clone(),
        );
        let camera_to_working_stage = ImageComputeStage::new(
            device,
            CAMERA_TO_WORKING_LABELS,
            CAMERA_TO_WORKING_SHADER_SOURCE,
            camera_rgb_texture.view(),
            output_view,
            development_parameters_binding,
        );

        Self {
            normalized_bayer_texture,
            camera_rgb_texture,
            normalize_stage,
            demosaic_stage,
            camera_to_working_stage,
        }
    }

    /// Rebinds this pipeline after graph texture resources are replaced.
    pub(super) fn rebind(
        &mut self,
        device: &wgpu::Device,
        source_view: &wgpu::TextureView,
        output_view: &wgpu::TextureView,
        development_parameters_binding: wgpu::BindingResource<'_>,
        width: u32,
        height: u32,
    ) {
        self.normalized_bayer_texture
            .resize_empty(device, width, height);
        self.camera_rgb_texture.resize_empty(device, width, height);
        self.normalize_stage.rebind(
            device,
            source_view,
            self.normalized_bayer_texture.view(),
            development_parameters_binding.clone(),
        );
        self.demosaic_stage.rebind(
            device,
            self.normalized_bayer_texture.view(),
            self.camera_rgb_texture.view(),
            development_parameters_binding.clone(),
        );
        self.camera_to_working_stage.rebind(
            device,
            self.camera_rgb_texture.view(),
            output_view,
            development_parameters_binding,
        );
    }

    /// Runs RAW normalization, demosaic, and camera-to-working stages in order.
    pub(super) fn run(&self, device: &wgpu::Device, queue: &wgpu::Queue, width: u32, height: u32) {
        self.normalize_stage.run(device, queue, width, height);
        self.demosaic_stage.run(device, queue, width, height);
        self.camera_to_working_stage
            .run(device, queue, width, height);
    }
}
