//! Output sizing and GPU readback shared by offscreen rendering and inspection.

mod capture;
mod downsample;
mod readback;

use anyhow::{ensure, Result};
use serde::Serialize;

pub(in crate::renderer) use capture::read_output_image;

/// A provisional default for fitted previews, not a processing-resolution limit.
pub const DEFAULT_PREVIEW_LONG_EDGE: u32 = 1600;

/// Selects the size of the returned image; source development remains full-size.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(
    tag = "mode",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum RenderSize {
    Full,
    Fit { max_long_edge: u32 },
}

/// Output settings for the current RGBA8 sRGB readback path.
/// Color-space and bit-depth choices can be added when those paths are supported.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderSettings {
    pub size: RenderSize,
}

impl Default for RenderSettings {
    fn default() -> Self {
        Self {
            size: RenderSize::Fit {
                max_long_edge: DEFAULT_PREVIEW_LONG_EDGE,
            },
        }
    }
}

impl RenderSettings {
    pub(in crate::renderer) fn validate(&self) -> Result<()> {
        if let RenderSize::Fit { max_long_edge } = self.size {
            ensure!(
                max_long_edge > 0,
                "maximum long edge must be greater than zero"
            );
        }
        Ok(())
    }

    fn dimensions(&self, width: u32, height: u32) -> Result<(u32, u32)> {
        self.validate()?;
        ensure!(
            width > 0 && height > 0,
            "cannot read an empty output texture"
        );
        let RenderSize::Fit { max_long_edge } = self.size else {
            return Ok((width, height));
        };
        let long_edge = width.max(height);
        if long_edge <= max_long_edge {
            return Ok((width, height));
        }
        let scale = max_long_edge as f32 / long_edge as f32;
        Ok((
            ((width as f32 * scale).round() as u32).max(1),
            ((height as f32 * scale).round() as u32).max(1),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sizing_preserves_source_or_fits_without_upscaling() -> Result<()> {
        let full = RenderSettings {
            size: RenderSize::Full,
        };
        assert_eq!(full.dimensions(6000, 4000)?, (6000, 4000));
        let fitted = RenderSettings {
            size: RenderSize::Fit {
                max_long_edge: 1200,
            },
        };
        assert_eq!(fitted.dimensions(6000, 4000)?, (1200, 800));
        assert_eq!(fitted.dimensions(4000, 6000)?, (800, 1200));
        assert_eq!(fitted.dimensions(300, 200)?, (300, 200));
        assert!(fitted.dimensions(0, 200).is_err());
        assert!(RenderSettings {
            size: RenderSize::Fit { max_long_edge: 0 }
        }
        .validate()
        .is_err());
        Ok(())
    }
}
