mod raster;
mod raw;

use anyhow::Result;

use super::processing_graph::DevelopmentParameters;
use crate::core::image::source::{decode_source_from_path, ImageSource};
use crate::core::image::ImageDimensions;

/// Renderer-ready input built from source-domain image data.
///
/// This keeps the CPU-side source upload payload together with the graph
/// development pipeline selection, development parameters, and display intent
/// needed by the live renderer.
pub(super) struct Input {
    image: InputImage,
    development_source: DevelopmentSource,
    development_parameters: DevelopmentParameters,
    output_transform: OutputTransformSettings,
}

impl Input {
    /// Builds renderer input from an upload payload and processing metadata.
    pub(in crate::renderer) fn new(
        image: InputImage,
        development_source: DevelopmentSource,
        development_parameters: DevelopmentParameters,
        output_transform: OutputTransformSettings,
    ) -> Self {
        Self {
            image,
            development_source,
            development_parameters,
            output_transform,
        }
    }

    /// Returns the CPU-side source payload to upload into graph resources.
    pub(super) fn image(&self) -> &InputImage {
        &self.image
    }

    /// Returns which development pipeline should process the uploaded source.
    pub(super) fn development_source(&self) -> DevelopmentSource {
        self.development_source
    }

    /// Returns the GPU development parameters for the uploaded source.
    pub(super) fn development_parameters(&self) -> DevelopmentParameters {
        self.development_parameters
    }

    /// Returns how this input should be transformed for display.
    pub(super) fn output_transform(&self) -> OutputTransformSettings {
        self.output_transform
    }
}

/// CPU-side texel payload used for renderer source upload.
pub(super) struct InputImage {
    texels: Vec<f32>,
    dimensions: ImageDimensions,
    has_transparency: bool,
}

impl InputImage {
    /// Builds a renderer source-upload payload.
    pub(in crate::renderer) fn new(
        texels: Vec<f32>,
        dimensions: ImageDimensions,
        has_transparency: bool,
    ) -> Self {
        Self {
            texels,
            dimensions,
            has_transparency,
        }
    }

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

/// Selects the graph development pipeline for renderer source input.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(in crate::renderer) enum DevelopmentSource {
    RasterSrgb,
    RawBayer2x2,
}

/// Controls how graph output should be rendered for display.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum DisplayIntent {
    DirectSdr,
    ToneMapToSdr,
}

/// Output-transform settings selected for renderer input display.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(super) struct OutputTransformSettings {
    display_intent: DisplayIntent,
    base_exposure_ev: f32,
}

impl OutputTransformSettings {
    /// Builds output settings for display-referred SDR input.
    pub(super) fn direct_sdr() -> Self {
        Self {
            display_intent: DisplayIntent::DirectSdr,
            base_exposure_ev: 0.0,
        }
    }

    /// Builds output settings for scene-linear input that should be tone-mapped to SDR.
    pub(super) fn tone_map_to_sdr(base_exposure_ev: f32) -> Self {
        Self {
            display_intent: DisplayIntent::ToneMapToSdr,
            base_exposure_ev,
        }
    }

    /// Returns the display-output routing mode.
    pub(super) fn display_intent(self) -> DisplayIntent {
        self.display_intent
    }

    /// Returns the baseline display exposure applied before tone mapping.
    pub(super) fn base_exposure_ev(self) -> f32 {
        self.base_exposure_ev
    }
}

/// Builds renderer-ready image data from a source image path.
pub(super) fn build_input_from_path(path: &str) -> Result<Input> {
    let source = match decode_source_from_path(path) {
        Ok(source) => source,
        Err(error) => return Err(error),
    };

    match source {
        ImageSource::Raster(raster) => raster::build_input(raster),
        ImageSource::Raw(raw) => raw::build_input(raw),
    }
}
