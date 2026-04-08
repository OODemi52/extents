use anyhow::Result;
use image::RgbaImage;

use crate::core::image::orientation::Orientation;
use crate::core::processing_pipeline::types::{ImageDimensions, ProcessingPipelineImage};

/// A decoded source image prior to normalization into canonical pipeline state.
///
/// Raster and RAW inputs are kept distinct at this stage because they carry
/// different source-domain information and require different normalization steps.
enum DecodedSource {
    Raster(DecodedRaster),
    Raw(DecodedRaw),
}

/// A decoded raster image prior to normalization.
///
/// The raster payload contains decoded RGBA pixels together with the metadata
/// needed to normalize the image into the pipeline working representation.
struct DecodedRaster {
    dimensions: ImageDimensions,
    pixels: RgbaImage,
    orientation: Option<Orientation>,
    icc_profile: Option<Vec<u8>>,
}

/// A decoded RAW image prior to normalization.
///
/// The RAW payload preserves RAW-specific decoded source data and metadata so
/// normalization can produce a canonical working image without relying on a
/// display-oriented output contract.
struct DecodedRaw {
    raw_image: rawler::RawImage,
    metadata: RawCameraMetadata,
}

/// RAW-side metadata needed during normalization.
///
/// This is a project-owned wrapper around the subset of RAW metadata the
/// processing pipeline needs in order to normalize RAW input correctly.
struct RawCameraMetadata {
    make: String,
    model: String,
    orientation: Option<Orientation>,
}
