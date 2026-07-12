mod capture;
mod downsample;
mod image;
mod pipeline;
mod readback;
mod snapshot;
mod texture;
mod timing;

pub(in crate::renderer) use capture::capture_output_png;
pub use image::{ImageInspection, RawImageInspection};
pub use pipeline::PipelineInspection;
pub use snapshot::InspectionSnapshot;
pub use texture::{TextureInspection, TextureResourceInspection};
pub use timing::TimingInspection;
