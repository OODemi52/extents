use exif::{In, Reader, Tag};
use fast_image_resize::ResizeAlg;
use image::{self, codecs::jpeg::JpegEncoder, ImageReader, RgbImage, RgbaImage};
use memmap2::MmapOptions;
use std::fs::File;
use std::io::Cursor;
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
        false,
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
    let mut source_image = load_source_image(original_path, allow_embedded)?;

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

fn load_source_image(
    original_path: &str,
    allow_embedded: bool,
) -> Result<RgbaImage, anyhow::Error> {
    let file = File::open(original_path)?;

    let mmap = unsafe { MmapOptions::new().map(&file)? };

    let mapped_bytes: &[u8] = &mmap;

    let image = if allow_embedded {
        match decode_embedded_preview(mapped_bytes).transpose()? {
            Some(image) => image,
            None => decode_full_image(mapped_bytes)?,
        }
    } else {
        match try_large_embedded_preview(mapped_bytes, MINIMUM_EMBEDDED_PREVIEW_SIZE).transpose()? {
            Some(image) => image,
            None => decode_full_image(mapped_bytes)?,
        }
    };

    Ok(image)
}

fn try_large_embedded_preview(
    mapped_bytes: &[u8],
    minimum_size: u32,
) -> Option<Result<RgbaImage, anyhow::Error>> {
    let mut cursor = Cursor::new(mapped_bytes);

    let preview_bytes = match Reader::new().read_from_container(&mut cursor) {
        Ok(exif) => extract_jpeg_preview(&exif),
        Err(_) => None,
    }?;

    let embedded_image = match image::load_from_memory(&preview_bytes) {
        Ok(embedded_image) => embedded_image,
        Err(_) => return None,
    };

    if embedded_image.width() >= minimum_size || embedded_image.height() >= minimum_size {
        Some(Ok(embedded_image.to_rgba8()))
    } else {
        None
    }
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
    for image_file_directory in [In::PRIMARY, In::THUMBNAIL] {
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

// Currently this decode_full_image method handles decoding a range of files at a reasonable speed
// I want to improve tho, in speed and in codecs supported.
// Leter, I want to create a decode crate that will interface with different packages
// This will allow to pick and choose the dependecies to enhance image decoding
// And will also provide a simple anc common sense interface, so we can swap decoding engines
fn decode_full_image(data: &[u8]) -> Result<RgbaImage, anyhow::Error> {
    let cursor = Cursor::new(data);

    let reader = ImageReader::new(cursor).with_guessed_format()?;

    let image = reader.decode()?.to_rgba8();

    Ok(image)
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
            fast_image_resize::FilterType::Bilinear,
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
        rgb.put_pixel(x, y, image::Rgb([pixel[0], pixel[1], pixel[2]]));
    }

    rgb
}
