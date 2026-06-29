use anyhow::{anyhow, Result};
use rawler::imgop::develop::{Intermediate, ProcessingStep, RawDevelop};
use rawler::RawImage;

use super::color_transform::build_raw_color_transform;
use super::highlight_reconstruction::{
    build_raw_highlight_mask, reconstruct_working_space_highlight,
};
use super::types::{CameraSpaceRgbImage, CameraSpaceRgbPixel};
use crate::core::image::ImageDimensions;
use crate::core::processing_pipeline::types::{RgbPixel, WorkingImage};

/// Runs the remaining RAW development stages and returns a calibrated linear
/// Rec.2020 working image without overflow folding.
///
/// Sensor-domain rescale/demosaic/crop are still delegated to rawler. White
/// balance and camera calibration are owned here so we preserve highlight
/// headroom instead of inheriting rawler's overflow shaping.
pub(in crate::core::processing_pipeline::normalize) fn develop_working_image(
    raw_image: &RawImage,
) -> Result<WorkingImage> {
    let highlight_mask = match build_raw_highlight_mask(raw_image) {
        Ok(highlight_mask) => highlight_mask,
        Err(error) => return Err(error),
    };

    let camera_space_rgb_image = match develop_camera_space_rgb_image(raw_image) {
        Ok(camera_space_rgb_image) => camera_space_rgb_image,
        Err(error) => return Err(error),
    };

    let color_transform = match build_raw_color_transform(raw_image) {
        Ok(color_transform) => color_transform,
        Err(error) => return Err(error),
    };

    let dimensions = *camera_space_rgb_image.dimensions();

    if let Some(highlight_mask) = &highlight_mask {
        if highlight_mask.dimensions() != &dimensions {
            return Err(anyhow!(
                "raw highlight mask dimensions {}x{} do not match camera-space image dimensions {}x{}",
                highlight_mask.dimensions().width(),
                highlight_mask.dimensions().height(),
                dimensions.width(),
                dimensions.height()
            ));
        }
    }

    let mut pixels = Vec::with_capacity(camera_space_rgb_image.pixels().len());

    for (index, pixel) in camera_space_rgb_image.pixels().iter().enumerate() {
        let working_space_pixel = color_transform.apply_to_camera_space_rgb(*pixel);
        let working_space_pixel = clip_negative_values(working_space_pixel);
        let working_space_pixel = match &highlight_mask {
            Some(highlight_mask) => reconstruct_working_space_highlight(
                working_space_pixel,
                highlight_mask.samples()[index],
            ),
            None => working_space_pixel,
        };

        pixels.push(working_space_pixel);
    }

    WorkingImage::new(dimensions, pixels)
}

/// Runs the sensor-domain RAW development steps still delegated to rawler.
fn develop_camera_space_rgb_image(raw_image: &RawImage) -> Result<CameraSpaceRgbImage> {
    let sensor_pipeline = RawDevelop {
        steps: vec![
            ProcessingStep::Rescale,
            ProcessingStep::Demosaic,
            ProcessingStep::CropActiveArea,
            ProcessingStep::CropDefault,
        ],
    };

    let sensor_intermediate = match sensor_pipeline.develop_intermediate(raw_image) {
        Ok(sensor_intermediate) => sensor_intermediate,
        Err(error) => return Err(anyhow!("raw intermediate develop failed: {error}")),
    };

    let camera_rgb_pixels = match sensor_intermediate {
        Intermediate::ThreeColor(camera_rgb_pixels) => camera_rgb_pixels,
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

    let width = match u32::try_from(camera_rgb_pixels.width) {
        Ok(width) => width,
        Err(_) => return Err(anyhow!("raw intermediate width exceeds u32")),
    };

    let height = match u32::try_from(camera_rgb_pixels.height) {
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

    let mut pixels = Vec::with_capacity(pixel_count);

    for rgb in camera_rgb_pixels.pixels() {
        pixels.push(CameraSpaceRgbPixel {
            red: rgb[0],
            green: rgb[1],
            blue: rgb[2],
        });
    }

    CameraSpaceRgbImage::new(dimensions, pixels)
}

fn clip_negative_values(pixel: RgbPixel) -> RgbPixel {
    RgbPixel {
        red: pixel.red.max(0.0),
        green: pixel.green.max(0.0),
        blue: pixel.blue.max(0.0),
    }
}
