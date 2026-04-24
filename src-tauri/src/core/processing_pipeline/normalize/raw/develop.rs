use anyhow::{anyhow, Result};
use rawler::imgop::develop::{Intermediate, ProcessingStep, RawDevelop};
use rawler::imgop::matrix::{multiply, normalize, pseudo_inverse};
use rawler::imgop::xyz::{Illuminant, SRGB_TO_XYZ_D65};
use rawler::RawImage;

use super::types::{CameraRgbImage, CameraRgbPixel, LinearSrgbImage, LinearSrgbPixel};
use crate::core::processing_pipeline::types::ImageDimensions;

type Matrix3 = [[f32; 3]; 3];

/// Runs the remaining RAW development stages and returns a calibrated linear
/// sRGB image without overflow folding.
///
/// Sensor-domain rescale/demosaic/crop are still delegated to rawler. White
/// balance and camera calibration are owned here so we preserve highlight
/// headroom instead of inheriting rawler's overflow shaping.
pub(super) fn develop_linear_srgb_image(raw_image: &RawImage) -> Result<LinearSrgbImage> {
    let camera_rgb_image = develop_camera_rgb_image(raw_image)?;
    let linear_white_balance = resolve_white_balance(raw_image);
    let xyz_to_camera = d65_xyz_to_camera_matrix(raw_image)?;
    let rgb_to_camera = normalize(multiply(&xyz_to_camera, &SRGB_TO_XYZ_D65));
    let camera_to_linear_srgb = pseudo_inverse(rgb_to_camera);

    let dimensions = *camera_rgb_image.dimensions();
    let pixel_count = match dimensions.pixel_count() {
        Ok(pixel_count) => pixel_count,
        Err(error) => return Err(error),
    };

    let mut pixels = Vec::with_capacity(pixel_count);

    for pixel in camera_rgb_image.pixels() {
        let white_balanced_camera_rgb = apply_white_balance(*pixel, linear_white_balance);
        let linear_srgb_pixel =
            apply_camera_to_linear_srgb_transform(white_balanced_camera_rgb, camera_to_linear_srgb);

        pixels.push(clip_negative(linear_srgb_pixel));
    }

    LinearSrgbImage::new(dimensions, pixels)
}

/// Runs the sensor-domain RAW development steps still delegated to rawler.
fn develop_camera_rgb_image(raw_image: &RawImage) -> Result<CameraRgbImage> {
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
        pixels.push(CameraRgbPixel {
            red: rgb[0],
            green: rgb[1],
            blue: rgb[2],
        });
    }

    CameraRgbImage::new(dimensions, pixels)
}

fn resolve_white_balance(raw_image: &RawImage) -> [f32; 3] {
    let white_balance = if raw_image.wb_coeffs[0].is_nan() {
        [1.0, 1.0, 1.0, 1.0]
    } else {
        raw_image.wb_coeffs
    };

    [white_balance[0], white_balance[1], white_balance[2]]
}

fn d65_xyz_to_camera_matrix(raw_image: &RawImage) -> Result<Matrix3> {
    let d65_xyz_to_camera = match raw_image.color_matrix.get(&Illuminant::D65) {
        Some(d65_xyz_to_camera) => d65_xyz_to_camera,
        None => return Err(anyhow!("raw image is missing a D65 color matrix")),
    };

    if d65_xyz_to_camera.len() != 9 {
        return Err(anyhow!(
            "raw normalization currently only supports 3-channel D65 color matrices, got {} values",
            d65_xyz_to_camera.len()
        ));
    }

    let mut xyz_to_camera = [[0.0; 3]; 3];
    for row in 0..3 {
        for column in 0..3 {
            xyz_to_camera[row][column] = d65_xyz_to_camera[(row * 3) + column];
        }
    }

    Ok(xyz_to_camera)
}

fn apply_white_balance(pixel: CameraRgbPixel, white_balance: [f32; 3]) -> CameraRgbPixel {
    CameraRgbPixel {
        red: pixel.red * white_balance[0],
        green: pixel.green * white_balance[1],
        blue: pixel.blue * white_balance[2],
    }
}

fn apply_camera_to_linear_srgb_transform(pixel: CameraRgbPixel, camera_to_linear_srgb: Matrix3) -> LinearSrgbPixel {
    LinearSrgbPixel {
        red: (camera_to_linear_srgb[0][0] * pixel.red)
            + (camera_to_linear_srgb[0][1] * pixel.green)
            + (camera_to_linear_srgb[0][2] * pixel.blue),
        green: (camera_to_linear_srgb[1][0] * pixel.red)
            + (camera_to_linear_srgb[1][1] * pixel.green)
            + (camera_to_linear_srgb[1][2] * pixel.blue),
        blue: (camera_to_linear_srgb[2][0] * pixel.red)
            + (camera_to_linear_srgb[2][1] * pixel.green)
            + (camera_to_linear_srgb[2][2] * pixel.blue),
    }
}

fn clip_negative(pixel: LinearSrgbPixel) -> LinearSrgbPixel {
    LinearSrgbPixel {
        red: pixel.red.max(0.0),
        green: pixel.green.max(0.0),
        blue: pixel.blue.max(0.0),
    }
}
