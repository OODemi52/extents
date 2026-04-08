mod decode;
mod ingest;
mod normalize;
pub mod types;

pub use ingest::ingest_from_path;
pub use types::{AlphaPlane, ImageDimensions, ProcessingPipelineImage, RgbPixel, WorkingImage};
