use anyhow::{anyhow, Result};
use image::RgbaImage;

use super::processing_graph::SourceKind;
use crate::core::image::orientation::{apply_orientation, Orientation};
use crate::core::image::source::{
    decode_source_from_path, ImageSource, RasterSamples, RasterSource,
};
use crate::core::image::ImageDimensions;

/// Renderer-ready input built from source-domain image data.
///
/// This keeps the CPU-side source upload payload together with the graph
/// development source kind and display intent needed by the live renderer.
pub(super) struct Input {
    image: InputImage,
    source_kind: SourceKind,
    display_intent: DisplayIntent,
}

impl Input {
    /// Returns the CPU-side source payload to upload into graph resources.
    pub(super) fn image(&self) -> &InputImage {
        &self.image
    }

    /// Returns how the development stage should interpret the uploaded source.
    pub(super) fn source_kind(&self) -> SourceKind {
        self.source_kind
    }

    /// Returns how this input should be transformed for display.
    pub(super) fn display_intent(&self) -> DisplayIntent {
        self.display_intent
    }
}

/// CPU-side texel payload used for renderer source upload.
pub(super) struct InputImage {
    texels: Vec<f32>,
    dimensions: ImageDimensions,
    has_transparency: bool,
}

impl InputImage {
    /// Returns packed source texels as a read-only slice.
    pub(super) fn texels(&self) -> &[f32] {
        &self.texels
    }

    /// Returns the source image dimensions represented by this upload payload.
    pub(super) fn dimensions(&self) -> ImageDimensions {
        self.dimensions
    }

    /// Returns whether any texel in this renderer input contains transparency.
    pub(super) fn has_transparency(&self) -> bool {
        self.has_transparency
    }
}

/// Controls how graph output should be rendered for display.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum DisplayIntent {
    DirectSdr,
}

/// Builds renderer-ready image data from a source image path.
pub(super) fn build_input_from_path(path: &str) -> Result<Input> {
    let source = match decode_source_from_path(path) {
        Ok(source) => source,
        Err(error) => return Err(error),
    };

    match source {
        ImageSource::Raster(raster) => build_raster_input(raster),
        ImageSource::Raw(_) => Err(anyhow!(
            "GPU RAW development is not implemented for renderer source input yet"
        )),
    }
}

fn build_raster_input(raster: RasterSource) -> Result<Input> {
    let (samples, _, orientation, _) = raster.into_parts();

    let mut pixels = match samples {
        RasterSamples::Rgba8(pixels) => pixels,
    };

    if let Some(orientation) = orientation {
        pixels = match apply_orientation_to_rgba(pixels, orientation) {
            Ok(pixels) => pixels,
            Err(error) => return Err(error),
        };
    }

    let image = match build_rgba8_input_image(pixels) {
        Ok(image) => image,
        Err(error) => return Err(error),
    };

    Ok(Input {
        image,
        source_kind: SourceKind::RasterSrgb,
        display_intent: DisplayIntent::DirectSdr,
    })
}

fn build_rgba8_input_image(pixels: RgbaImage) -> Result<InputImage> {
    let (width, height) = pixels.dimensions();
    let dimensions = match ImageDimensions::new(width, height) {
        Ok(dimensions) => dimensions,
        Err(error) => return Err(error),
    };

    let pixel_count = match dimensions.pixel_count() {
        Ok(pixel_count) => pixel_count,
        Err(error) => return Err(error),
    };

    let mut texels = Vec::with_capacity(pixel_count * 4);
    let mut has_transparency = false;

    for rgba in pixels.pixels() {
        texels.push(u8_to_normalized_f32(rgba[0]));
        texels.push(u8_to_normalized_f32(rgba[1]));
        texels.push(u8_to_normalized_f32(rgba[2]));

        let alpha = u8_to_normalized_f32(rgba[3]);

        if alpha < 1.0 {
            has_transparency = true;
        }

        texels.push(alpha);
    }

    Ok(InputImage {
        texels,
        dimensions,
        has_transparency,
    })
}

fn apply_orientation_to_rgba(image: RgbaImage, orientation: Orientation) -> Result<RgbaImage> {
    let (width, height) = image.dimensions();
    let pixels: Vec<_> = image.pixels().copied().collect();

    let (oriented_pixels, oriented_width, oriented_height) =
        match apply_orientation(pixels, width, height, orientation) {
            Ok(oriented) => oriented,
            Err(error) => return Err(error),
        };

    Ok(RgbaImage::from_fn(
        oriented_width,
        oriented_height,
        |x, y| oriented_pixels[((y * oriented_width) + x) as usize],
    ))
}

/// Converts an 8-bit channel value into a normalized `f32` in the range `0.0..=1.0`.
fn u8_to_normalized_f32(value: u8) -> f32 {
    value as f32 / 255.0
}
