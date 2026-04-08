use anyhow::Result;

use super::decode::decode_source_from_path;
use super::normalize::normalize_decoded_source;
use crate::core::processing_pipeline::types::ProcessingPipelineImage;

/// Ingests an image file from disk and produces the canonical processing-pipeline image.
///
/// This function is the public entry point for file ingest. It is responsible for
/// classifying the source, decoding it into an intermediate representation, and
/// normalizing that representation into canonical pipeline state.
pub fn ingest_from_path(path: &str) -> Result<ProcessingPipelineImage> {
    let decoded_image = match decode_source_from_path(path) {
        Ok(decoded_image) => decoded_image,
        Err(error) => return Err(error),
    };

    normalize_decoded_source(decoded_image)
}
