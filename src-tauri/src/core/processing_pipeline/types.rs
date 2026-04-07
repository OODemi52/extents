use anyhow::{bail, Result};

/// Non-zero image dimensions.
///
/// Instances must have `width > 0` and `height > 0`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ImageDimensions {
    width: u32,
    height: u32,
}

impl ImageDimensions {
    /// Creates validated image dimensions.
    ///
    /// Returns an error if either dimension is zero.
    pub fn new(width: u32, height: u32) -> Result<Self> {
        if width == 0 || height == 0 {
            bail!("image dimensions must be greater than zero");
        }

        Ok(Self { width, height })
    }

    /// Returns the image width in pixels.
    pub fn width(&self) -> u32 {
        self.width
    }

    /// Returns the image height in pixels.
    pub fn height(&self) -> u32 {
        self.height
    }

    /// Returns the number of pixels implied by these dimensions.
    ///
    /// Returns an error if `width * height` overflows `usize`.
    pub fn pixel_count(&self) -> Result<usize> {
        let width = self.width as usize;
        let height = self.height as usize;

        match width.checked_mul(height) {
            Some(pixel_count) => Ok(pixel_count),
            None => Err(anyhow::anyhow!("image dimensions overflow pixel count")),
        }
    }
}

/// A single scene-referred RGB pixel in the linear Rec.2020 working space.
///
/// Channel values are stored as `f32. Values can exceed 1.0.`
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct RgbPixel {
    pub red: f32,
    pub green: f32,
    pub blue: f32,
}

/// The canonical scene-referred working image used by the processing pipeline.
///
/// Pixels are stored as linear Rec.2020 `RgbPixel` values and must match the
/// declared image dimensions.
#[derive(Debug, Clone)]
pub struct WorkingImage {
    dimensions: ImageDimensions,
    pixels: Vec<RgbPixel>,
}

impl WorkingImage {
    /// Creates a validated working image.
    ///
    /// Returns an error if the provided pixel buffer length does not match the
    /// number of pixels implied by `dimensions`.
    pub fn new(dimensions: ImageDimensions, pixels: Vec<RgbPixel>) -> Result<Self> {
        let expected_pixel_count = match dimensions.pixel_count() {
            Ok(count) => count,
            Err(error) => return Err(error),
        };

        if pixels.len() != expected_pixel_count {
            bail!(
                "working image pixel count {} does not match dimensions {}x{}",
                pixels.len(),
                dimensions.width(),
                dimensions.height()
            );
        }

        Ok(Self { dimensions, pixels })
    }

    /// Returns the working image's pixels as a read-only slice.
    pub fn pixels(&self) -> &[RgbPixel] {
        &self.pixels
    }

    /// Returns the working image's pixels as a mutable slice.
    pub fn pixels_mut(&mut self) -> &mut [RgbPixel] {
        &mut self.pixels
    }

    /// Returns the image's dimensions.
    pub fn dimensions(&self) -> &ImageDimensions {
        &self.dimensions
    }
}

/// A per-pixel alpha plane aligned with an image grid.
///
/// Samples are stored as `f32` coverage values in the range `0.0..=1.0`.
#[derive(Debug, Clone)]
pub struct AlphaPlane {
    dimensions: ImageDimensions,
    samples: Vec<f32>,
}

impl AlphaPlane {
    /// Creates a validated alpha plane.
    ///
    /// Returns an error if the sample count does not match `dimensions` or if
    /// any sample falls outside the range `0.0..=1.0`.
    pub fn new(dimensions: ImageDimensions, samples: Vec<f32>) -> Result<Self> {
        let expected_sample_count = match dimensions.pixel_count() {
            Ok(count) => count,
            Err(error) => return Err(error),
        };

        if samples.len() != expected_sample_count {
            bail!(
                "alpha plane sample count {} does not match dimensions {}x{}",
                samples.len(),
                dimensions.width(),
                dimensions.height()
            );
        }

        for sample in &samples {
            if *sample < 0.0 || *sample > 1.0 {
                bail!("alpha plane samples must be in the range 0.0..=1.0");
            }
        }

        Ok(Self {
            dimensions,
            samples,
        })
    }

    /// Returns the alpha plane dimensions.
    pub fn dimensions(&self) -> &ImageDimensions {
        &self.dimensions
    }

    /// Returns the alpha samples as a read-only slice.
    pub fn samples(&self) -> &[f32] {
        &self.samples
    }

    /// Returns the alpha samples as a mutable slice.
    pub fn samples_mut(&mut self) -> &mut [f32] {
        &mut self.samples
    }
}

/// The full image representation carried through the processing pipeline.
///
/// Contains the canonical scene-referred working image and an optional alpha
/// plane that remains spatially aligned with the color data.
#[derive(Debug, Clone)]
pub struct ProcessingPipelineImage {
    color: WorkingImage,
    alpha: Option<AlphaPlane>,
}

impl ProcessingPipelineImage {
    /// Creates a validated processing pipeline image.
    ///
    /// Returns an error if the alpha plane dimensions do not match the working
    /// image dimensions.
    pub fn new(color: WorkingImage, alpha: Option<AlphaPlane>) -> Result<Self> {
        if let Some(alpha_plane) = &alpha {
            if alpha_plane.dimensions() != color.dimensions() {
                bail!(
                    "alpha plane dimensions {}x{} do not match working image dimensions {}x{}",
                    alpha_plane.dimensions().width(),
                    alpha_plane.dimensions().height(),
                    color.dimensions().width(),
                    color.dimensions().height()
                );
            }
        }

        Ok(Self { color, alpha })
    }

    /// Returns the working color image.
    pub fn color(&self) -> &WorkingImage {
        &self.color
    }

    /// Returns the working color image as mutable.
    pub fn color_mut(&mut self) -> &mut WorkingImage {
        &mut self.color
    }

    /// Returns the optional alpha plane.
    pub fn alpha(&self) -> Option<&AlphaPlane> {
        match &self.alpha {
            Some(alpha) => Some(alpha),
            None => None,
        }
    }

    /// Returns the optional alpha plane as mutable.
    pub fn alpha_mut(&mut self) -> Option<&mut AlphaPlane> {
        match &mut self.alpha {
            Some(alpha) => Some(alpha),
            None => None,
        }
    }

    /// Returns the working image's dimensions.
    pub fn dimensions(&self) -> &ImageDimensions {
        self.color.dimensions()
    }
}
