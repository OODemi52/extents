use anyhow::Result;
use image::RgbaImage;

use crate::core::image::orientation::Orientation;
use crate::core::processing_pipeline::types::ImageDimensions;

/// CPU-side raster payload intended for GPU source upload.
///
/// This currently models the app's existing raster decode behavior: raster
/// inputs are decoded to 8-bit RGBA before normalization. Preserving source bit
/// depth and ICC profile bytes should widen this contract later.
#[derive(Debug, Clone)]
pub struct RasterSource {
    samples: RasterSamples,
    dimensions: ImageDimensions,
    orientation: Option<Orientation>,
    icc_profile: Option<Vec<u8>>,
}

impl RasterSource {
    /// Builds a raster source from decoded 8-bit RGBA pixels.
    pub fn from_rgba8(
        pixels: RgbaImage,
        orientation: Option<Orientation>,
        icc_profile: Option<Vec<u8>>,
    ) -> Result<Self> {
        let (width, height) = pixels.dimensions();
        let dimensions = match ImageDimensions::new(width, height) {
            Ok(dimensions) => dimensions,
            Err(error) => return Err(error),
        };

        Ok(Self {
            samples: RasterSamples::Rgba8(pixels),
            dimensions,
            orientation,
            icc_profile,
        })
    }

    /// Returns the decoded raster samples.
    pub fn samples(&self) -> &RasterSamples {
        &self.samples
    }

    /// Returns the decoded raster dimensions.
    pub fn dimensions(&self) -> ImageDimensions {
        self.dimensions
    }

    /// Returns the orientation transform that still needs to be applied.
    pub fn orientation(&self) -> Option<Orientation> {
        self.orientation
    }

    /// Returns the embedded ICC profile bytes, if preserved during decode.
    pub fn icc_profile(&self) -> Option<&[u8]> {
        self.icc_profile.as_deref()
    }
}

/// Raster sample storage before GPU upload.
#[derive(Debug, Clone)]
pub enum RasterSamples {
    Rgba8(RgbaImage),
}

impl RasterSamples {
    /// Returns the number of pixels in the raster sample payload.
    pub fn pixel_count(&self) -> usize {
        match self {
            Self::Rgba8(pixels) => pixels.pixels().len(),
        }
    }

    /// Returns true when the sample payload is empty.
    pub fn is_empty(&self) -> bool {
        self.pixel_count() == 0
    }
}
