use anyhow::{anyhow, Result};
use rawler::imgop::develop::{Intermediate, ProcessingStep, RawDevelop};

use super::decode::{DecodedRasterImage, DecodedRawImage, DecodedSourceImage};
use crate::core::image::orientation::apply_orientation;
use crate::core::processing_pipeline::types::{
    AlphaPlane, DisplayRenderIntent, ImageDimensions, ProcessingPipelineImage, RgbPixel,
    WorkingImage,
};

/// Normalizes a decoded source image into the canonical processing-pipeline representation.
pub(super) fn normalize_decoded_source(
    decoded_image: DecodedSourceImage,
) -> Result<ProcessingPipelineImage> {
    match decoded_image {
        DecodedSourceImage::Raster(raster) => normalize_decoded_raster(raster),
        DecodedSourceImage::Raw(raw) => normalize_decoded_raw(raw),
    }
}

/// Normalizes a decoded raster image into canonical pipeline state.
///
/// Raster normalization currently assumes sRGB source encoding and defers ICC
/// profile handling. Orientation is applied before constructing the canonical
/// working image and optional alpha plane. Raster images are currently tagged
/// for direct SDR display without scene-style tone mapping.
fn normalize_decoded_raster(raster: DecodedRasterImage) -> Result<ProcessingPipelineImage> {
    let DecodedRasterImage {
        mut pixels,
        orientation,
        _icc_profile: _,
    } = raster;

    if let Some(orientation) = orientation {
        pixels = apply_orientation(pixels, orientation);
    }

    let (width, height) = pixels.dimensions();

    let dimensions = match ImageDimensions::new(width, height) {
        Ok(dimensions) => dimensions,
        Err(error) => return Err(error),
    };

    let pixel_count = match dimensions.pixel_count() {
        Ok(pixel_count) => pixel_count,
        Err(error) => return Err(error),
    };

    let mut working_pixels = Vec::with_capacity(pixel_count);

    let mut alpha_samples: Option<Vec<f32>> = None;

    for rgba in pixels.pixels() {
        let red = srgb_to_linear(u8_to_normalized_f32(rgba[0]));
        let green = srgb_to_linear(u8_to_normalized_f32(rgba[1]));
        let blue = srgb_to_linear(u8_to_normalized_f32(rgba[2]));

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

    let working_image = match WorkingImage::new(dimensions, working_pixels) {
        Ok(working_image) => working_image,
        Err(error) => return Err(error),
    };

    let alpha = match alpha_samples {
        Some(samples) => {
            let alpha_plane = match AlphaPlane::new(dimensions, samples) {
                Ok(alpha_plane) => alpha_plane,
                Err(error) => return Err(error),
            };

            Some(alpha_plane)
        }
        None => None,
    };

    let image =
        match ProcessingPipelineImage::new(working_image, alpha, DisplayRenderIntent::DirectSdr) {
            Ok(image) => image,
            Err(error) => return Err(error),
        };

    Ok(image)
}

/// Normalizes a decoded RAW image into canonical pipeline state.
///
/// RAW normalization currently uses rawler development steps through calibration,
/// but omits the final sRGB gamma step. This is a transitional path and may still
/// compress highlights before the app's own tone-mapping stage. RAW images are
/// currently tagged for SDR display with tone mapping, and RAW orientation is
/// detected during decode but not yet applied to the developed float buffer.
fn normalize_decoded_raw(raw: DecodedRawImage) -> Result<ProcessingPipelineImage> {
    let DecodedRawImage {
        raw_image,
        orientation,
    } = raw;

    if let Some(orientation) = orientation {
        return Err(anyhow!(
            "raw orientation normalization is not implemented yet: {:?}",
            orientation
        ));
    }

    let raw_develop_pipeline = RawDevelop {
        steps: vec![
            ProcessingStep::Rescale,
            ProcessingStep::Demosaic,
            ProcessingStep::CropActiveArea,
            ProcessingStep::WhiteBalance,
            ProcessingStep::Calibrate, // Need to investigate so that we can ensure we're not clipping highlights unneccesarily
            ProcessingStep::CropDefault,
        ],
    };

    let developed_raw_image = match raw_develop_pipeline.develop_intermediate(&raw_image) {
        Ok(developed_raw_image) => developed_raw_image,
        Err(error) => return Err(anyhow!("raw intermediate develop failed: {error}")),
    };

    // Only the three-channel developed RGB intermediate is supported for now.
    let developed_rgb_pixels = match developed_raw_image {
        Intermediate::ThreeColor(developed_rgb_pixels) => developed_rgb_pixels,
        Intermediate::Monochrome(_) => {
            return Err(anyhow!(
                "raw normalization produced a monochrome intermediate, which is not supported yet"
            ));
        }
        Intermediate::FourColor(_) => {
            return Err(anyhow!(
                "raw normalization produced a four-color intermediate, which is not supported yet"
            ));
        }
    };

    let width = match u32::try_from(developed_rgb_pixels.width) {
        Ok(width) => width,
        Err(_) => return Err(anyhow!("raw intermediate width exceeds u32")),
    };

    let height = match u32::try_from(developed_rgb_pixels.height) {
        Ok(height) => height,
        Err(_) => return Err(anyhow!("raw intermediate height exceeds u32")),
    };

    let dimensions = match ImageDimensions::new(width, height) {
        Ok(dimensions) => dimensions,
        Err(error) => return Err(error),
    };

    let pixel_count = match dimensions.pixel_count() {
        Ok(pixel_count) => pixel_count,
        Err(error) => return Err(error),
    };

    let mut working_pixels = Vec::with_capacity(pixel_count);

    for rgb in developed_rgb_pixels.pixels() {
        let red = rgb[0];
        let green = rgb[1];
        let blue = rgb[2];

        let linear_srgb_pixel = RgbPixel { red, green, blue };

        let working_pixel = linear_srgb_to_linear_rec2020(linear_srgb_pixel);

        working_pixels.push(working_pixel);
    }

    let working_image = match WorkingImage::new(dimensions, working_pixels) {
        Ok(working_image) => working_image,
        Err(error) => return Err(error),
    };

    let image = match ProcessingPipelineImage::new(
        working_image,
        None,
        DisplayRenderIntent::ToneMapToSdr,
    ) {
        Ok(image) => image,
        Err(error) => return Err(error),
    };

    Ok(image)
}

/// Converts an 8-bit channel value into a normalized `f32` in the range `0.0..=1.0`.
fn u8_to_normalized_f32(value: u8) -> f32 {
    value as f32 / 255.0
}

/// Converts a normalized sRGB channel value to linear light.
fn srgb_to_linear(channel: f32) -> f32 {
    if channel <= 0.04045 {
        channel / 12.92
    } else {
        ((channel + 0.055) / 1.055).powf(2.4)
    }
}

/// Converts a linear sRGB pixel to the linear Rec.2020 working space.
fn linear_srgb_to_linear_rec2020(pixel: RgbPixel) -> RgbPixel {
    RgbPixel {
        red: (0.627_404 * pixel.red) + (0.329_283 * pixel.green) + (0.043_313 * pixel.blue),
        green: (0.069_097 * pixel.red) + (0.919_540 * pixel.green) + (0.011_362 * pixel.blue),
        blue: (0.016_391 * pixel.red) + (0.088_013 * pixel.green) + (0.895_595 * pixel.blue),
    }
}
