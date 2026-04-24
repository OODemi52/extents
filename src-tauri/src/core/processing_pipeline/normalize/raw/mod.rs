mod develop;
mod types;

use anyhow::{anyhow, Result};
use rawler::imgop::develop::Intermediate;

use super::convert::linear_srgb_to_linear_rec2020;
use crate::core::image::orientation::apply_orientation;
use crate::core::processing_pipeline::decode::DecodedRawImage;
use crate::core::processing_pipeline::types::{
    DisplayRenderIntent, ImageDimensions, ProcessingPipelineImage, RgbPixel, WorkingImage,
};

/// Normalizes a decoded RAW image into canonical pipeline state.
///
/// RAW normalization currently uses rawler development steps through demosaic
/// and crop only. App-owned white balance, calibration, and headroom handling
/// will be layered on here next. RAW images are currently tagged for SDR
/// display with tone mapping, and RAW orientation is applied after development
/// when constructing the working image.
pub(super) fn normalize_decoded_raw(raw: DecodedRawImage) -> Result<ProcessingPipelineImage> {
    let DecodedRawImage {
        raw_image,
        orientation,
    } = raw;

    let developed_raw_image = develop::develop_raw_intermediate(&raw_image)
        .map_err(|error| anyhow!("raw intermediate develop failed: {error}"))?;

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

    let width = u32::try_from(developed_rgb_pixels.width)
        .map_err(|_| anyhow!("raw intermediate width exceeds u32"))?;
    let height = u32::try_from(developed_rgb_pixels.height)
        .map_err(|_| anyhow!("raw intermediate height exceeds u32"))?;

    let dimensions = ImageDimensions::new(width, height)?;
    let pixel_count = dimensions.pixel_count()?;
    let mut working_pixels = Vec::with_capacity(pixel_count);

    for rgb in developed_rgb_pixels.pixels() {
        let red = rgb[0];
        let green = rgb[1];
        let blue = rgb[2];

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
                ImageDimensions::new(oriented_width, oriented_height)?,
                oriented_pixels,
            )
        }
        None => (dimensions, working_pixels),
    };

    let working_image = WorkingImage::new(dimensions, working_pixels)?;

    ProcessingPipelineImage::new(working_image, None, DisplayRenderIntent::ToneMapToSdr)
}
