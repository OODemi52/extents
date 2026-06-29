use anyhow::{anyhow, Result};
use image::RgbaImage;
use rawler::imgop::matrix::{multiply, normalize, pseudo_inverse};
use rawler::imgop::xyz::Illuminant;

use super::processing_graph::{DevelopmentParameters, SourceKind};
use crate::core::image::orientation::{apply_orientation, Orientation};
use crate::core::image::source::{
    decode_source_from_path, ImageSource, RasterSamples, RasterSource, RawRect, RawSamples,
    RawSource,
};
use crate::core::image::ImageDimensions;

type ColorMatrix3 = [[f32; 3]; 3];

const XYZ_TO_CAMERA_ILLUMINANT_PREFERENCE: [Illuminant; 2] = [Illuminant::D65, Illuminant::A];

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

/// Renderer-ready input built from source-domain image data.
///
/// This keeps the CPU-side source upload payload together with the graph
/// development parameters and display intent needed by the live renderer.
pub(super) struct Input {
    image: InputImage,
    development_parameters: DevelopmentParameters,
    display_intent: DisplayIntent,
}

impl Input {
    /// Returns the CPU-side source payload to upload into graph resources.
    pub(super) fn image(&self) -> &InputImage {
        &self.image
    }

    /// Returns the GPU development parameters for the uploaded source.
    pub(super) fn development_parameters(&self) -> DevelopmentParameters {
        self.development_parameters
    }

    /// Returns how this input should be transformed for display.
    pub(super) fn display_intent(&self) -> DisplayIntent {
        self.display_intent
    }
}

/// CPU-side texel payload used for renderer source upload.
pub(super) struct InputImage {
    texels: Vec<f32>,
    dimensions: ImageDimensions,
    has_transparency: bool,
}

impl InputImage {
    /// Returns packed source texels as a read-only slice.
    pub(super) fn texels(&self) -> &[f32] {
        &self.texels
    }

    /// Returns the source image dimensions represented by this upload payload.
    pub(super) fn dimensions(&self) -> ImageDimensions {
        self.dimensions
    }

    /// Returns whether any texel in this renderer input contains transparency.
    pub(super) fn has_transparency(&self) -> bool {
        self.has_transparency
    }
}

/// Controls how graph output should be rendered for display.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum DisplayIntent {
    DirectSdr,
    ToneMapToSdr,
}

/// Builds renderer-ready image data from a source image path.
pub(super) fn build_input_from_path(path: &str) -> Result<Input> {
    let source = match decode_source_from_path(path) {
        Ok(source) => source,
        Err(error) => return Err(error),
    };

    match source {
        ImageSource::Raster(raster) => build_raster_input(raster),
        ImageSource::Raw(raw) => build_raw_input(raw),
    }
}

fn build_raster_input(raster: RasterSource) -> Result<Input> {
    let (samples, _, orientation, _) = raster.into_parts();

    let mut pixels = match samples {
        RasterSamples::Rgba8(pixels) => pixels,
    };

    if let Some(orientation) = orientation {
        pixels = match apply_orientation_to_rgba(pixels, orientation) {
            Ok(pixels) => pixels,
            Err(error) => return Err(error),
        };
    }

    let image = match build_rgba8_input_image(pixels) {
        Ok(image) => image,
        Err(error) => return Err(error),
    };

    Ok(Input {
        image,
        development_parameters: DevelopmentParameters::from_source_kind(SourceKind::RasterSrgb),
        display_intent: DisplayIntent::DirectSdr,
    })
}

fn build_raw_input(raw: RawSource) -> Result<Input> {
    let packed_source = match pack_raw_source_image(&raw) {
        Ok(packed_source) => packed_source,
        Err(error) => return Err(error),
    };

    let white_balance = resolve_headroom_white_balance(raw.white_balance_coefficients());

    let camera_to_working = match build_camera_to_working_matrix(&raw) {
        Ok(camera_to_working) => camera_to_working,
        Err(error) => return Err(error),
    };

    Ok(Input {
        image: packed_source.image,
        development_parameters: DevelopmentParameters::from_raw_bayer_2x2(
            packed_source.cfa_pattern,
            packed_source.black_levels,
            packed_source.white_levels,
            white_balance,
            camera_to_working,
        ),
        display_intent: DisplayIntent::ToneMapToSdr,
    })
}

struct PackedRawSourceImage {
    image: InputImage,
    cfa_pattern: [u32; 4],
    black_levels: [f32; 4],
    white_levels: [f32; 4],
}

#[derive(Debug, Clone, Copy)]
struct RawSourceRect {
    x: u32,
    y: u32,
    width: u32,
    height: u32,
}

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
    let black_levels = normalize_levels_for_upload(
        oriented_cfa_values_for_crop(raw.black_levels().values(), crop, output_width, orientation),
        sample_scale,
    );
    let white_levels = normalize_levels_for_upload(
        oriented_cfa_values_for_crop(raw.white_levels().values(), crop, output_width, orientation),
        sample_scale,
    );

    Ok(PackedRawSourceImage {
        image: InputImage {
            texels,
            dimensions,
            has_transparency: false,
        },
        cfa_pattern,
        black_levels,
        white_levels,
    })
}

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

fn raw_rect_to_source_rect(rect: RawRect) -> RawSourceRect {
    RawSourceRect {
        x: rect.x(),
        y: rect.y(),
        width: rect.width(),
        height: rect.height(),
    }
}

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

fn integer_raw_sample_scale(bits_per_sample: u32) -> f32 {
    if bits_per_sample > 0 && bits_per_sample < 31 {
        ((1u32 << bits_per_sample) - 1) as f32
    } else {
        u16::MAX as f32
    }
}

fn raw_sample_at(samples: &RawSamples, index: usize) -> f32 {
    match samples {
        RawSamples::IntegerU16(samples) => samples[index] as f32,
        RawSamples::Float32(samples) => samples[index],
    }
}

fn normalize_levels_for_upload(levels: [f32; 4], sample_scale: f32) -> [f32; 4] {
    [
        levels[0] / sample_scale,
        levels[1] / sample_scale,
        levels[2] / sample_scale,
        levels[3] / sample_scale,
    ]
}

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

fn build_camera_to_working_matrix(raw: &RawSource) -> Result<ColorMatrix3> {
    let xyz_to_camera = match select_xyz_to_camera_matrix(raw) {
        Ok(xyz_to_camera) => xyz_to_camera,
        Err(error) => return Err(error),
    };

    let rec2020_to_camera = normalize(multiply(&xyz_to_camera, &REC2020_TO_XYZ_D65));

    Ok(pseudo_inverse(rec2020_to_camera))
}

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

fn flat_xyz_to_camera_matrix(xyz_to_camera: [f32; 9]) -> ColorMatrix3 {
    [
        [xyz_to_camera[0], xyz_to_camera[1], xyz_to_camera[2]],
        [xyz_to_camera[3], xyz_to_camera[4], xyz_to_camera[5]],
        [xyz_to_camera[6], xyz_to_camera[7], xyz_to_camera[8]],
    ]
}

fn build_rgba8_input_image(pixels: RgbaImage) -> Result<InputImage> {
    let (width, height) = pixels.dimensions();
    let dimensions = match ImageDimensions::new(width, height) {
        Ok(dimensions) => dimensions,
        Err(error) => return Err(error),
    };

    let pixel_count = match dimensions.pixel_count() {
        Ok(pixel_count) => pixel_count,
        Err(error) => return Err(error),
    };

    let mut texels = Vec::with_capacity(pixel_count * 4);
    let mut has_transparency = false;

    for rgba in pixels.pixels() {
        texels.push(u8_to_normalized_f32(rgba[0]));
        texels.push(u8_to_normalized_f32(rgba[1]));
        texels.push(u8_to_normalized_f32(rgba[2]));

        let alpha = u8_to_normalized_f32(rgba[3]);

        if alpha < 1.0 {
            has_transparency = true;
        }

        texels.push(alpha);
    }

    Ok(InputImage {
        texels,
        dimensions,
        has_transparency,
    })
}

fn apply_orientation_to_rgba(image: RgbaImage, orientation: Orientation) -> Result<RgbaImage> {
    let (width, height) = image.dimensions();
    let pixels: Vec<_> = image.pixels().copied().collect();

    let (oriented_pixels, oriented_width, oriented_height) =
        match apply_orientation(pixels, width, height, orientation) {
            Ok(oriented) => oriented,
            Err(error) => return Err(error),
        };

    Ok(RgbaImage::from_fn(
        oriented_width,
        oriented_height,
        |x, y| oriented_pixels[((y * oriented_width) + x) as usize],
    ))
}

/// Converts an 8-bit channel value into a normalized `f32` in the range `0.0..=1.0`.
fn u8_to_normalized_f32(value: u8) -> f32 {
    value as f32 / 255.0
}
