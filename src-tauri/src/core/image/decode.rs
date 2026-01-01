use std::fs::File;
use std::io::Cursor;
use std::path::Path;

use anyhow::{anyhow, Context, Result};
use exif::{In, Reader, Tag};
use image::{self, ImageReader, RgbaImage};
use memmap2::MmapOptions;
use rawler::imgop::develop::RawDevelop;

#[derive(Clone, Copy, Debug)]
pub enum EmbeddedPreviewPolicy {
    None,
    Any,
    MinSize(u32),
}

pub fn is_supported_raw_extension(path: &str) -> bool {
    let ext = Path::new(path).extension().and_then(|value| value.to_str());

    let Some(ext) = ext else {
        return false;
    };

    rawler::decoders::supported_extensions()
        .iter()
        .any(|supported| supported.eq_ignore_ascii_case(ext))
}

pub fn decode_full_image(path: &str) -> Result<(Vec<u8>, u32, u32)> {
    let image = if is_supported_raw_extension(path) {
        decode_raw_file(path)?
    } else {
        decode_raster_file(path)?
    };

    let (width, height) = image.dimensions();

    Ok((image.into_raw(), width, height))
}

pub fn decode_derived_image(
    path: &str,
    embedded_preview: EmbeddedPreviewPolicy,
) -> Result<RgbaImage> {
    if matches!(embedded_preview, EmbeddedPreviewPolicy::None) {
        return if is_supported_raw_extension(path) {
            decode_raw_file(path)
        } else {
            decode_raster_file(path)
        };
    }

    let file = File::open(path)?;
    let mmap = unsafe { MmapOptions::new().map(&file)? };

    decode_derived_image_buffer(path, &mmap, embedded_preview)
}

pub fn decode_derived_image_buffer(
    path: &str,
    bytes: &[u8],
    embedded_preview: EmbeddedPreviewPolicy,
) -> Result<RgbaImage> {
    match embedded_preview {
        EmbeddedPreviewPolicy::Any => {
            if let Some(image) = decode_embedded_preview(bytes, None).transpose()? {
                return Ok(image);
            }
        }
        EmbeddedPreviewPolicy::MinSize(min_size) => {
            if let Some(image) = decode_embedded_preview(bytes, Some(min_size)).transpose()? {
                return Ok(image);
            }
        }
        EmbeddedPreviewPolicy::None => {}
    }

    if is_supported_raw_extension(path) {
        decode_raw_file(path)
    } else {
        decode_raster_buffer(bytes)
    }
}

fn decode_raster_file(path: &str) -> Result<RgbaImage> {
    let image = image::open(path).with_context(|| format!("Failed to decode image: {}", path))?;

    Ok(image.into_rgba8())
}

fn decode_raster_buffer(bytes: &[u8]) -> Result<RgbaImage> {
    let cursor = Cursor::new(bytes);
    let reader = ImageReader::new(cursor).with_guessed_format()?;

    Ok(reader.decode()?.to_rgba8())
}

fn decode_raw_file(path: &str) -> Result<RgbaImage> {
    let raw_image_data = rawler::decode_file(path)
        .with_context(|| format!("Failed to decode raw image: {}", path))?;

    // Note for later: developer does a lot under the hood (e.g. demosaic, wb, cm, crop, and srgb gamma)
    // It does not apply a tone curve or perform any recovery
    let developer = RawDevelop::default();

    let intermediate_image_buffer = developer
        .develop_intermediate(&raw_image_data)
        .map_err(|err| anyhow!("Raw develop failed: {err}"))?;

    let dynamic_image = intermediate_image_buffer
        .to_dynamic_image()
        .ok_or_else(|| anyhow!("Raw develop produced no image for {}", path))?;

    Ok(dynamic_image.into_rgba8())
}

fn decode_embedded_preview(bytes: &[u8], minimum_size: Option<u32>) -> Option<Result<RgbaImage>> {
    let mut cursor = Cursor::new(bytes);

    let preview_bytes = match Reader::new().read_from_container(&mut cursor) {
        Ok(exif) => extract_jpeg_preview(&exif),
        Err(_) => None,
    }?;

    let embedded_image = match image::load_from_memory(&preview_bytes) {
        Ok(embedded_image) => embedded_image,
        Err(_) => return None,
    };

    let minimum_size = minimum_size.unwrap_or(0);

    if embedded_image.width() >= minimum_size || embedded_image.height() >= minimum_size {
        Some(Ok(embedded_image.to_rgba8()))
    } else {
        None
    }
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
