mod convert;
mod raster;
mod raw;
mod raw_development;

use anyhow::Result;

use super::decode::DecodedSourceImage;
use super::types::ProcessingPipelineImage;

/// Normalizes a decoded source image into the canonical processing-pipeline representation.
pub(super) fn normalize_decoded_source(
    decoded_image: DecodedSourceImage,
) -> Result<ProcessingPipelineImage> {
    match decoded_image {
        DecodedSourceImage::Raster(raster) => raster::normalize_decoded_raster(raster),
        DecodedSourceImage::Raw(raw) => raw::normalize_decoded_raw(raw),
    }
}
