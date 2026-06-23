use anyhow::Result;

use crate::core::processing_pipeline::types::DisplayRenderIntent;
use crate::core::processing_pipeline::{
    build_renderer_input_image, ingest_from_path, RendererInputImage,
};

/// Renderer-ready input built from the processing pipeline.
///
/// This keeps the CPU-side image upload payload together with the typed display
/// intent needed when the input is set on the live renderer.
pub(super) struct RendererInput {
    image: RendererInputImage,
    display_render_intent: DisplayRenderIntent,
}

impl RendererInput {
    /// Returns the CPU-side image payload to upload into renderer resources.
    pub(super) fn image(&self) -> &RendererInputImage {
        &self.image
    }

    /// Returns how this input should be rendered for display.
    pub(super) fn display_render_intent(&self) -> DisplayRenderIntent {
        self.display_render_intent
    }
}

/// Builds renderer-ready image data from a source image path.
pub(super) fn build_renderer_input_from_path(path: &str) -> Result<RendererInput> {
    let processing_pipeline_image = match ingest_from_path(path) {
        Ok(processing_pipeline_image) => processing_pipeline_image,
        Err(error) => return Err(error),
    };

    let image = match build_renderer_input_image(&processing_pipeline_image) {
        Ok(renderer_input) => renderer_input,
        Err(error) => return Err(error),
    };

    let display_render_intent = image.display_render_intent();

    Ok(RendererInput {
        image,
        display_render_intent,
    })
}
