use crate::core::processing_pipeline::types::{
    DisplayRenderIntent, ImageDimensions, ProcessingPipelineImage, RgbPixel,
};
use anyhow::Result;

use super::luts::linear_to_srgb8;

/// Target display rendering mode for pipeline output.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DisplayMode {
    Sdr,
    _Hdr,
}

/// A single display-domain float RGB pixel after tone mapping and output conversion.
#[derive(Debug, Clone, Copy, PartialEq)]
struct ToneMappedPixel {
    red: f32,
    green: f32,
    blue: f32,
}

/// A renderer-facing display image ready for upload or presentation.
#[derive(Debug, Clone)]
pub enum DisplayImage {
    Rgba8Srgb {
        dimensions: ImageDimensions,
        rgba: Vec<u8>,
    },
}

/// Renders a canonical processing-pipeline image into a display image for presentation.
pub fn render_for_display(
    image: &ProcessingPipelineImage,
    mode: DisplayMode,
) -> Result<DisplayImage> {
    match mode {
        DisplayMode::Sdr => render_sdr_display_image(image),
        DisplayMode::_Hdr => todo!(),
    }
}

/// Renders a canonical processing-pipeline image into an SDR display image.
fn render_sdr_display_image(image: &ProcessingPipelineImage) -> Result<DisplayImage> {
    let dimensions = *image.dimensions();

    let pixel_count = match dimensions.pixel_count() {
        Ok(pixel_count) => pixel_count,
        Err(error) => return Err(error),
    };

    let mut rgba = Vec::with_capacity(pixel_count * 4);
    let alpha_samples = image.alpha().map(|alpha_plane| alpha_plane.samples());

    match image.display_render_intent() {
        DisplayRenderIntent::DirectSdr => {
            for (index, pixel) in image.color().pixels().iter().enumerate() {
                let display_pixel = map_raster_pixel_to_sdr_display(*pixel);
                push_sdr_pixel(&mut rgba, display_pixel, alpha_samples, index);
            }
        }
        DisplayRenderIntent::ToneMapToSdr => {
            for (index, pixel) in image.color().pixels().iter().enumerate() {
                let display_pixel = map_scene_pixel_to_sdr_display(*pixel);
                push_sdr_pixel(&mut rgba, display_pixel, alpha_samples, index);
            }
        }
    }

    Ok(DisplayImage::Rgba8Srgb { dimensions, rgba })
}

/// Maps a scene-referred working pixel into the SDR display domain.
///
/// This path applies luminance-based tone mapping before converting the pixel
/// from linear Rec.2020 to linear sRGB.
fn map_scene_pixel_to_sdr_display(pixel: RgbPixel) -> ToneMappedPixel {
    let scene_luminance = rec2020_luminance(pixel);
    let mapped_luminance = reinhard_tone_map_luminance(scene_luminance);

    let tone_mapped_pixel = if scene_luminance > 0.0 {
        let scale = mapped_luminance / scene_luminance;

        RgbPixel {
            red: pixel.red * scale,
            green: pixel.green * scale,
            blue: pixel.blue * scale,
        }
    } else {
        RgbPixel {
            red: 0.0,
            green: 0.0,
            blue: 0.0,
        }
    };

    linear_rec2020_to_linear_srgb(tone_mapped_pixel)
}

/// Maps a raster-derived working pixel directly into the SDR display domain.
fn map_raster_pixel_to_sdr_display(pixel: RgbPixel) -> ToneMappedPixel {
    linear_rec2020_to_linear_srgb(pixel)
}

/// Computes luminance for a linear Rec.2020 pixel.
fn rec2020_luminance(pixel: RgbPixel) -> f32 {
    (0.2627 * pixel.red) + (0.6780 * pixel.green) + (0.0593 * pixel.blue)
}

/// Applies a Reinhard tone-mapping curve to a luminance value.
fn reinhard_tone_map_luminance(luminance: f32) -> f32 {
    luminance / (1.0 + luminance)
}

/// Converts a linear Rec.2020 pixel to linear sRGB.
fn linear_rec2020_to_linear_srgb(pixel: RgbPixel) -> ToneMappedPixel {
    ToneMappedPixel {
        red: (1.6605 * pixel.red) + (-0.5876 * pixel.green) + (-0.0728 * pixel.blue),
        green: (-0.1246 * pixel.red) + (1.1329 * pixel.green) + (-0.0083 * pixel.blue),
        blue: (-0.0182 * pixel.red) + (-0.1006 * pixel.green) + (1.1187 * pixel.blue),
    }
}

/// Packs one SDR display-domain pixel and optional alpha sample into the output buffer.
fn push_sdr_pixel(
    rgba: &mut Vec<u8>,
    pixel: ToneMappedPixel,
    alpha_samples: Option<&[f32]>,
    index: usize,
) {
    rgba.push(linear_to_srgb8(pixel.red));
    rgba.push(linear_to_srgb8(pixel.green));
    rgba.push(linear_to_srgb8(pixel.blue));

    let alpha_u8 = match alpha_samples {
        Some(alpha_samples) => normalized_f32_to_u8(clamp_unit_f32(alpha_samples[index])),
        None => 255,
    };

    rgba.push(alpha_u8);
}

/// Clamps a float value into the display-safe range `0.0..=1.0`.
fn clamp_unit_f32(value: f32) -> f32 {
    if value < 0.0 {
        0.0
    } else if value > 1.0 {
        1.0
    } else {
        value
    }
}

/// Converts a normalized float channel value into an 8-bit display value.
fn normalized_f32_to_u8(value: f32) -> u8 {
    (value * 255.0).round() as u8
}

fn _map_pixel_to_hdr_display(_pixel: RgbPixel) -> ToneMappedPixel {
    todo!()
}

fn _pack_hdr_display_image(_image: &ProcessingPipelineImage) -> Result<DisplayImage> {
    todo!()
}
