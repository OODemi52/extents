use anyhow::{anyhow, Result};
use rawler::imgop::matrix::{multiply, normalize, pseudo_inverse};
use rawler::imgop::xyz::Illuminant;

use super::{
    DevelopmentSource, Input, InputImage, OutputTransformSettings, RawSourceMetadata,
    SourceMetadata, SourceRect,
};
use crate::core::image::orientation::Orientation;
use crate::core::image::source::{RawRect, RawSamples, RawSource};
use crate::core::image::ImageDimensions;
use crate::renderer::processing_graph::DevelopmentParameters;

/// A three-by-three color transform matrix.
type ColorMatrix3 = [[f32; 3]; 3];

/// Temporary preference order for choosing an embedded XYZ-to-camera matrix.
///
/// This selects a camera profile anchor, not the scene white balance. A more
/// complete profile builder should interpolate between anchors using the
/// selected/as-shot neutral instead of permanently preferring one matrix.
const XYZ_TO_CAMERA_ILLUMINANT_PREFERENCE: [Illuminant; 2] = [Illuminant::D65, Illuminant::A];

/// Baseline RAW display placement applied before SDR tone mapping.
const RAW_DISPLAY_BASE_EXPOSURE_EV: f32 = 1.5;

/// Converts linear Rec.2020 RGB values to CIE XYZ using Rec.2020's D65 white point.
///
/// This defines the current working-space basis used by the GPU development
/// graph. RAW camera matrices are inverted into this destination space.
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

/// Builds renderer input from a decoded RAW source.
pub(super) fn build_input(raw: RawSource) -> Result<Input> {
    let packed_source = match pack_raw_source_image(&raw) {
        Ok(packed_source) => packed_source,
        Err(error) => return Err(error),
    };

    let as_shot_white_balance = raw.white_balance_coefficients();
    let white_balance = resolve_headroom_white_balance(as_shot_white_balance);

    let camera_to_working = match build_camera_to_working_matrix(&raw) {
        Ok(camera_to_working) => camera_to_working,
        Err(error) => return Err(error),
    };

    Ok(Input::new(
        packed_source.image,
        DevelopmentSource::RawBayer2x2,
        DevelopmentParameters::from_raw_bayer_2x2(
            packed_source.cfa_pattern,
            packed_source.black_levels,
            packed_source.white_levels,
            white_balance,
            camera_to_working,
        ),
        OutputTransformSettings::tone_map_to_sdr(RAW_DISPLAY_BASE_EXPOSURE_EV),
        SourceMetadata::raw(RawSourceMetadata {
            camera_make: raw.camera_make().to_string(),
            camera_model: raw.camera_model().to_string(),
            bits_per_sample: raw.bits_per_sample(),
            sensor_dimensions: raw.dimensions(),
            crop_area: packed_source.crop_area,
            cfa_pattern: packed_source.cfa_pattern,
            source_black_levels: packed_source.source_black_levels,
            source_white_levels: packed_source.source_white_levels,
            normalized_black_levels: packed_source.black_levels,
            normalized_white_levels: packed_source.white_levels,
            as_shot_white_balance,
            headroom_white_balance: white_balance,
        }),
    ))
}

/// Packed RAW upload data plus metadata needed by the development shader.
struct PackedRawSourceImage {
    image: InputImage,
    crop_area: SourceRect,
    cfa_pattern: [u32; 4],
    source_black_levels: [f32; 4],
    source_white_levels: [f32; 4],
    black_levels: [f32; 4],
    white_levels: [f32; 4],
}

/// Sensor-space rectangle selected for RAW source upload.
#[derive(Debug, Clone, Copy)]
struct RawSourceRect {
    x: u32,
    y: u32,
    width: u32,
    height: u32,
}

/// Packs RAW sensor samples into the renderer source texture payload.
///
/// The current GPU RAW path uploads one scalar sensor sample per texel in the
/// red channel. Crop and orientation are applied here so the graph sees the same
/// display-oriented dimensions as raster inputs, while CFA metadata is adjusted
/// to keep shader-side Bayer lookup aligned with the packed samples.
fn pack_raw_source_image(raw: &RawSource) -> Result<PackedRawSourceImage> {
    let crop = match select_raw_source_rect(raw) {
        Ok(crop) => crop,
        Err(error) => return Err(error),
    };
    let orientation = raw.orientation().unwrap_or(Orientation::Normal);
    let (output_width, output_height) =
        oriented_raw_dimensions(crop.width, crop.height, orientation);

    let dimensions = match ImageDimensions::new(output_width, output_height) {
        Ok(dimensions) => dimensions,
        Err(error) => return Err(error),
    };

    let pixel_count = match dimensions.pixel_count() {
        Ok(pixel_count) => pixel_count,
        Err(error) => return Err(error),
    };

    let sample_scale = raw_sample_scale(raw);
    let source_width = raw.dimensions().width();
    let mut texels = Vec::with_capacity(pixel_count * 4);

    for y in 0..output_height {
        for x in 0..output_width {
            let (crop_x, crop_y) =
                oriented_to_raw_crop_position(x, y, crop.width, crop.height, orientation);
            let source_x = crop.x + crop_x;
            let source_y = crop.y + crop_y;
            let source_index = ((source_y * source_width) + source_x) as usize;
            let sample = raw_sample_at(raw.samples(), source_index);

            texels.push(sample / sample_scale);
            texels.push(0.0);
            texels.push(0.0);
            texels.push(1.0);
        }
    }

    let cfa_pattern =
        oriented_cfa_values_for_crop(raw.cfa().pattern(), crop, output_width, orientation);
    let source_black_levels =
        oriented_cfa_values_for_crop(raw.black_levels().values(), crop, output_width, orientation);
    let source_white_levels =
        oriented_cfa_values_for_crop(raw.white_levels().values(), crop, output_width, orientation);
    let black_levels = normalize_levels_for_upload(source_black_levels, sample_scale);
    let white_levels = normalize_levels_for_upload(source_white_levels, sample_scale);

    Ok(PackedRawSourceImage {
        image: InputImage::new(texels, dimensions, false),
        crop_area: SourceRect {
            x: crop.x,
            y: crop.y,
            width: crop.width,
            height: crop.height,
        },
        cfa_pattern,
        source_black_levels,
        source_white_levels,
        black_levels,
        white_levels,
    })
}

/// Chooses the sensor rectangle to upload for GPU RAW development.
///
/// The recommended crop area is preferred, then the active area, then the full
/// decoded sensor. The selected rectangle is validated before any source samples
/// are read from it.
fn select_raw_source_rect(raw: &RawSource) -> Result<RawSourceRect> {
    let dimensions = raw.dimensions();

    let rect = match raw.crop_area() {
        Some(rect) => raw_rect_to_source_rect(rect),
        None => match raw.active_area() {
            Some(rect) => raw_rect_to_source_rect(rect),
            None => RawSourceRect {
                x: 0,
                y: 0,
                width: dimensions.width(),
                height: dimensions.height(),
            },
        },
    };

    if rect.width == 0 || rect.height == 0 {
        return Err(anyhow!("RAW source crop area is empty"));
    }

    let right = rect.x.saturating_add(rect.width);
    let bottom = rect.y.saturating_add(rect.height);

    if right > dimensions.width() || bottom > dimensions.height() {
        return Err(anyhow!(
            "RAW source crop area {}x{} at {},{} exceeds sensor dimensions {}x{}",
            rect.width,
            rect.height,
            rect.x,
            rect.y,
            dimensions.width(),
            dimensions.height()
        ));
    }

    Ok(rect)
}

/// Converts a source-domain RAW rectangle into the local upload rectangle type.
fn raw_rect_to_source_rect(rect: RawRect) -> RawSourceRect {
    RawSourceRect {
        x: rect.x(),
        y: rect.y(),
        width: rect.width(),
        height: rect.height(),
    }
}

/// Returns the output dimensions after applying a RAW orientation transform.
fn oriented_raw_dimensions(width: u32, height: u32, orientation: Orientation) -> (u32, u32) {
    match orientation {
        Orientation::Normal
        | Orientation::FlipHorizontal
        | Orientation::Rotate180
        | Orientation::FlipVertical => (width, height),
        Orientation::Transpose
        | Orientation::Rotate90
        | Orientation::Transverse
        | Orientation::Rotate270 => (height, width),
    }
}

/// Maps an oriented output coordinate back to the original crop-space coordinate.
///
/// This is the inverse of the display orientation transform. It lets the packed
/// upload payload be oriented without mutating the original RAW sample buffer.
fn oriented_to_raw_crop_position(
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    orientation: Orientation,
) -> (u32, u32) {
    match orientation {
        Orientation::Normal => (x, y),
        Orientation::FlipHorizontal => (width - 1 - x, y),
        Orientation::Rotate180 => (width - 1 - x, height - 1 - y),
        Orientation::FlipVertical => (x, height - 1 - y),
        Orientation::Transpose => (y, x),
        Orientation::Rotate90 => (y, height - 1 - x),
        Orientation::Transverse => (width - 1 - y, height - 1 - x),
        Orientation::Rotate270 => (width - 1 - y, x),
    }
}

/// Resolves the scale used to normalize source samples before GPU upload.
///
/// Integer RAW sources use their reported bit depth. Floating RAW sources use
/// white level when it appears to be in sensor-code units, otherwise they are
/// treated as already normalized.
fn raw_sample_scale(raw: &RawSource) -> f32 {
    let scale = match raw.samples() {
        RawSamples::IntegerU16(_) => integer_raw_sample_scale(raw.bits_per_sample()),
        RawSamples::Float32(_) => {
            let white_max = raw
                .white_levels()
                .values()
                .iter()
                .copied()
                .fold(0.0, f32::max);

            if white_max.is_finite() && white_max > 1.0 {
                white_max
            } else {
                1.0
            }
        }
    };

    if scale.is_finite() && scale > 0.0 {
        scale
    } else {
        1.0
    }
}

/// Converts a RAW integer bit depth into its maximum representable code value.
fn integer_raw_sample_scale(bits_per_sample: u32) -> f32 {
    if bits_per_sample > 0 && bits_per_sample < 31 {
        ((1u32 << bits_per_sample) - 1) as f32
    } else {
        u16::MAX as f32
    }
}

/// Reads one scalar RAW sample as `f32` from the decoded sample storage.
fn raw_sample_at(samples: &RawSamples, index: usize) -> f32 {
    match samples {
        RawSamples::IntegerU16(samples) => samples[index] as f32,
        RawSamples::Float32(samples) => samples[index],
    }
}

/// Converts black or white levels into the same normalized scale as uploaded samples.
fn normalize_levels_for_upload(levels: [f32; 4], sample_scale: f32) -> [f32; 4] {
    [
        levels[0] / sample_scale,
        levels[1] / sample_scale,
        levels[2] / sample_scale,
        levels[3] / sample_scale,
    ]
}

/// Rebuilds 2x2 CFA-aligned values after crop and orientation.
///
/// CFA pattern, black levels, and white levels are all indexed by Bayer slot.
/// If the source crop starts at an odd coordinate or the image is rotated/flipped,
/// the slot order changes and must be updated before shader development.
fn oriented_cfa_values_for_crop<T: Copy>(
    values: [T; 4],
    crop: RawSourceRect,
    output_width: u32,
    orientation: Orientation,
) -> [T; 4] {
    let top_left = cfa_value_for_oriented_position(values, crop, output_width, orientation, 0, 0);
    let top_right = cfa_value_for_oriented_position(values, crop, output_width, orientation, 1, 0);
    let bottom_left =
        cfa_value_for_oriented_position(values, crop, output_width, orientation, 0, 1);
    let bottom_right =
        cfa_value_for_oriented_position(values, crop, output_width, orientation, 1, 1);

    [top_left, top_right, bottom_left, bottom_right]
}

/// Returns the CFA-aligned value for one oriented 2x2 output position.
///
/// The oriented coordinate is mapped back to the original sensor coordinate, then
/// that sensor coordinate's parity selects the original Bayer slot.
fn cfa_value_for_oriented_position<T: Copy>(
    values: [T; 4],
    crop: RawSourceRect,
    output_width: u32,
    orientation: Orientation,
    x: u32,
    y: u32,
) -> T {
    let virtual_x = x % output_width.max(1);
    let virtual_y = y % oriented_raw_dimensions(crop.width, crop.height, orientation)
        .1
        .max(1);
    let (crop_x, crop_y) =
        oriented_to_raw_crop_position(virtual_x, virtual_y, crop.width, crop.height, orientation);
    let source_x = crop.x + crop_x;
    let source_y = crop.y + crop_y;
    let source_slot = ((source_y % 2) * 2) + (source_x % 2);

    values[source_slot as usize]
}

/// Resolves as-shot RGB white-balance gains while preserving highlight headroom.
///
/// Gains are normalized by the largest valid channel gain so white balance does
/// not push one channel above the source-normalized range before the display
/// transform has a chance to compress highlights.
fn resolve_headroom_white_balance(wb_coefficients: [f32; 4]) -> [f32; 3] {
    let gains = [wb_coefficients[0], wb_coefficients[1], wb_coefficients[2]];

    if !gains.iter().all(|gain| gain.is_finite() && *gain > 0.0) {
        return [1.0, 1.0, 1.0];
    }

    let base_gain = gains.iter().copied().fold(f32::NEG_INFINITY, f32::max);

    if !base_gain.is_finite() || base_gain <= 0.0 {
        return [1.0, 1.0, 1.0];
    }

    [
        gains[0] / base_gain,
        gains[1] / base_gain,
        gains[2] / base_gain,
    ]
}

/// Builds a camera-space RGB to linear Rec.2020 working-space matrix.
///
/// RAW metadata stores XYZ-to-camera matrices. This composes Rec.2020-to-XYZ
/// with the selected XYZ-to-camera matrix, normalizes the result, then inverts
/// it so the development shader can transform camera RGB into working RGB.
fn build_camera_to_working_matrix(raw: &RawSource) -> Result<ColorMatrix3> {
    let xyz_to_camera = match select_xyz_to_camera_matrix(raw) {
        Ok(xyz_to_camera) => xyz_to_camera,
        Err(error) => return Err(error),
    };

    let rec2020_to_camera = normalize(multiply(&xyz_to_camera, &REC2020_TO_XYZ_D65));

    Ok(pseudo_inverse(rec2020_to_camera))
}

/// Selects the currently supported camera color-matrix anchor.
///
/// This is a fallback selection order, not a final scene-matched profile
/// calculation. The longer-term path is two-illuminant interpolation.
fn select_xyz_to_camera_matrix(raw: &RawSource) -> Result<ColorMatrix3> {
    for preferred_illuminant in XYZ_TO_CAMERA_ILLUMINANT_PREFERENCE {
        let preferred_illuminant_code = u16::from(preferred_illuminant);

        if let Some(anchor) = raw
            .color_matrix_anchors()
            .iter()
            .find(|anchor| anchor.illuminant() == preferred_illuminant_code)
        {
            return Ok(flat_xyz_to_camera_matrix(anchor.xyz_to_camera()));
        }
    }

    match raw.color_matrix_anchors().first() {
        Some(anchor) => Ok(flat_xyz_to_camera_matrix(anchor.xyz_to_camera())),
        None => Err(anyhow!(
            "RAW source requires at least one camera color matrix anchor"
        )),
    }
}

/// Converts a flat row-major XYZ-to-camera matrix into a three-by-three matrix.
fn flat_xyz_to_camera_matrix(xyz_to_camera: [f32; 9]) -> ColorMatrix3 {
    [
        [xyz_to_camera[0], xyz_to_camera[1], xyz_to_camera[2]],
        [xyz_to_camera[3], xyz_to_camera[4], xyz_to_camera[5]],
        [xyz_to_camera[6], xyz_to_camera[7], xyz_to_camera[8]],
    ]
}
