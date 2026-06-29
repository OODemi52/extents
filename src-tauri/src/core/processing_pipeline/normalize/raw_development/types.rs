use anyhow::{bail, Result};

use crate::core::image::ImageDimensions;

/// A single demosaiced camera-space RGB pixel.
///
/// These channel values are still in the camera's native RGB basis after
/// rescale/demosaic/crop. They are not yet white-balanced, calibrated into a
/// standard RGB space, or converted into the pipeline working space.
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct CameraSpaceRgbPixel {
    pub red: f32,
    pub green: f32,
    pub blue: f32,
}

/// A demosaiced camera-space RGB image used only during RAW normalization.
#[derive(Debug, Clone)]
pub struct CameraSpaceRgbImage {
    dimensions: ImageDimensions,
    pixels: Vec<CameraSpaceRgbPixel>,
}

impl CameraSpaceRgbImage {
    /// Creates a validated camera-space RGB image.
    ///
    /// Returns an error if the provided pixel buffer length does not match the
    /// number of pixels implied by `dimensions`.
    pub fn new(dimensions: ImageDimensions, pixels: Vec<CameraSpaceRgbPixel>) -> Result<Self> {
        let expected_pixel_count = match dimensions.pixel_count() {
            Ok(expected_pixel_count) => expected_pixel_count,
            Err(error) => return Err(error),
        };

        if pixels.len() != expected_pixel_count {
            bail!(
                "camera-space RGB image pixel count {} does not match dimensions {}x{}",
                pixels.len(),
                dimensions.width(),
                dimensions.height()
            );
        }

        Ok(Self { dimensions, pixels })
    }

    /// Returns the camera-space RGB pixels as a read-only slice.
    pub fn pixels(&self) -> &[CameraSpaceRgbPixel] {
        &self.pixels
    }

    /// Returns the image dimensions.
    pub fn dimensions(&self) -> &ImageDimensions {
        &self.dimensions
    }
}
