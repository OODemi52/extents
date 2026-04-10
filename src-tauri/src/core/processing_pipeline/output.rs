use anyhow::Result;

use super::types::ProcessingPipelineImage;
use crate::core::processing_pipeline::types::ImageDimensions;

/// Packed working-image texels prepared for live renderer upload.
#[derive(Debug, Clone)]
pub struct RenderInputImage {
    texels: Vec<f32>,
    dimensions: ImageDimensions,
}

impl RenderInputImage {
    /// Returns the packed working-image texels as a read-only slice.
    pub fn texels(&self) -> &[f32] {
        &self.texels
    }

    /// Returns the image dimensions represented by this renderer input.
    pub fn dimensions(&self) -> ImageDimensions {
        self.dimensions
    }
}

/// Builds a renderer-facing working-image upload payload from a canonical pipeline image.
pub fn build_render_input(image: &ProcessingPipelineImage) -> Result<RenderInputImage> {
    let dimensions = *image.dimensions();
    let pixel_count = dimensions.pixel_count()?;

    let mut texels = Vec::with_capacity(pixel_count * 4);

    let alpha_samples = image.alpha().map(|alpha| alpha.samples());

    for (index, pixel) in image.color().pixels().iter().enumerate() {
        texels.push(pixel.red);
        texels.push(pixel.green);
        texels.push(pixel.blue);

        let alpha = match alpha_samples {
            Some(alpha_samples) => alpha_samples[index],
            None => 1.0,
        };

        texels.push(alpha);
    }

    Ok(RenderInputImage { dimensions, texels })
}
