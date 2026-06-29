use anyhow::Result;
use image::RgbaImage;

use super::{DisplayIntent, Input, InputImage};
use crate::core::image::orientation::{apply_orientation, Orientation};
use crate::core::image::source::{RasterSamples, RasterSource};
use crate::core::image::ImageDimensions;
use crate::renderer::processing_graph::{DevelopmentParameters, SourceKind};

/// Builds renderer input from a decoded raster source.
pub(super) fn build_input(raster: RasterSource) -> Result<Input> {
    let (samples, _, orientation, _) = raster.into_parts();

    let mut pixels = match samples {
        RasterSamples::Rgba8(pixels) => pixels,
    };

    if let Some(orientation) = orientation {
        pixels = match apply_orientation_to_rgba(pixels, orientation) {
            Ok(pixels) => pixels,
            Err(error) => return Err(error),
        };
    }

    let image = match build_rgba8_input_image(pixels) {
        Ok(image) => image,
        Err(error) => return Err(error),
    };

    Ok(Input::new(
        image,
        DevelopmentParameters::from_source_kind(SourceKind::RasterSrgb),
        DisplayIntent::DirectSdr,
    ))
}

/// Packs RGBA8 raster pixels into normalized renderer source texels.
///
/// Raster input is still decoded as display-referred RGBA8 before upload. The
/// development shader interprets these texels as encoded sRGB and converts them
/// into the graph's linear working space.
fn build_rgba8_input_image(pixels: RgbaImage) -> Result<InputImage> {
    let (width, height) = pixels.dimensions();
    let dimensions = match ImageDimensions::new(width, height) {
        Ok(dimensions) => dimensions,
        Err(error) => return Err(error),
    };

    let pixel_count = match dimensions.pixel_count() {
        Ok(pixel_count) => pixel_count,
        Err(error) => return Err(error),
    };

    let mut texels = Vec::with_capacity(pixel_count * 4);
    let mut has_transparency = false;

    for rgba in pixels.pixels() {
        texels.push(u8_to_normalized_f32(rgba[0]));
        texels.push(u8_to_normalized_f32(rgba[1]));
        texels.push(u8_to_normalized_f32(rgba[2]));

        let alpha = u8_to_normalized_f32(rgba[3]);

        if alpha < 1.0 {
            has_transparency = true;
        }

        texels.push(alpha);
    }

    Ok(InputImage::new(texels, dimensions, has_transparency))
}

/// Applies raster orientation before the source texels are uploaded.
///
/// Raster orientation can be handled as a direct pixel-grid transform because
/// every pixel already contains complete RGBA data.
fn apply_orientation_to_rgba(image: RgbaImage, orientation: Orientation) -> Result<RgbaImage> {
    let (width, height) = image.dimensions();
    let pixels: Vec<_> = image.pixels().copied().collect();

    let (oriented_pixels, oriented_width, oriented_height) =
        match apply_orientation(pixels, width, height, orientation) {
            Ok(oriented) => oriented,
            Err(error) => return Err(error),
        };

    Ok(RgbaImage::from_fn(
        oriented_width,
        oriented_height,
        |x, y| oriented_pixels[((y * oriented_width) + x) as usize],
    ))
}

/// Converts an 8-bit channel value into a normalized `f32` in the range `0.0..=1.0`.
fn u8_to_normalized_f32(value: u8) -> f32 {
    value as f32 / 255.0
}
