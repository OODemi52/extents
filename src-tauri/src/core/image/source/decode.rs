use anyhow::{Context, Result};
use image::RgbaImage;

use super::{ImageSource, RasterSource, RawSource};
use crate::core::image::decode::is_supported_raw_extension;
use crate::core::image::orientation::{
    resolve_raster_file_orientation, resolve_raw_file_orientation,
};

/// Decodes an image file into source-domain image data.
///
/// This is the source-side ingest entry point for the GPU development path. It
/// classifies the file, decodes source samples, and preserves source metadata
/// without converting into the processing pipeline working representation.
pub fn decode_source_from_path(path: &str) -> Result<ImageSource> {
    if is_supported_raw_extension(path) {
        let raw = match decode_raw_source(path) {
            Ok(raw) => raw,
            Err(error) => return Err(error),
        };

        return Ok(ImageSource::Raw(raw));
    }

    let raster = match decode_raster_source(path) {
        Ok(raster) => raster,
        Err(error) => return Err(error),
    };

    Ok(ImageSource::Raster(raster))
}

/// Decodes a raster file into source-domain raster data.
///
/// Raster sources currently follow the app's existing decode contract and
/// collapse decoded samples to RGBA8. ICC profile preservation and higher
/// source precision should widen this later.
fn decode_raster_source(path: &str) -> Result<RasterSource> {
    let pixels = match decode_raster_file(path) {
        Ok(pixels) => pixels,
        Err(error) => return Err(error),
    };

    let orientation = match resolve_raster_file_orientation(path) {
        Ok(orientation) => orientation,
        Err(error) => return Err(error),
    };

    match RasterSource::from_rgba8(pixels, orientation, None) {
        Ok(source) => Ok(source),
        Err(error) => Err(error),
    }
}

/// Decodes a raster image file into an RGBA8 pixel buffer.
fn decode_raster_file(path: &str) -> Result<RgbaImage> {
    let image_result = image::open(path);

    let image = match image_result.with_context(|| format!("Failed to decode image: {}", path)) {
        Ok(image) => image,
        Err(error) => return Err(error),
    };

    Ok(image.into_rgba8())
}

/// Decodes a RAW file into source-domain RAW sensor data.
fn decode_raw_source(path: &str) -> Result<RawSource> {
    let raw_image = match decode_raw_file(path) {
        Ok(raw_image) => raw_image,
        Err(error) => return Err(error),
    };

    let orientation = match resolve_raw_file_orientation(path) {
        Ok(orientation) => orientation,
        Err(error) => return Err(error),
    };

    match RawSource::from_raw_image(&raw_image, orientation) {
        Ok(source) => Ok(source),
        Err(error) => Err(error),
    }
}

/// Decodes a RAW file into rawler's decoded RAW image representation.
fn decode_raw_file(path: &str) -> Result<rawler::RawImage> {
    let raw_image_result = rawler::decode_file(path);

    match raw_image_result.with_context(|| format!("Failed to decode raw image: {}", path)) {
        Ok(raw_image) => Ok(raw_image),
        Err(error) => Err(error),
    }
}
