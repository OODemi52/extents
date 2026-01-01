use crate::core::image::{decode_derived_image, EmbeddedPreviewPolicy};
use fast_image_resize::ResizeAlg;
use image::{self, codecs::jpeg::JpegEncoder, RgbImage, RgbaImage};
use std::fs::File;
use std::path::Path;

// Need to work on optimizations for this
const THUMBNAIL_LONGEST_EDGE: u32 = 300;
const THUMBNAIL_JPEG_QUALITY: u8 = 85;
const PREVIEW_LONGEST_EDGE: u32 = 800;
const PREVIEW_JPEG_QUALITY: u8 = 85;
const MINIMUM_EMBEDDED_PREVIEW_SIZE: u32 = 800;

pub fn generate_thumbnail(original_path: &str, cache_path: &Path) -> Result<(), anyhow::Error> {
    generate_scaled_image(
        original_path,
        cache_path,
        THUMBNAIL_LONGEST_EDGE,
        true,
        THUMBNAIL_JPEG_QUALITY,
    )
}

pub fn generate_preview(original_path: &str, cache_path: &Path) -> Result<(), anyhow::Error> {
    generate_scaled_image(
        original_path,
        cache_path,
        PREVIEW_LONGEST_EDGE,
        true,
        PREVIEW_JPEG_QUALITY,
    )
}

fn generate_scaled_image(
    original_path: &str,
    cache_path: &Path,
    max_long_edge: u32,
    allow_embedded: bool,
    jpeg_quality: u8,
) -> Result<(), anyhow::Error> {
    let embedded_preview = if allow_embedded {
        EmbeddedPreviewPolicy::Any
    } else {
        EmbeddedPreviewPolicy::MinSize(MINIMUM_EMBEDDED_PREVIEW_SIZE)
    };

    let mut source_image = decode_derived_image(original_path, embedded_preview)?;

    let (image_width, image_height) = source_image.dimensions();

    let (target_width, target_height) =
        compute_fit_dimensions(image_width, image_height, max_long_edge);

    let result_image = if target_width == image_width && target_height == image_height {
        source_image
    } else {
        resize_image(&mut source_image, target_width, target_height)?
    };

    save_as_jpeg(cache_path, &result_image, jpeg_quality)?;

    Ok(())
}

fn compute_fit_dimensions(image_width: u32, image_height: u32, max_long_edge: u32) -> (u32, u32) {
    if image_width <= max_long_edge && image_height <= max_long_edge {
        return (image_width, image_height);
    }

    let aspect = image_width as f32 / image_height as f32;

    let scaled_dimensions = if aspect >= 1.0 {
        let width = max_long_edge;

        let height = (max_long_edge as f32 / aspect).round() as u32;

        (width, height.max(1))
    } else {
        let height = max_long_edge;

        let width = (max_long_edge as f32 * aspect).round() as u32;
        (width.max(1), height)
    };

    (
        scaled_dimensions.0.min(image_width),
        scaled_dimensions.1.min(image_height),
    )
}

fn resize_image(
    source_image: &mut RgbaImage,
    width: u32,
    height: u32,
) -> Result<RgbaImage, anyhow::Error> {
    let (source_width, source_height) = source_image.dimensions();

    let source_ref = fast_image_resize::images::ImageRef::new(
        source_width,
        source_height,
        source_image.as_raw(),
        fast_image_resize::PixelType::U8x4,
    )?;

    let mut destination_image =
        fast_image_resize::images::Image::new(width, height, source_ref.pixel_type());

    let mut resizer = fast_image_resize::Resizer::new();

    resizer.resize(
        &source_ref,
        &mut destination_image,
        &fast_image_resize::ResizeOptions::new().resize_alg(ResizeAlg::Convolution(
            fast_image_resize::FilterType::Lanczos3,
        )),
    )?;

    image::RgbaImage::from_raw(width, height, destination_image.into_vec())
        .ok_or_else(|| anyhow::anyhow!("Failed to create image from resized data"))
}

fn save_as_jpeg(path: &Path, image: &RgbaImage, quality: u8) -> Result<(), anyhow::Error> {
    let rgb_image = rgba_to_rgb(image);

    let file = File::create(path)?;

    let mut encoder = JpegEncoder::new_with_quality(file, quality);

    encoder.encode_image(&rgb_image)?;

    Ok(())
}

fn rgba_to_rgb(image: &RgbaImage) -> RgbImage {
    let (width, height) = image.dimensions();

    let mut rgb = RgbImage::new(width, height);

    for (x, y, pixel) in image.enumerate_pixels() {
        let alpha_value = pixel[3] as u16;

        let invert_alpha = 255u16 - alpha_value;

        let r = ((pixel[0] as u16 * alpha_value + 255u16 * invert_alpha) / 255u16) as u8;
        let g = ((pixel[1] as u16 * alpha_value + 255u16 * invert_alpha) / 255u16) as u8;
        let b = ((pixel[2] as u16 * alpha_value + 255u16 * invert_alpha) / 255u16) as u8;

        rgb.put_pixel(x, y, image::Rgb([r, g, b]));
    }

    rgb
}
