use exif::{In, Reader, Tag};
use fast_image_resize::ResizeAlg;
use image::{self, codecs::jpeg::JpegEncoder, ImageReader, RgbImage, RgbaImage};
use memmap2::MmapOptions;
use std::fs::File;
use std::io::Cursor;
use std::path::Path;

const THUMBNAIL_LONGEST_EDGE: u32 = 300;
const PREVIEW_LONGEST_EDGE: u32 = 2048;

pub fn generate_thumbnail(original_path: &str, cache_path: &Path) -> Result<(), anyhow::Error> {
    generate_scaled_image(original_path, cache_path, THUMBNAIL_LONGEST_EDGE)
}

pub fn generate_preview(original_path: &str, cache_path: &Path) -> Result<(), anyhow::Error> {
    generate_scaled_image(original_path, cache_path, PREVIEW_LONGEST_EDGE)
}

fn generate_scaled_image(
    original_path: &str,
    cache_path: &Path,
    max_long_edge: u32,
) -> Result<(), anyhow::Error> {
    let mut source_image = load_source_image(original_path)?;

    let (image_width, image_height) = source_image.dimensions();

    let (target_width, target_height) =
        compute_fit_dimensions(image_width, image_height, max_long_edge);

    let result_image = if target_width == image_width && target_height == image_height {
        source_image
    } else {
        resize_image(&mut source_image, target_width, target_height)?
    };

    save_as_jpeg(cache_path, &result_image)?;

    Ok(())
}

fn load_source_image(original_path: &str) -> Result<RgbaImage, anyhow::Error> {
    let file = File::open(original_path)?;
    let mmap = unsafe { MmapOptions::new().map(&file)? };
    let mapped_bytes: &[u8] = &mmap;

    let image = match decode_embedded_preview(mapped_bytes).transpose()? {
        Some(image) => image,
        None => decode_full_image(mapped_bytes)?,
    };

    Ok(image)
}

fn decode_embedded_preview(data: &[u8]) -> Option<Result<RgbaImage, anyhow::Error>> {
    let mut cursor = Cursor::new(data);

    let preview_bytes = match Reader::new().read_from_container(&mut cursor) {
        Ok(exif) => extract_jpeg_preview(&exif),
        Err(_) => None,
    }?;

    Some(
        image::load_from_memory(&preview_bytes)
            .map(|dynamic_image| dynamic_image.to_rgba8())
            .map_err(anyhow::Error::from),
    )
}

fn extract_jpeg_preview(exif: &exif::Exif) -> Option<Vec<u8>> {
    for image_file_directory in [In::THUMBNAIL, In::PRIMARY] {
        if let (Some(offset_field), Some(length_field)) = (
            exif.get_field(Tag::JPEGInterchangeFormat, image_file_directory),
            exif.get_field(Tag::JPEGInterchangeFormatLength, image_file_directory),
        ) {
            let offset = offset_field.value.get_uint(0)? as usize;

            let length = length_field.value.get_uint(0)? as usize;

            let buffer = exif.buf();

            if offset + length <= buffer.len() {
                return Some(buffer[offset..offset + length].to_vec());
            }
        }
    }

    None
}

fn decode_full_image(data: &[u8]) -> Result<RgbaImage, anyhow::Error> {
    let cursor = Cursor::new(data);

    let reader = ImageReader::new(cursor).with_guessed_format()?;

    let image = reader.decode()?.to_rgba8();

    Ok(image)
}

fn compute_fit_dimensions(
    image_width: u32,
    image_height: u32,
    max_long_edge: u32,
) -> (u32, u32) {
    if image_width <= max_long_edge && image_height <= max_long_edge {
        return (image_width, image_height);
    }

    let aspect = image_width as f32 / image_height as f32;

    let mut scaled_dimensions = if aspect >= 1.0 {
        let width = max_long_edge;
        let height = (max_long_edge as f32 / aspect).round() as u32;
        (width, height.max(1))
    } else {
        let height = max_long_edge;
        let width = (max_long_edge as f32 * aspect).round() as u32;
        (width.max(1), height)
    };

    scaled_dimensions.0 = scaled_dimensions.0.min(image_width);
    scaled_dimensions.1 = scaled_dimensions.1.min(image_height);

    scaled_dimensions
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
            fast_image_resize::FilterType::Bilinear,
        )),
    )?;

    image::RgbaImage::from_raw(width, height, destination_image.into_vec())
        .ok_or_else(|| anyhow::anyhow!("Failed to create image from resized data"))
}

fn save_as_jpeg(path: &Path, image: &RgbaImage) -> Result<(), anyhow::Error> {
    let rgb_image = rgba_to_rgb(image);

    let file = File::create(path)?;

    let mut encoder = JpegEncoder::new_with_quality(file, 85);

    encoder.encode_image(&rgb_image)?;

    Ok(())
}

fn rgba_to_rgb(image: &RgbaImage) -> RgbImage {
    let (width, height) = image.dimensions();

    let mut rgb = RgbImage::new(width, height);

    for (x, y, pixel) in image.enumerate_pixels() {
        rgb.put_pixel(x, y, image::Rgb([pixel[0], pixel[1], pixel[2]]));
    }

    rgb
}
