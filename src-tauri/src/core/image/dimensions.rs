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
