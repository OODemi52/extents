use anyhow::{anyhow, Result};
use rawler::imgop::{Dim2, Point, Rect};
use rawler::rawimage::RawPhotometricInterpretation;
use rawler::{RawImage, RawImageData};

use crate::core::processing_pipeline::types::{ImageDimensions, RgbPixel};

const RAW_SATURATION_THRESHOLD: f32 = 0.995;
const RAW_HIGHLIGHT_MASK_RADIUS: usize = 1;

/// A crop-aligned mask of saturated RAW photosites projected onto output pixels.
#[derive(Debug, Clone)]
pub(super) struct RawHighlightMask {
    dimensions: ImageDimensions,
    samples: Vec<RawHighlightSample>,
}

impl RawHighlightMask {
    /// Creates a validated RAW highlight mask.
    fn new(dimensions: ImageDimensions, samples: Vec<RawHighlightSample>) -> Result<Self> {
        let expected_pixel_count = dimensions.pixel_count()?;

        if samples.len() != expected_pixel_count {
            return Err(anyhow!(
                "raw highlight mask sample count {} does not match dimensions {}x{}",
                samples.len(),
                dimensions.width(),
                dimensions.height()
            ));
        }

        Ok(Self {
            dimensions,
            samples,
        })
    }

    /// Returns the mask dimensions after active-area/default-crop alignment.
    pub(super) fn dimensions(&self) -> &ImageDimensions {
        &self.dimensions
    }

    /// Returns the per-pixel saturated-channel samples.
    pub(super) fn samples(&self) -> &[RawHighlightSample] {
        &self.samples
    }

    /// Returns true when any output pixel is marked as RAW-clipped.
    fn has_saturated_samples(&self) -> bool {
        self.samples.iter().any(|sample| sample.any())
    }
}

/// Saturated RAW channels that contributed to a demosaiced output pixel.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub(super) struct RawHighlightSample {
    red: bool,
    green: bool,
    blue: bool,
}

impl RawHighlightSample {
    /// Returns true when at least one RGB channel is marked saturated.
    fn any(self) -> bool {
        self.red || self.green || self.blue
    }

    /// Returns how many RGB channels are marked saturated.
    fn saturated_channel_count(self) -> usize {
        usize::from(self.red) + usize::from(self.green) + usize::from(self.blue)
    }

    /// Marks one RGB channel as saturated.
    fn mark_channel(&mut self, channel: usize) {
        match channel {
            0 => self.red = true,
            1 => self.green = true,
            2 => self.blue = true,
            _ => {}
        }
    }
}

/// Builds a highlight mask from pre-demosaic RAW samples.
///
/// This intentionally runs before rawler demosaics the image. Once demosaic has
/// interpolated missing channels, clipped photosites are smeared into neighbors
/// and become harder to distinguish from real scene color.
pub(super) fn build_raw_highlight_mask(raw_image: &RawImage) -> Result<Option<RawHighlightMask>> {
    let cfa = match &raw_image.photometric {
        RawPhotometricInterpretation::Cfa(config) if config.cfa.is_rgb() && raw_image.cpp == 1 => {
            &config.cfa
        }
        _ => return Ok(None),
    };

    let mut scaled_raw_image = raw_image.clone();
    if let Err(error) = scaled_raw_image.apply_scaling() {
        return Err(anyhow!("raw highlight mask scaling failed: {error}"));
    }

    let scaled_samples = match &scaled_raw_image.data {
        RawImageData::Float(samples) => samples,
        RawImageData::Integer(_) => {
            return Err(anyhow!(
                "raw highlight mask expected scaled floating-point RAW samples"
            ));
        }
    };

    let active_rect = raw_image
        .active_area
        .unwrap_or_else(|| Rect::new(Point::zero(), Dim2::new(raw_image.width, raw_image.height)));
    let shifted_cfa = cfa.shift(active_rect.x(), active_rect.y());
    let mut samples =
        vec![RawHighlightSample::default(); active_rect.width() * active_rect.height()];

    for row in 0..active_rect.height() {
        let source_y = active_rect.y() + row;
        let source_row_offset = source_y * raw_image.width;

        for column in 0..active_rect.width() {
            let source_x = active_rect.x() + column;
            let sample = scaled_samples[source_row_offset + source_x];

            if sample.is_finite() && sample >= RAW_SATURATION_THRESHOLD {
                let channel = shifted_cfa.color_at(row, column);

                mark_saturated_neighborhood(
                    &mut samples,
                    active_rect.width(),
                    active_rect.height(),
                    row,
                    column,
                    channel,
                );
            }
        }
    }

    let (dimensions, samples) = apply_default_crop_to_mask(raw_image, active_rect.d, samples)?;
    let mask = RawHighlightMask::new(dimensions, samples)?;

    if mask.has_saturated_samples() {
        Ok(Some(mask))
    } else {
        Ok(None)
    }
}

/// Suppresses false chroma in a working-space pixel flagged by the RAW mask.
///
/// This is deliberately conservative: it does not try to invent missing
/// texture/detail yet. It only pulls clipped highlights toward Rec.2020
/// luminance so one clipped channel does not become a purple/cyan/yellow
/// display color after white balance and camera calibration.
pub(super) fn reconstruct_working_space_highlight(
    pixel: RgbPixel,
    highlight_sample: RawHighlightSample,
) -> RgbPixel {
    if !highlight_sample.any() {
        return pixel;
    }

    let max_channel = pixel.red.max(pixel.green).max(pixel.blue);
    if max_channel <= 0.0 {
        return pixel;
    }

    let brightness_weight = smoothstep(0.75, 1.25, max_channel);
    if brightness_weight <= 0.0 {
        return pixel;
    }

    let clipped_channel_ratio = highlight_sample.saturated_channel_count() as f32 / 3.0;
    let reconstruction_strength =
        ((0.35 + (0.55 * clipped_channel_ratio)) * brightness_weight).clamp(0.0, 0.9);
    let neutral_luminance = rec2020_luminance(pixel);

    RgbPixel {
        red: lerp(pixel.red, neutral_luminance, reconstruction_strength),
        green: lerp(pixel.green, neutral_luminance, reconstruction_strength),
        blue: lerp(pixel.blue, neutral_luminance, reconstruction_strength),
    }
}

fn mark_saturated_neighborhood(
    samples: &mut [RawHighlightSample],
    width: usize,
    height: usize,
    row: usize,
    column: usize,
    channel: usize,
) {
    let row_start = row.saturating_sub(RAW_HIGHLIGHT_MASK_RADIUS);
    let row_end = (row + RAW_HIGHLIGHT_MASK_RADIUS).min(height.saturating_sub(1));
    let column_start = column.saturating_sub(RAW_HIGHLIGHT_MASK_RADIUS);
    let column_end = (column + RAW_HIGHLIGHT_MASK_RADIUS).min(width.saturating_sub(1));

    for sample_row in row_start..=row_end {
        for sample_column in column_start..=column_end {
            samples[(sample_row * width) + sample_column].mark_channel(channel);
        }
    }
}

fn apply_default_crop_to_mask(
    raw_image: &RawImage,
    active_dimensions: Dim2,
    samples: Vec<RawHighlightSample>,
) -> Result<(ImageDimensions, Vec<RawHighlightSample>)> {
    let mut dimensions = active_dimensions;
    let mut samples = samples;

    if let Some(mut crop) = raw_image.crop_area.or(raw_image.active_area) {
        crop = crop.adapt(&raw_image.active_area.unwrap_or(crop));

        if crop.d != dimensions {
            samples = crop_mask_samples(&samples, dimensions, crop);
            dimensions = crop.d;
        }
    }

    let width = match u32::try_from(dimensions.w) {
        Ok(width) => width,
        Err(_) => return Err(anyhow!("raw highlight mask width exceeds u32")),
    };
    let height = match u32::try_from(dimensions.h) {
        Ok(height) => height,
        Err(_) => return Err(anyhow!("raw highlight mask height exceeds u32")),
    };

    Ok((ImageDimensions::new(width, height)?, samples))
}

fn crop_mask_samples(
    samples: &[RawHighlightSample],
    dimensions: Dim2,
    crop: Rect,
) -> Vec<RawHighlightSample> {
    let mut cropped_samples = Vec::with_capacity(crop.width() * crop.height());

    for row in crop.y()..crop.y() + crop.height() {
        let row_start = (row * dimensions.w) + crop.x();
        let row_end = row_start + crop.width();

        cropped_samples.extend_from_slice(&samples[row_start..row_end]);
    }

    cropped_samples
}

fn rec2020_luminance(pixel: RgbPixel) -> f32 {
    (0.26270021201126703 * pixel.red)
        + (0.67799807151887100 * pixel.green)
        + (0.05930171646986194 * pixel.blue)
}

fn smoothstep(edge0: f32, edge1: f32, value: f32) -> f32 {
    let t = ((value - edge0) / (edge1 - edge0)).clamp(0.0, 1.0);

    t * t * (3.0 - (2.0 * t))
}

fn lerp(start: f32, end: f32, amount: f32) -> f32 {
    start + ((end - start) * amount)
}
