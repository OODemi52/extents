use std::path::Path;

use anyhow::{Context, Result};
use image::RgbaImage;

use crate::core::image::orientation::{resolve_file_orientation, Orientation};
use crate::core::processing_pipeline::types::ImageDimensions;

/// A decoded source image prior to normalization into canonical pipeline state.
///
/// Raster and RAW inputs are kept distinct at this stage because they carry
/// different source-domain information and require different normalization steps.
pub(super) enum DecodedSourceImage {
    Raster(DecodedRasterImage),
    Raw(DecodedRawImage),
}

/// A decoded raster image prior to normalization.
///
/// The raster payload contains decoded RGBA pixels together with the metadata
/// needed to normalize the image into the pipeline working representation.
pub(super) struct DecodedRasterImage {
    pub(super) dimensions: ImageDimensions,
    pub(super) pixels: RgbaImage,
    pub(super) orientation: Option<Orientation>,
    pub(super) icc_profile: Option<Vec<u8>>,
}

/// A decoded RAW image prior to normalization.
///
/// The RAW payload preserves RAW-specific decoded source data so
/// normalization can produce a canonical working image without relying on a
/// display-oriented output contract.
pub(super) struct DecodedRawImage {
    pub(super) raw_image: rawler::RawImage,
}

pub(super) fn decode_source_from_path(path: &str) -> Result<DecodedSourceImage> {
    if is_supported_raw_extension(path) {
        let raw = match decode_raw_source(path) {
            Ok(raw) => raw,
            Err(error) => return Err(error),
        };

        return Ok(DecodedSourceImage::Raw(raw));
    }

    let raster = match decode_raster_source(path) {
        Ok(raster) => raster,
        Err(error) => return Err(error),
    };

    Ok(DecodedSourceImage::Raster(raster))
}

fn is_supported_raw_extension(path: &str) -> bool {
    let ext = Path::new(path).extension().and_then(|value| value.to_str());

    let Some(ext) = ext else {
        return false;
    };

    rawler::decoders::supported_extensions()
        .iter()
        .any(|supported| supported.eq_ignore_ascii_case(ext))
}

/// Decodes a raster file into the raster-side intermediate ingest representation.
///
/// This performs file decode and extracts basic source metadata needed for
/// normalization, but does not yet apply orientation or convert into the
/// canonical pipeline working representation.
fn decode_raster_source(path: &str) -> Result<DecodedRasterImage> {
    let pixels = match decode_raster_file(path) {
        Ok(pixels) => pixels,
        Err(error) => return Err(error),
    };

    let (width, height) = pixels.dimensions();
    let dimensions = ImageDimensions::new(width, height)?;
    let orientation = resolve_file_orientation(path, false);

    Ok(DecodedRasterImage {
        dimensions,
        pixels,
        orientation,
        icc_profile: None,
    })
}

/// Decodes a raster image file into an RGBA pixel buffer.
fn decode_raster_file(path: &str) -> Result<RgbaImage> {
    let image_result = image::open(path);

    let image = match image_result.with_context(|| format!("Failed to decode image: {}", path)) {
        Ok(image) => image,
        Err(error) => return Err(error),
    };

    Ok(image.into_rgba8())
}

/// Decodes a RAW file into the RAW-side intermediate ingest representation.
fn decode_raw_source(path: &str) -> Result<DecodedRawImage> {
    let raw_image = match decode_raw_file(path) {
        Ok(raw_image) => raw_image,
        Err(error) => return Err(error),
    };

    Ok(DecodedRawImage { raw_image })
}

/// Decodes a RAW file into rawler's decoded RAW image representation.
fn decode_raw_file(path: &str) -> Result<rawler::RawImage> {
    let raw_image_result = rawler::decode_file(path);

    match raw_image_result.with_context(|| format!("Failed to decode raw image: {}", path)) {
        Ok(raw_image) => Ok(raw_image),
        Err(error) => Err(error),
    }
}
