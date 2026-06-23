use anyhow::Result;

use super::Renderer;
use crate::core::processing_pipeline::types::DisplayRenderIntent;
use crate::core::processing_pipeline::{
    build_renderer_input_image, ingest_from_path, RendererInputImage,
};

/// Renderer-ready input built from the processing pipeline.
///
/// This keeps the CPU-side image upload payload together with the shader-facing
/// display intent needed when the input is set on the live renderer.
pub(super) struct RendererInput {
    image: RendererInputImage,
    display_render_intent: u32,
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

    let display_render_intent = shader_display_render_intent(image.display_render_intent());

    Ok(RendererInput {
        image,
        display_render_intent,
    })
}

/// Sets renderer input as the live renderer image.
pub(super) fn set_renderer_input(renderer: &mut Renderer, renderer_input: RendererInput) {
    renderer.display_checkboard(renderer_input.image.has_transparency());
    renderer.update_display_render_intent(renderer_input.display_render_intent);
    renderer.update_texture(
        renderer_input.image.texels(),
        renderer_input.image.dimensions().width(),
        renderer_input.image.dimensions().height(),
    );
}

fn shader_display_render_intent(intent: DisplayRenderIntent) -> u32 {
    match intent {
        DisplayRenderIntent::DirectSdr => 0,
        DisplayRenderIntent::ToneMapToSdr => 1,
    }
}
