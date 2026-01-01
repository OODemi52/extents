use std::path::Path;

use anyhow::{anyhow, Context, Result};
use rawler::imgop::develop::RawDevelop;

pub fn decode_image(path: &str) -> Result<(Vec<u8>, u32, u32)> {
    if is_supported_raw_extension(path) {
        return decode_raw(path);
    }

    decode_raster(path)
}

fn decode_raster(path: &str) -> Result<(Vec<u8>, u32, u32)> {
    let image = image::open(path).with_context(|| format!("Failed to decode image: {}", path))?;

    let rgba = image.into_rgba8();

    let (width, height) = rgba.dimensions();

    Ok((rgba.into_raw(), width, height))
}

fn decode_raw(path: &str) -> Result<(Vec<u8>, u32, u32)> {
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

    let rgba = dynamic_image.into_rgba8();

    let (width, height) = rgba.dimensions();

    Ok((rgba.into_raw(), width, height))
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
