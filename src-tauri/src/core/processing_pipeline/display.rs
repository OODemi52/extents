use crate::core::processing_pipeline::types::{ImageDimensions, ProcessingPipelineImage, RgbPixel};
use anyhow::Result;

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

/// A tone-mapped display-domain image prior to final packing for renderer upload.
#[derive(Debug, Clone)]
struct ToneMappedImage {
    dimensions: ImageDimensions,
    pixels: Vec<ToneMappedPixel>,
    alpha: Option<Vec<f32>>,
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
    let tone_mapped_image = match tone_map_for_display(image, mode) {
        Ok(tone_mapped_image) => tone_mapped_image,
        Err(error) => return Err(error),
    };

    match mode {
        DisplayMode::Sdr => pack_sdr_display_image(tone_mapped_image),
        DisplayMode::_Hdr => todo!(),
    }
}

/// Converts a canonical processing-pipeline image into a tone-mapped display-domain image.
fn tone_map_for_display(
    image: &ProcessingPipelineImage,
    mode: DisplayMode,
) -> Result<ToneMappedImage> {
    let dimensions = *image.dimensions();

    let pixel_count = match dimensions.pixel_count() {
        Ok(pixel_count) => pixel_count,
        Err(error) => return Err(error),
    };

    let mut tone_mapped_pixels = Vec::with_capacity(pixel_count);

    let alpha_samples = match image.alpha() {
        Some(alpha_plane) => Some(alpha_plane.samples().to_vec()),
        None => None,
    };

    match mode {
        DisplayMode::Sdr => {
            for pixel in image.color().pixels() {
                let tone_mapped_pixel = map_pixel_to_sdr_display(*pixel);
                tone_mapped_pixels.push(tone_mapped_pixel);
            }
        }
        DisplayMode::_Hdr => todo!(),
    }

    Ok(ToneMappedImage {
        dimensions,
        pixels: tone_mapped_pixels,
        alpha: alpha_samples,
    })
}

/// Maps a scene-referred working pixel into the SDR display domain.
fn map_pixel_to_sdr_display(pixel: RgbPixel) -> ToneMappedPixel {
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

/// Packs a tone-mapped SDR image into an RGBA8 sRGB display image.
fn pack_sdr_display_image(image: ToneMappedImage) -> Result<DisplayImage> {
    let ToneMappedImage {
        dimensions,
        pixels,
        alpha,
    } = image;

    let pixel_count = match dimensions.pixel_count() {
        Ok(pixel_count) => pixel_count,
        Err(error) => return Err(error),
    };

    let mut rgba = Vec::with_capacity(pixel_count * 4);

    for (index, pixel) in pixels.iter().enumerate() {
        let red = normalized_f32_to_u8(linear_to_srgb(clamp_unit_f32(pixel.red)));
        let green = normalized_f32_to_u8(linear_to_srgb(clamp_unit_f32(pixel.green)));
        let blue = normalized_f32_to_u8(linear_to_srgb(clamp_unit_f32(pixel.blue)));

        let alpha_u8 = match &alpha {
            Some(alpha_samples) => normalized_f32_to_u8(clamp_unit_f32(alpha_samples[index])),
            None => 255,
        };

        rgba.push(red);
        rgba.push(green);
        rgba.push(blue);
        rgba.push(alpha_u8);
    }

    Ok(DisplayImage::Rgba8Srgb { dimensions, rgba })
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

/// Encodes a linear sRGB channel value with the sRGB transfer function.
fn linear_to_srgb(channel: f32) -> f32 {
    if channel <= 0.003_130_8 {
        channel * 12.92
    } else {
        (1.055 * channel.powf(1.0 / 2.4)) - 0.055
    }
}

/// Converts a normalized float channel value into an 8-bit display value.
fn normalized_f32_to_u8(value: f32) -> u8 {
    (value * 255.0).round() as u8
}

fn _map_pixel_to_hdr_display(_pixel: RgbPixel) -> ToneMappedPixel {
    todo!()
}

fn _pack_hdr_display_image(_image: ToneMappedImage) -> Result<DisplayImage> {
    todo!()
}
