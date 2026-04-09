use crate::core::processing_pipeline::types::{ImageDimensions, ProcessingPipelineImage};
use anyhow::Result;

pub enum DisplayMode {
    Sdr,
    Hdr,
}

#[derive(Debug, Clone, Copy, PartialEq)]
struct ToneMappedPixel {
    red: f32,
    green: f32,
    blue: f32,
}

#[derive(Debug, Clone)]
struct ToneMappedImage {
    dimensions: ImageDimensions,
    pixels: Vec<ToneMappedPixel>,
    alpha: Option<Vec<f32>>,
}

#[derive(Debug, Clone)]
pub enum DisplayImage {
    Rgba8Srgb {
        dimensions: ImageDimensions,
        rgba: Vec<u8>,
    },
}

pub fn render_for_display(
    image: &ProcessingPipelineImage,
    mode: DisplayMode,
) -> Result<DisplayImage> {
    todo!()
}
