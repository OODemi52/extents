use std::collections::HashMap;

use anyhow::{anyhow, Result};
use rawler::imgop::matrix::{multiply, normalize, pseudo_inverse};
use rawler::imgop::xyz::{FlatColorMatrix, Illuminant};
use rawler::RawImage;

use super::types::CameraSpaceRgbPixel;
use crate::core::processing_pipeline::types::RgbPixel;

/// A three-by-three color transform matrix.
type ColorMatrix3 = [[f32; 3]; 3];

/// A camera color matrix associated with one calibration illuminant.
#[derive(Debug, Clone, Copy, PartialEq)]
struct CameraColorMatrixAnchor {
    illuminant: Illuminant,
    xyz_to_camera: ColorMatrix3,
}

/// Converts demosaiced camera-space RGB into the pipeline working-space RGB.
pub(super) type CameraSpaceToWorkingSpaceMatrix = ColorMatrix3;

/// Temporary preference order for choosing an embedded XYZ-to-camera matrix.
///
/// This is not the scene white balance. These illuminants identify camera
/// calibration/profile anchors stored in RAW metadata. A production transform
/// builder should use the selected/as-shot neutral to interpolate between
/// available profile matrices instead of permanently choosing one.
const XYZ_TO_CAMERA_ILLUMINANT_PREFERENCE: [Illuminant; 2] = [Illuminant::D65, Illuminant::A];

/// Converts linear Rec.2020 RGB values to CIE XYZ using Rec.2020's D65 white point.
///
/// This defines the destination working-space RGB basis. It should remain D65
/// even for images shot under non-D65 lighting; the camera profile transform is
/// what should be interpolated/adapted into this fixed working space.
#[allow(clippy::excessive_precision)]
const REC2020_TO_XYZ_D65: ColorMatrix3 = [
    [
        0.63695804830129130,
        0.14461690358620838,
        0.16888097516417205,
    ],
    [
        0.26270021201126703,
        0.67799807151887100,
        0.05930171646986194,
    ],
    [
        0.00000000000000000,
        0.02807269304908750,
        1.06098505771079090,
    ],
];

/// Builds a camera-space RGB to linear Rec.2020 working-space matrix.
///
/// RAW metadata usually stores color matrices as XYZ-to-camera transforms. The
/// renderer's working image stores RGB values in the pipeline working space, so
/// this composes Rec.2020-to-XYZ with XYZ-to-camera and then inverts that result.
/// The current implementation picks one available calibration matrix; that is a
/// temporary simplification until two-illuminant interpolation is implemented.
pub(super) fn build_camera_space_to_working_space_matrix(
    raw_image: &RawImage,
) -> Result<CameraSpaceToWorkingSpaceMatrix> {
    let anchors = match extract_camera_color_matrix_anchors(&raw_image.color_matrix) {
        Ok(anchors) => anchors,
        Err(error) => return Err(error),
    };

    let xyz_to_camera = match select_xyz_to_camera_matrix(&anchors) {
        Ok(xyz_to_camera) => xyz_to_camera,
        Err(error) => return Err(error),
    };

    let rec2020_to_camera = normalize(multiply(&xyz_to_camera, &REC2020_TO_XYZ_D65));

    Ok(pseudo_inverse(rec2020_to_camera))
}

/// Applies a camera-space RGB to working-space RGB color transform.
///
/// Each output channel is the dot product of one matrix row with the input
/// camera-space RGB vector.
pub(super) fn apply_camera_space_to_working_space_transform(
    pixel: CameraSpaceRgbPixel,
    camera_space_to_working_space_matrix: &CameraSpaceToWorkingSpaceMatrix,
) -> RgbPixel {
    RgbPixel {
        red: (camera_space_to_working_space_matrix[0][0] * pixel.red)
            + (camera_space_to_working_space_matrix[0][1] * pixel.green)
            + (camera_space_to_working_space_matrix[0][2] * pixel.blue),
        green: (camera_space_to_working_space_matrix[1][0] * pixel.red)
            + (camera_space_to_working_space_matrix[1][1] * pixel.green)
            + (camera_space_to_working_space_matrix[1][2] * pixel.blue),
        blue: (camera_space_to_working_space_matrix[2][0] * pixel.red)
            + (camera_space_to_working_space_matrix[2][1] * pixel.green)
            + (camera_space_to_working_space_matrix[2][2] * pixel.blue),
    }
}

/// Extracts valid three-channel camera color-matrix anchors from RAW metadata.
fn extract_camera_color_matrix_anchors(
    color_matrices: &HashMap<Illuminant, FlatColorMatrix>,
) -> Result<Vec<CameraColorMatrixAnchor>> {
    let mut anchors = Vec::with_capacity(color_matrices.len());
    let mut rejected_illuminants = Vec::new();

    for (illuminant, xyz_to_camera) in color_matrices {
        match flat_xyz_to_camera_matrix(xyz_to_camera, *illuminant) {
            Ok(xyz_to_camera) => anchors.push(CameraColorMatrixAnchor {
                illuminant: *illuminant,
                xyz_to_camera,
            }),
            Err(_) => rejected_illuminants.push(*illuminant),
        }
    }

    anchors.sort_by_key(|anchor| anchor.illuminant);
    rejected_illuminants.sort();

    if anchors.is_empty() {
        let mut available_illuminants: Vec<_> = color_matrices.keys().copied().collect();
        available_illuminants.sort();

        return Err(anyhow!(
            "raw image is missing a supported 3-channel color matrix; available illuminants are {:?}, rejected illuminants are {:?}",
            available_illuminants,
            rejected_illuminants
        ));
    }

    Ok(anchors)
}

/// Selects the first currently supported XYZ-to-camera matrix from extracted anchors.
///
/// "Supported" currently means D65 first, then Standard Illuminant A, then the
/// first valid anchor. This is a fallback order, not a real best-match
/// calculation for the photographed scene.
fn select_xyz_to_camera_matrix(anchors: &[CameraColorMatrixAnchor]) -> Result<ColorMatrix3> {
    for illuminant in XYZ_TO_CAMERA_ILLUMINANT_PREFERENCE {
        if let Some(anchor) = anchors
            .iter()
            .find(|anchor| anchor.illuminant == illuminant)
        {
            return Ok(anchor.xyz_to_camera);
        }
    }

    match anchors.first() {
        Some(anchor) => Ok(anchor.xyz_to_camera),
        None => Err(anyhow!("raw image has no supported color matrix anchors")),
    }
}

/// Converts a flat DNG-style color matrix into a three-by-three matrix.
fn flat_xyz_to_camera_matrix(
    xyz_to_camera: &[f32],
    illuminant: Illuminant,
) -> Result<ColorMatrix3> {
    if xyz_to_camera.len() != 9 {
        return Err(anyhow!(
            "raw normalization currently only supports 3-channel {illuminant:?} color matrices, got {} values",
            xyz_to_camera.len()
        ));
    }

    let mut matrix = [[0.0; 3]; 3];

    for row in 0..3 {
        for column in 0..3 {
            matrix[row][column] = xyz_to_camera[(row * 3) + column];
        }
    }

    Ok(matrix)
}
