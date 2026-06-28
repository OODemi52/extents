mod decode;
mod raster;
mod raw;

pub use decode::decode_source_from_path;
pub use raster::{RasterSamples, RasterSource};
pub use raw::{RawCfaPattern, RawColorMatrixAnchor, RawLevels, RawRect, RawSamples, RawSource};

/// Decoded source-domain image data before GPU upload or development.
///
/// Raster and RAW inputs stay distinct here because they carry different source
/// samples, metadata, and development requirements.
#[derive(Debug, Clone)]
pub enum ImageSource {
    Raster(RasterSource),
    Raw(RawSource),
}
