use super::{ImageInspection, PipelineInspection, TextureInspection, TimingInspection};

/// Current renderer and pipeline state exposed to the Inspector workspace.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectionSnapshot {
    pub has_image: bool,
    pub image: Option<ImageInspection>,
    pub pipeline: PipelineInspection,
    pub textures: TextureInspection,
    pub timings: TimingInspection,
}

impl InspectionSnapshot {
    /// Builds an empty snapshot before any source image has been loaded.
    pub(in crate::renderer) fn empty(
        surface_format: wgpu::TextureFormat,
        surface_width: u32,
        surface_height: u32,
    ) -> Self {
        Self {
            has_image: false,
            image: None,
            pipeline: PipelineInspection::default(),
            textures: TextureInspection::empty(surface_format, surface_width, surface_height),
            timings: TimingInspection::default(),
        }
    }
}
