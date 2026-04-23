use rawler::imgop::develop::{Intermediate, ProcessingStep, RawDevelop};
use rawler::RawImage;

/// Runs the sensor-domain RAW development steps still delegated to rawler.
///
/// This currently stops after rescale, demosaic, and crop so app-owned white
/// balance, calibration, and headroom handling can be layered on next.
pub(super) fn develop_raw_intermediate(raw_image: &RawImage) -> rawler::Result<Intermediate> {
    let raw_develop_pipeline = RawDevelop {
        steps: vec![
            ProcessingStep::Rescale,
            ProcessingStep::Demosaic,
            ProcessingStep::CropActiveArea,
            ProcessingStep::CropDefault,
        ],
    };

    raw_develop_pipeline.develop_intermediate(raw_image)
}
