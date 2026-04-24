use anyhow::Result;

use super::super::convert::linear_srgb_to_linear_rec2020;
use super::develop;
use crate::core::image::orientation::apply_orientation;
use crate::core::processing_pipeline::decode::DecodedRawImage;
use crate::core::processing_pipeline::types::{
    DisplayRenderIntent, ImageDimensions, ProcessingPipelineImage, RgbPixel, WorkingImage,
};

/// Normalizes a decoded RAW image into canonical pipeline state.
///
/// RAW development now returns a calibrated linear sRGB image from
/// `raw/develop.rs`, which is then converted into the pipeline working space,
/// oriented, and packed. RAW images are tagged for SDR display with tone
/// mapping.
pub(in crate::core::processing_pipeline::normalize) fn normalize_decoded_raw(
    raw: DecodedRawImage,
) -> Result<ProcessingPipelineImage> {
    let DecodedRawImage {
        raw_image,
        orientation,
    } = raw;

    let linear_srgb_image = match develop::develop_linear_srgb_image(&raw_image) {
        Ok(linear_srgb_image) => linear_srgb_image,
        Err(error) => return Err(error),
    };

    let dimensions = *linear_srgb_image.dimensions();

    let pixel_count = match dimensions.pixel_count() {
        Ok(pixel_count) => pixel_count,
        Err(error) => return Err(error),
    };

    let mut working_pixels = Vec::with_capacity(pixel_count);

    for pixel in linear_srgb_image.pixels() {
        let red = pixel.red;
        let green = pixel.green;
        let blue = pixel.blue;
        let linear_srgb_pixel = RgbPixel { red, green, blue };
        let working_pixel = linear_srgb_to_linear_rec2020(linear_srgb_pixel);

        working_pixels.push(working_pixel);
    }

    let (dimensions, working_pixels) = match orientation {
        Some(orientation) => {
            let (oriented_pixels, oriented_width, oriented_height) = apply_orientation(
                working_pixels,
                dimensions.width(),
                dimensions.height(),
                orientation,
            )?;

            (
                match ImageDimensions::new(oriented_width, oriented_height) {
                    Ok(dimensions) => dimensions,
                    Err(error) => return Err(error),
                },
                oriented_pixels,
            )
        }
        None => (dimensions, working_pixels),
    };

    let working_image = match WorkingImage::new(dimensions, working_pixels) {
        Ok(working_image) => working_image,
        Err(error) => return Err(error),
    };

    ProcessingPipelineImage::new(working_image, None, DisplayRenderIntent::ToneMapToSdr)
}
