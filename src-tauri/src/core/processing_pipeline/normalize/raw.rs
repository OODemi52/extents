use anyhow::Result;

use super::raw_development;
use crate::core::image::orientation::apply_orientation;
use crate::core::image::ImageDimensions;
use crate::core::processing_pipeline::decode::DecodedRawImage;
use crate::core::processing_pipeline::types::{
    DisplayRenderIntent, ProcessingPipelineImage, WorkingImage,
};

/// Normalizes a decoded RAW image into canonical pipeline state.
///
/// RAW development now returns a calibrated Rec.2020 working image from
/// `raw_development/develop.rs`, which is then oriented and packed. RAW images
/// are tagged for SDR display with tone mapping.
pub(in crate::core::processing_pipeline::normalize) fn normalize_decoded_raw(
    raw: DecodedRawImage,
) -> Result<ProcessingPipelineImage> {
    let DecodedRawImage {
        raw_image,
        orientation,
    } = raw;

    let working_image = match raw_development::develop_working_image(&raw_image) {
        Ok(working_image) => working_image,
        Err(error) => return Err(error),
    };

    let dimensions = *working_image.dimensions();

    let working_pixels = working_image.pixels().to_vec();

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
