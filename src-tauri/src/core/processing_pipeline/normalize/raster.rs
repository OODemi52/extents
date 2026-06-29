use anyhow::Result;
use image::RgbaImage;

use super::convert::linear_srgb_to_linear_rec2020;
use crate::core::image::orientation::apply_orientation;
use crate::core::image::ImageDimensions;
use crate::core::processing_pipeline::decode::DecodedRasterImage;
use crate::core::processing_pipeline::luts::srgb_u8_to_linear;
use crate::core::processing_pipeline::types::{
    AlphaPlane, DisplayRenderIntent, ProcessingPipelineImage, RgbPixel, WorkingImage,
};

/// Normalizes a decoded raster image into canonical pipeline state.
///
/// Raster normalization currently assumes sRGB source encoding and defers ICC
/// profile handling. Orientation is applied before constructing the canonical
/// working image and optional alpha plane. Raster images are currently tagged
/// for direct SDR display without scene-style tone mapping.
pub(super) fn normalize_decoded_raster(
    raster: DecodedRasterImage,
) -> Result<ProcessingPipelineImage> {
    let DecodedRasterImage {
        mut pixels,
        orientation,
        _icc_profile: _,
    } = raster;

    if let Some(orientation) = orientation {
        let (width, height) = pixels.dimensions();
        let rgba_pixels: Vec<_> = pixels.pixels().copied().collect();

        let (oriented_pixels, oriented_width, oriented_height) =
            apply_orientation(rgba_pixels, width, height, orientation)?;

        pixels = RgbaImage::from_fn(oriented_width, oriented_height, |x, y| {
            oriented_pixels[((y * oriented_width) + x) as usize]
        });
    }

    let (width, height) = pixels.dimensions();
    let dimensions = ImageDimensions::new(width, height)?;
    let pixel_count = dimensions.pixel_count()?;

    let mut working_pixels = Vec::with_capacity(pixel_count);
    let mut alpha_samples: Option<Vec<f32>> = None;

    for rgba in pixels.pixels() {
        let red = srgb_u8_to_linear(rgba[0]);
        let green = srgb_u8_to_linear(rgba[1]);
        let blue = srgb_u8_to_linear(rgba[2]);

        let linear_srgb_pixel = RgbPixel { red, green, blue };
        let working_pixel = linear_srgb_to_linear_rec2020(linear_srgb_pixel);

        working_pixels.push(working_pixel);

        let alpha = u8_to_normalized_f32(rgba[3]);

        match &mut alpha_samples {
            Some(samples) => samples.push(alpha),
            None if rgba[3] < 255 => {
                let mut samples = Vec::with_capacity(pixel_count);
                samples.resize(working_pixels.len() - 1, 1.0);
                samples.push(alpha);
                alpha_samples = Some(samples);
            }
            None => {}
        }
    }

    let working_image = WorkingImage::new(dimensions, working_pixels)?;

    let alpha = match alpha_samples {
        Some(samples) => Some(AlphaPlane::new(dimensions, samples)?),
        None => None,
    };

    ProcessingPipelineImage::new(working_image, alpha, DisplayRenderIntent::DirectSdr)
}

/// Converts an 8-bit channel value into a normalized `f32` in the range `0.0..=1.0`.
fn u8_to_normalized_f32(value: u8) -> f32 {
    value as f32 / 255.0
}
