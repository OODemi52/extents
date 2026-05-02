use anyhow::Result;
use rawler::RawImage;

use super::color_matrix::{
    apply_camera_space_to_working_space_transform, build_camera_space_to_working_space_matrix,
    CameraSpaceToWorkingSpaceMatrix,
};
use super::types::CameraSpaceRgbPixel;
use super::white_balance::{resolve_raw_white_balance, RawWhiteBalance};
use crate::core::processing_pipeline::types::RgbPixel;

/// RAW color transform needed to map camera-space RGB into working-space RGB.
///
/// This currently preserves the existing behavior: apply headroom-normalized
/// as-shot white balance, then apply the camera-space to Rec.2020 working-space
/// matrix. Future profile interpolation and chromatic adaptation should be
/// composed here instead of in the RAW development loop.
pub(super) struct RawColorTransform {
    white_balance: RawWhiteBalance,
    camera_space_to_working_space_matrix: CameraSpaceToWorkingSpaceMatrix,
}

impl RawColorTransform {
    /// Applies this RAW color transform to one demosaiced camera-space RGB pixel.
    pub(super) fn apply_to_camera_space_rgb(&self, pixel: CameraSpaceRgbPixel) -> RgbPixel {
        let white_balanced_camera_space_rgb = self.white_balance.apply_to_camera_space_rgb(pixel);

        apply_camera_space_to_working_space_transform(
            white_balanced_camera_space_rgb,
            &self.camera_space_to_working_space_matrix,
        )
    }
}

/// Builds a RAW color transform from the decoded RAW metadata.
pub(super) fn build_raw_color_transform(raw_image: &RawImage) -> Result<RawColorTransform> {
    let white_balance = resolve_raw_white_balance(raw_image);

    let camera_space_to_working_space_matrix =
        match build_camera_space_to_working_space_matrix(raw_image) {
            Ok(camera_space_to_working_space_matrix) => camera_space_to_working_space_matrix,
            Err(error) => return Err(error),
        };

    Ok(RawColorTransform {
        white_balance,
        camera_space_to_working_space_matrix,
    })
}
