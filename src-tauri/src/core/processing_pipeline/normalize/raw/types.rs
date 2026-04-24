use anyhow::{bail, Result};

use crate::core::processing_pipeline::types::ImageDimensions;

/// A single demosaiced camera-space RGB pixel.
///
/// These channel values are still in the camera's native RGB basis after
/// rescale/demosaic/crop. They are not yet white-balanced, calibrated into a
/// standard RGB space, or converted into the pipeline working space.
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct CameraRgbPixel {
    pub red: f32,
    pub green: f32,
    pub blue: f32,
}

/// A demosaiced camera-space RGB image used only during RAW normalization.
#[derive(Debug, Clone)]
pub struct CameraRgbImage {
    dimensions: ImageDimensions,
    pixels: Vec<CameraRgbPixel>,
}

impl CameraRgbImage {
    /// Creates a validated camera-space RGB image.
    ///
    /// Returns an error if the provided pixel buffer length does not match the
    /// number of pixels implied by `dimensions`.
    pub fn new(dimensions: ImageDimensions, pixels: Vec<CameraRgbPixel>) -> Result<Self> {
        let expected_pixel_count = match dimensions.pixel_count() {
            Ok(expected_pixel_count) => expected_pixel_count,
            Err(error) => return Err(error),
        };

        if pixels.len() != expected_pixel_count {
            bail!(
                "camera RGB image pixel count {} does not match dimensions {}x{}",
                pixels.len(),
                dimensions.width(),
                dimensions.height()
            );
        }

        Ok(Self { dimensions, pixels })
    }

    /// Returns the camera-space RGB pixels as a read-only slice.
    pub fn pixels(&self) -> &[CameraRgbPixel] {
        &self.pixels
    }

    /// Returns the camera-space RGB pixels as a mutable slice.
    pub fn pixels_mut(&mut self) -> &mut [CameraRgbPixel] {
        &mut self.pixels
    }

    /// Returns the image dimensions.
    pub fn dimensions(&self) -> &ImageDimensions {
        &self.dimensions
    }
}

/// A single linear sRGB pixel produced by app-owned RAW calibration.
///
/// These channel values are white-balanced and calibrated into a standard
/// linear sRGB basis, but have not yet been converted into the pipeline
/// working space.
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct LinearSrgbPixel {
    pub red: f32,
    pub green: f32,
    pub blue: f32,
}

/// A linear sRGB image produced during RAW normalization before working-space
/// conversion.
#[derive(Debug, Clone)]
pub struct LinearSrgbImage {
    dimensions: ImageDimensions,
    pixels: Vec<LinearSrgbPixel>,
}

impl LinearSrgbImage {
    /// Creates a validated linear sRGB image.
    ///
    /// Returns an error if the provided pixel buffer length does not match the
    /// number of pixels implied by `dimensions`.
    pub fn new(dimensions: ImageDimensions, pixels: Vec<LinearSrgbPixel>) -> Result<Self> {
        let expected_pixel_count = match dimensions.pixel_count() {
            Ok(expected_pixel_count) => expected_pixel_count,
            Err(error) => return Err(error),
        };

        if pixels.len() != expected_pixel_count {
            bail!(
                "linear sRGB image pixel count {} does not match dimensions {}x{}",
                pixels.len(),
                dimensions.width(),
                dimensions.height()
            );
        }

        Ok(Self { dimensions, pixels })
    }

    /// Returns the linear sRGB pixels as a read-only slice.
    pub fn pixels(&self) -> &[LinearSrgbPixel] {
        &self.pixels
    }

    /// Returns the image dimensions.
    pub fn dimensions(&self) -> &ImageDimensions {
        &self.dimensions
    }
}
